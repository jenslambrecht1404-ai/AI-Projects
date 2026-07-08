/**
 * Claude AI Integration
 * Handles transcript analysis, chapter generation, and streaming.
 */

import Anthropic from "@anthropic-ai/sdk";
import { AIModel, AudienceLevel, AUDIENCE_TONE_PROMPTS, CORPORATE_CONFIG } from "@/lib/config";

let anthropicClient: Anthropic | null = null;

function getClient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      "ANTHROPIC_API_KEY fehlt. Bitte in der Datei .env.local eintragen und den Server neu starten (npm run dev)."
    );
  }
  if (!anthropicClient) {
    anthropicClient = new Anthropic({ apiKey });
  }
  return anthropicClient;
}

/**
 * Extracts the first JSON object from a model response, tolerating
 * markdown fences and surrounding prose.
 */
function extractJson(text: string): string {
  const cleaned = text.replace(/```json\n?|\n?```/g, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) {
    throw new Error("Die KI-Antwort enthielt kein gültiges JSON.");
  }
  return cleaned.slice(start, end + 1);
}

export interface BookOutline {
  bookTitle: string;
  subtitle: string;
  introduction: string;
  chapters: ChapterOutline[];
  conclusion: string;
}

export interface ChapterOutline {
  number: number;
  title: string;
  summary: string;
  keyPoints: string[];
  diagramType: "flowchart" | "sequence" | "mindmap" | "process";
  needsInfographic: boolean;
}

export interface GeneratedChapter {
  outline: ChapterOutline;
  content: string;
  diagramPrompt: string;
  infographicKeyPoints: string[];
}

/**
 * Step 1: Analyze the transcript and generate a structured book outline.
 */
export async function generateBookOutline(params: {
  transcript: string;
  bookTitle: string;
  subtitle: string;
  audience: AudienceLevel;
  model: AIModel;
}): Promise<BookOutline> {
  const { transcript, bookTitle, subtitle, audience, model } = params;
  const tonePrompt = AUDIENCE_TONE_PROMPTS[audience];
  const chapterCount = CORPORATE_CONFIG.generation.chapterCount;

  const systemPrompt = `Du bist ein professioneller Buchautor und Inhaltsstrategist.
Deine Aufgabe ist es, aus einem unstrukturierten Transkript ein professionelles Buch-Inhaltsverzeichnis zu erstellen.
Antworte ausschließlich mit validem JSON. Kein Markdown, keine Erklärungen.`;

  const userPrompt = `Analysiere das folgende Transkript und erstelle ein strukturiertes Buch-Outline.

Buchtitel: "${bookTitle}"
Untertitel: "${subtitle}"
Zielgruppe & Ton: ${tonePrompt}

TRANSKRIPT:
---
${transcript.substring(0, 12000)}
---

Erstelle ein JSON-Objekt mit dieser exakten Struktur:
{
  "bookTitle": "${bookTitle}",
  "subtitle": "${subtitle}",
  "introduction": "2-3 Sätze Einleitungstext",
  "chapters": [
    {
      "number": 1,
      "title": "Kapiteltitel",
      "summary": "2-3 Sätze Zusammenfassung",
      "keyPoints": ["Kernpunkt 1", "Kernpunkt 2", "Kernpunkt 3", "Kernpunkt 4"],
      "diagramType": "flowchart",
      "needsInfographic": true
    }
  ],
  "conclusion": "2-3 Sätze Fazit-Text"
}

Erstelle genau ${chapterCount} Kapitel. diagramType muss eines von: flowchart, sequence, mindmap, process sein.`;

  const message = await getClient().messages.create({
    model,
    max_tokens: 4000,
    system: systemPrompt,
    messages: [{ role: "user", content: userPrompt }],
  });

  const rawContent = message.content[0];
  if (!rawContent || rawContent.type !== "text") {
    throw new Error("Unerwartete Antwort von Claude beim Erstellen der Buchstruktur.");
  }

  return JSON.parse(extractJson(rawContent.text)) as BookOutline;
}

/**
 * Step 2: Generate full chapter content with streaming support.
 * Returns an AsyncIterable of text chunks.
 */
export async function* streamChapterContent(params: {
  outline: ChapterOutline;
  bookTitle: string;
  transcript: string;
  audience: AudienceLevel;
  model: AIModel;
  chapterIndex: number;
  totalChapters: number;
}): AsyncGenerator<string> {
  const { outline, bookTitle, transcript, audience, model } = params;
  const tonePrompt = AUDIENCE_TONE_PROMPTS[audience];
  const targetWords = CORPORATE_CONFIG.generation.wordsPerChapter;

  const systemPrompt = `Du bist ein professioneller Buchautor.
Schreibe präzise, ansprechende Kapitelinhalte auf Basis von Transkripten.
${tonePrompt}
Schreibe fließenden, gut strukturierten Prosa-Text. Keine Markdown-Formatierung außer **fett** für Schlüsselbegriffe.`;

  const userPrompt = `Schreibe das vollständige Kapitel für das Buch "${bookTitle}".

Kapitel ${outline.number}: "${outline.title}"
Zusammenfassung: ${outline.summary}
Kernpunkte die behandelt werden müssen: ${outline.keyPoints.join(", ")}

Kontext aus dem Transkript:
---
${extractRelevantContext(transcript, outline.summary, 3000)}
---

Anforderungen:
- Genau ca. ${targetWords} Wörter
- Beginne direkt mit dem Kapitelinhalt (kein "Kapitel X:" als Überschrift)
- Strukturiere mit 3-4 Unterabschnitten (verwende ### für Unterüberschriften)
- Füge am Ende einen "Kernaussagen"-Block mit 3 prägnanten Bullet-Points ein (formatiert als • Punkt)
- Schreibe flüssig und professionell`;

  const stream = getClient().messages.stream({
    model,
    max_tokens: 2000,
    system: systemPrompt,
    messages: [{ role: "user", content: userPrompt }],
  });

  for await (const event of stream) {
    if (
      event.type === "content_block_delta" &&
      event.delta.type === "text_delta"
    ) {
      yield event.delta.text;
    }
  }
}

/**
 * Extracts a relevant context window from the transcript for a given chapter.
 */
function extractRelevantContext(transcript: string, summary: string, maxChars: number): string {
  if (transcript.length <= maxChars) return transcript;

  // Simple keyword-based extraction: find the most relevant section
  const keywords = summary.split(/\s+/).filter((w) => w.length > 4);
  const paragraphs = transcript.split(/\n{2,}/);

  const scored = paragraphs.map((p) => ({
    text: p,
    score: keywords.filter((kw) => p.toLowerCase().includes(kw.toLowerCase())).length,
  }));

  scored.sort((a, b) => b.score - a.score);

  let result = "";
  for (const { text } of scored) {
    if (result.length + text.length > maxChars) break;
    result += text + "\n\n";
  }

  return result || transcript.substring(0, maxChars);
}

/**
 * Generates diagram prompt and infographic key points for a chapter.
 */
export async function generateChapterVisualMetadata(params: {
  chapterContent: string;
  outline: ChapterOutline;
  model: AIModel;
}): Promise<{ diagramPrompt: string; infographicKeyPoints: string[] }> {
  const { chapterContent, outline, model } = params;

  // Fallback values from the outline — used whenever the AI response is unusable,
  // so a bad metadata response never aborts the whole generation run.
  const fallback = {
    diagramPrompt: outline.summary,
    infographicKeyPoints: outline.keyPoints,
  };

  try {
    const message = await getClient().messages.create({
      model,
      max_tokens: 500,
      messages: [
        {
          role: "user",
          content: `Aus dem folgenden Kapitelinhalt, extrahiere:
1. Eine kurze Beschreibung für ein "${outline.diagramType}"-Diagramm (max. 1 Satz)
2. Genau 4-5 prägnante Kernaussagen für eine Infografik (jeweils max. 8 Wörter)

Antworte NUR als JSON: {"diagramPrompt": "...", "infographicKeyPoints": ["...", "...", "...", "..."]}

Kapitelinhalt:
${chapterContent.substring(0, 1500)}`,
        },
      ],
    });

    const first = message.content[0];
    if (!first || first.type !== "text") return fallback;

    const parsed = JSON.parse(extractJson(first.text));
    return {
      diagramPrompt: parsed.diagramPrompt || fallback.diagramPrompt,
      infographicKeyPoints: Array.isArray(parsed.infographicKeyPoints) && parsed.infographicKeyPoints.length > 0
        ? parsed.infographicKeyPoints
        : fallback.infographicKeyPoints,
    };
  } catch (error) {
    console.error("[Claude] Visual metadata generation failed, using outline fallback:", error);
    return fallback;
  }
}
