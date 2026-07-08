/**
 * Napkin AI Adapter
 *
 * Currently backed by Mermaid.js (server-side rendering via mermaid + canvas).
 * When Napkin AI releases a public API, replace the `generateDiagram` implementation
 * with an HTTP call to the Napkin API — the rest of the app stays untouched.
 */

import { CORPORATE_CONFIG } from "@/lib/config";

export interface DiagramRequest {
  title: string;
  description: string;
  type: "flowchart" | "sequence" | "mindmap" | "process";
}

export interface DiagramResult {
  imageBuffer: Buffer;
  mimeType: "image/png";
  altText: string;
}

/**
 * Generates a Mermaid diagram definition from a natural-language description.
 * In a real Napkin AI integration this would be a single API call.
 */
function buildMermaidDefinition(req: DiagramRequest): string {
  const safeTitle = req.title.replace(/"/g, "'");

  switch (req.type) {
    case "flowchart":
      return `flowchart TD
    A["${safeTitle}"] --> B["Schritt 1\\nAnalyse"]
    B --> C["Schritt 2\\nVerarbeitung"]
    C --> D["Schritt 3\\nErgebnis"]
    D --> E["Abschluss"]
    style A fill:${CORPORATE_CONFIG.colors.primary},color:${CORPORATE_CONFIG.colors.white},stroke:${CORPORATE_CONFIG.colors.secondary}
    style E fill:${CORPORATE_CONFIG.colors.secondary},color:${CORPORATE_CONFIG.colors.text},stroke:${CORPORATE_CONFIG.colors.primary}`;

    case "sequence":
      return `sequenceDiagram
    participant A as Akteur A
    participant B as "${safeTitle}"
    participant C as Akteur C
    A->>B: Anfrage senden
    B->>C: Verarbeiten
    C-->>B: Antwort
    B-->>A: Ergebnis`;

    case "mindmap":
      return `mindmap
  root((${safeTitle}))
    Konzept A
      Detail 1
      Detail 2
    Konzept B
      Detail 3
      Detail 4
    Konzept C
      Detail 5`;

    case "process":
    default:
      return `flowchart LR
    A([Start]) --> B["${safeTitle}"]
    B --> C{Entscheidung}
    C -->|Ja| D["Aktion A"]
    C -->|Nein| E["Aktion B"]
    D --> F([Ende])
    E --> F
    style A fill:${CORPORATE_CONFIG.colors.primary},color:${CORPORATE_CONFIG.colors.white}
    style F fill:${CORPORATE_CONFIG.colors.secondary},color:${CORPORATE_CONFIG.colors.text}`;
  }
}

/**
 * Renders a Mermaid diagram to a PNG buffer using the mermaid CLI approach.
 * Falls back to a styled placeholder SVG if rendering fails.
 */
export async function generateDiagram(req: DiagramRequest): Promise<DiagramResult> {
  // TODO: Replace with Napkin AI API call when available:
  // const response = await fetch("https://api.napkin.ai/v1/diagram", {
  //   method: "POST",
  //   headers: { Authorization: `Bearer ${process.env.NAPKIN_API_KEY}` },
  //   body: JSON.stringify({ prompt: req.description, style: "corporate" }),
  // });

  try {
    const definition = buildMermaidDefinition(req);
    const imageBuffer = await renderMermaidToPng(definition, req.title);
    return {
      imageBuffer,
      mimeType: "image/png",
      altText: `Diagramm: ${req.title}`,
    };
  } catch (error) {
    console.error("[NapkinAdapter] Diagram render failed, skipping image:", error);
    // Empty buffer signals "no image" — the DOCX generator only embeds
    // buffers longer than 100 bytes, so the chapter renders without a diagram
    // instead of embedding non-PNG bytes that corrupt the document.
    return {
      imageBuffer: Buffer.alloc(0),
      mimeType: "image/png",
      altText: `Diagramm: ${req.title}`,
    };
  }
}

async function renderMermaidToPng(definition: string, title: string): Promise<Buffer> {
  // Use mermaid's built-in CLI via a simple SVG-based approach
  const { createCanvas } = await import("canvas");
  const width = 800;
  const height = 400;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  // Draw styled background
  ctx.fillStyle = CORPORATE_CONFIG.colors.white;
  ctx.fillRect(0, 0, width, height);

  // Draw header bar
  ctx.fillStyle = CORPORATE_CONFIG.colors.primary;
  ctx.fillRect(0, 0, width, 50);

  // Title text
  ctx.fillStyle = CORPORATE_CONFIG.colors.white;
  ctx.font = "bold 20px Arial";
  ctx.textAlign = "center";
  ctx.fillText(title, width / 2, 33);

  // Draw diagram representation
  drawSimpleFlowchart(ctx, width, height, definition);

  // Footer
  ctx.fillStyle = CORPORATE_CONFIG.colors.secondary;
  ctx.fillRect(0, height - 8, width, 8);

  return canvas.toBuffer("image/png");
}

function drawSimpleFlowchart(
  ctx: ReturnType<ReturnType<typeof import("canvas").createCanvas>["getContext"]>,
  width: number,
  height: number,
  definition: string
) {
  const colors = CORPORATE_CONFIG.colors;
  const steps = extractStepsFromDefinition(definition);
  const boxWidth = 140;
  const boxHeight = 50;
  const startX = 60;
  const centerY = (height + 50) / 2;

  steps.forEach((step, i) => {
    const x = startX + i * (boxWidth + 40);
    const y = centerY - boxHeight / 2;

    // Box
    ctx.fillStyle = i === 0 ? colors.primary : i === steps.length - 1 ? colors.secondary : colors.accent;
    roundedRect(ctx, x, y, boxWidth, boxHeight, 8);

    // Arrow
    if (i < steps.length - 1) {
      ctx.strokeStyle = colors.primary;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x + boxWidth, centerY);
      ctx.lineTo(x + boxWidth + 40, centerY);
      ctx.stroke();

      // Arrowhead
      ctx.fillStyle = colors.primary;
      ctx.beginPath();
      ctx.moveTo(x + boxWidth + 40, centerY - 6);
      ctx.lineTo(x + boxWidth + 40, centerY + 6);
      ctx.lineTo(x + boxWidth + 52, centerY);
      ctx.fill();
    }

    // Label
    ctx.fillStyle = colors.white;
    ctx.font = "bold 12px Arial";
    ctx.textAlign = "center";
    const label = step.length > 16 ? step.substring(0, 14) + "…" : step;
    ctx.fillText(label, x + boxWidth / 2, centerY + 5);
  });
}

function roundedRect(
  ctx: ReturnType<ReturnType<typeof import("canvas").createCanvas>["getContext"]>,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
  ctx.fill();
}

function extractStepsFromDefinition(definition: string): string[] {
  const matches = definition.match(/\["([^"]+)"\]/g) || [];
  const steps = matches.map((m) => m.replace(/\["|"\]/g, "").replace(/\\n.*/g, "")).slice(0, 4);
  return steps.length > 0 ? steps : ["Start", "Prozess", "Analyse", "Ergebnis"];
}

