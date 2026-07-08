/**
 * /api/generate  — Main Generation Endpoint (Server-Sent Events)
 *
 * Flow:
 * 1. Receive transcript + metadata
 * 2. Generate book outline (Claude)
 * 3. Stream each chapter (Claude streaming)
 * 4. Generate diagrams (Napkin adapter → Mermaid.js)
 * 5. Generate infographics (Nano Banana adapter → Chart.js)
 * 6. Generate audio (ElevenLabs) — parallel to text generation
 * 7. Build & save .docx
 * 8. Save audio files
 * 9. Return download URLs via SSE event
 */

import { NextRequest } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { v4 as uuidv4 } from "uuid";
import {
  generateBookOutline,
  streamChapterContent,
  generateChapterVisualMetadata,
  type BookOutline,
  type GeneratedChapter,
} from "@/lib/claude";
import { generateDiagram } from "@/lib/adapters/napkin-adapter";
import { generateInfographic } from "@/lib/adapters/nano-banana-adapter";
import { generateChapterAudio } from "@/lib/tts/elevenlabs";
import { generateDocx } from "@/lib/docx/generator";
import type { AIModel, AudienceLevel } from "@/lib/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 min max for Railway

// Helper: send an SSE event. Swallows enqueue errors so a client that
// disconnected mid-generation doesn't crash the server-side run.
function sseEvent(
  controller: ReadableStreamDefaultController,
  event: string,
  data: unknown
) {
  try {
    const encoder = new TextEncoder();
    const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    controller.enqueue(encoder.encode(payload));
  } catch {
    // stream already closed (client disconnected) — nothing to send to
  }
}

export async function POST(req: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return new Response(
      JSON.stringify({
        error:
          "ANTHROPIC_API_KEY fehlt. Bitte in .env.local eintragen und den Server neu starten. Status prüfen unter /api/health",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  const formData = await req.formData();

  const transcriptFile = formData.get("transcript") as File | null;
  const bookTitle = (formData.get("bookTitle") as string) || "Mein Buch";
  const subtitle = (formData.get("subtitle") as string) || "";
  const audience = (formData.get("audience") as AudienceLevel) || "Gemischt";
  const model = (formData.get("model") as AIModel) || "claude-sonnet-4-6";

  if (!transcriptFile) {
    return new Response(JSON.stringify({ error: "Kein Transkript hochgeladen" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const transcript = await transcriptFile.text();

  const stream = new ReadableStream({
    async start(controller) {
      const jobId = uuidv4();
      const outputDir = join(process.cwd(), "output", jobId);
      await mkdir(outputDir, { recursive: true });

      try {
        // ── Step 1: Generate outline ──────────────────────────────────────
        sseEvent(controller, "status", {
          step: "outline",
          message: "Analysiere Transkript und erstelle Buchstruktur…",
          progress: 5,
        });

        const outline: BookOutline = await generateBookOutline({
          transcript,
          bookTitle,
          subtitle,
          audience,
          model,
        });

        sseEvent(controller, "outline", {
          outline,
          message: `Buchstruktur erstellt: ${outline.chapters.length} Kapitel`,
          progress: 15,
        });

        // ── Step 2: Generate chapters (streaming) ─────────────────────────
        const generatedChapters: GeneratedChapter[] = [];
        const diagrams = new Map<number, Buffer>();
        const infographics = new Map<number, Buffer>();
        const audioFiles: Array<{ filename: string; path: string; duration: number }> = [];

        const totalChapters = outline.chapters.length;

        for (let i = 0; i < totalChapters; i++) {
          const chapterOutline = outline.chapters[i];
          const chapterProgress = 15 + Math.round(((i + 1) / totalChapters) * 55);

          sseEvent(controller, "status", {
            step: "chapter",
            chapterNumber: chapterOutline.number,
            message: `Schreibe Kapitel ${chapterOutline.number}: "${chapterOutline.title}"…`,
            progress: chapterProgress,
          });

          // Stream chapter content
          let fullContent = "";
          const chapterStream = streamChapterContent({
            outline: chapterOutline,
            bookTitle,
            transcript,
            audience,
            model,
            chapterIndex: i,
            totalChapters,
          });

          for await (const chunk of chapterStream) {
            fullContent += chunk;
            sseEvent(controller, "chapterChunk", {
              chapterNumber: chapterOutline.number,
              chapterTitle: chapterOutline.title,
              chunk,
            });
          }

          sseEvent(controller, "chapterComplete", {
            chapterNumber: chapterOutline.number,
            chapterTitle: chapterOutline.title,
            wordCount: fullContent.split(/\s+/).length,
          });

          // Generate visual metadata
          const visualMeta = await generateChapterVisualMetadata({
            chapterContent: fullContent,
            outline: chapterOutline,
            model,
          });

          // ── Diagram generation ─────────────────────────────────────────
          sseEvent(controller, "status", {
            step: "diagram",
            chapterNumber: chapterOutline.number,
            message: `Generiere Diagramm für Kapitel ${chapterOutline.number}…`,
            progress: chapterProgress,
          });

          try {
            const diagramResult = await generateDiagram({
              title: chapterOutline.title,
              description: visualMeta.diagramPrompt,
              type: chapterOutline.diagramType,
            });
            diagrams.set(chapterOutline.number, diagramResult.imageBuffer);
          } catch (err) {
            console.error(`Diagram generation failed for chapter ${chapterOutline.number}:`, err);
          }

          // ── Infographic generation ─────────────────────────────────────
          if (chapterOutline.needsInfographic) {
            try {
              const infographicResult = await generateInfographic({
                title: chapterOutline.title,
                keyPoints: visualMeta.infographicKeyPoints,
                type: "highlights",
                chapterNumber: chapterOutline.number,
              });
              infographics.set(chapterOutline.number, infographicResult.imageBuffer);
            } catch (err) {
              console.error(`Infographic generation failed for chapter ${chapterOutline.number}:`, err);
            }
          }

          // ── Audio generation ──────────────────────────────────────────
          sseEvent(controller, "status", {
            step: "audio",
            chapterNumber: chapterOutline.number,
            message: `Generiere Hörbuch-Audio für Kapitel ${chapterOutline.number}…`,
            progress: chapterProgress,
          });

          try {
            const audioResult = await generateChapterAudio({
              text: fullContent,
              chapterTitle: chapterOutline.title,
              chapterNumber: chapterOutline.number,
            });
            const audioPath = join(outputDir, audioResult.filename);
            await writeFile(audioPath, audioResult.audioBuffer);
            audioFiles.push({
              filename: audioResult.filename,
              path: `/output/${jobId}/${audioResult.filename}`,
              duration: audioResult.durationEstimateSec,
            });
          } catch (err) {
            console.error(`Audio generation failed for chapter ${chapterOutline.number}:`, err);
          }

          generatedChapters.push({
            outline: chapterOutline,
            content: fullContent,
            diagramPrompt: visualMeta.diagramPrompt,
            infographicKeyPoints: visualMeta.infographicKeyPoints,
          });
        }

        // ── Step 3: Build DOCX ────────────────────────────────────────────
        sseEvent(controller, "status", {
          step: "docx",
          message: "Erstelle Word-Dokument mit Corporate Design…",
          progress: 80,
        });

        const docxBuffer = await generateDocx({
          outline,
          chapters: generatedChapters,
          diagrams,
          infographics,
        });

        const safeTitle =
          bookTitle.replace(/[^a-zA-Z0-9üöäßÜÖÄ\s-]/g, "").trim().replace(/\s+/g, "-") ||
          "Workbook";
        const docxFilename = `${safeTitle}.docx`;
        const docxPath = join(outputDir, docxFilename);
        await writeFile(docxPath, docxBuffer);

        // ── Step 4: Done ──────────────────────────────────────────────────
        sseEvent(controller, "status", {
          step: "done",
          message: "Fertig! Alle Dateien wurden erfolgreich generiert.",
          progress: 100,
        });

        sseEvent(controller, "complete", {
          jobId,
          docx: {
            filename: docxFilename,
            downloadUrl: `/api/download?jobId=${jobId}&file=${encodeURIComponent(docxFilename)}`,
          },
          audio: audioFiles.map((a) => ({
            ...a,
            downloadUrl: `/api/download?jobId=${jobId}&file=${encodeURIComponent(a.filename)}`,
          })),
          outline,
          totalChapters,
        });
      } catch (error) {
        console.error("[Generate] Fatal error:", error);
        sseEvent(controller, "error", {
          message: error instanceof Error ? error.message : "Unbekannter Fehler",
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
