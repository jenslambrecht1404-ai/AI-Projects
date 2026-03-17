/**
 * Google Nano Banana 2 Adapter — Infographic Generator
 *
 * Currently backed by Chart.js + node-canvas for server-side rendering.
 * When Nano Banana 2 releases a public API, replace the `generateInfographic`
 * implementation with an HTTP call — the rest of the app stays untouched.
 *
 * CORPORATE COLOR COMPLIANCE: All charts are rendered in the defined corporate
 * palette from config.ts, regardless of the backend used.
 */

import { CORPORATE_CONFIG } from "@/lib/config";

export interface InfographicRequest {
  title: string;
  keyPoints: string[];          // bullet points extracted from the chapter
  type: "stats" | "comparison" | "timeline" | "highlights";
  chapterNumber: number;
}

export interface InfographicResult {
  imageBuffer: Buffer;
  mimeType: "image/png";
  altText: string;
}

const CORP = CORPORATE_CONFIG.colors;

export async function generateInfographic(req: InfographicRequest): Promise<InfographicResult> {
  // TODO: Replace with Nano Banana 2 API call when available:
  // const response = await fetch("https://api.nano-banana.google.com/v2/infographic", {
  //   method: "POST",
  //   headers: { Authorization: `Bearer ${process.env.NANO_BANANA_API_KEY}` },
  //   body: JSON.stringify({
  //     title: req.title,
  //     data: req.keyPoints,
  //     theme: {
  //       primaryColor: CORP.primary,
  //       secondaryColor: CORP.secondary,
  //       accentColor: CORP.accent,
  //     },
  //   }),
  // });

  try {
    const imageBuffer = await renderInfographic(req);
    return {
      imageBuffer,
      mimeType: "image/png",
      altText: `Infografik: ${req.title}`,
    };
  } catch (error) {
    console.error("[NanoBananaAdapter] Chart render failed:", error);
    const fallback = await renderFallbackInfographic(req);
    return {
      imageBuffer: fallback,
      mimeType: "image/png",
      altText: `Infografik: ${req.title}`,
    };
  }
}

async function renderInfographic(req: InfographicRequest): Promise<Buffer> {
  const { createCanvas } = await import("canvas");
  const width = 800;
  const height = 450;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  // Background
  ctx.fillStyle = CORP.background;
  ctx.fillRect(0, 0, width, height);

  // Header
  ctx.fillStyle = CORP.primary;
  ctx.fillRect(0, 0, width, 60);

  // Chapter badge
  ctx.fillStyle = CORP.secondary;
  ctx.beginPath();
  ctx.arc(40, 30, 22, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = CORP.text;
  ctx.font = "bold 14px Arial";
  ctx.textAlign = "center";
  ctx.fillText(`Kap ${req.chapterNumber}`, 40, 35);

  // Title
  ctx.fillStyle = CORP.white;
  ctx.font = "bold 22px Arial";
  ctx.textAlign = "left";
  const truncTitle = req.title.length > 55 ? req.title.substring(0, 53) + "…" : req.title;
  ctx.fillText(truncTitle, 80, 38);

  // Key Points as cards
  const points = req.keyPoints.slice(0, 5);
  const cardWidth = 220;
  const cardHeight = 100;
  const cols = 3;
  const paddingX = 30;
  const paddingY = 80;
  const gapX = 18;
  const gapY = 14;

  const accentColors = [CORP.primary, CORP.secondary, CORP.accent, CORP.primary, CORP.secondary];

  points.forEach((point, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = paddingX + col * (cardWidth + gapX);
    const y = paddingY + row * (cardHeight + gapY);

    // Card shadow
    ctx.fillStyle = "rgba(0,0,0,0.06)";
    ctx.fillRect(x + 3, y + 3, cardWidth, cardHeight);

    // Card background
    ctx.fillStyle = CORP.white;
    drawRoundedRect(ctx, x, y, cardWidth, cardHeight, 10);

    // Left accent bar
    ctx.fillStyle = accentColors[i];
    drawRoundedRect(ctx, x, y, 6, cardHeight, 6);

    // Number badge
    ctx.fillStyle = accentColors[i];
    ctx.font = "bold 24px Arial";
    ctx.textAlign = "left";
    ctx.fillText(`0${i + 1}`, x + 18, y + 40);

    // Point text
    ctx.fillStyle = CORP.text;
    ctx.font = "13px Arial";
    const words = point.split(" ");
    let line = "";
    let lineY = y + 58;
    for (const word of words) {
      const testLine = line + (line ? " " : "") + word;
      const metrics = ctx.measureText(testLine);
      if (metrics.width > cardWidth - 24 && line) {
        ctx.fillText(line, x + 18, lineY);
        line = word;
        lineY += 17;
        if (lineY > y + cardHeight - 8) break;
      } else {
        line = testLine;
      }
    }
    if (lineY <= y + cardHeight - 8) ctx.fillText(line, x + 18, lineY);
  });

  // Footer
  ctx.fillStyle = CORP.primary;
  ctx.fillRect(0, height - 30, width, 30);
  ctx.fillStyle = CORP.secondary;
  ctx.font = "12px Arial";
  ctx.textAlign = "center";
  ctx.fillText(`© ${CORPORATE_CONFIG.company.copyrightHolder}  •  ${req.title}`, width / 2, height - 10);

  // Bottom accent line
  ctx.fillStyle = CORP.secondary;
  ctx.fillRect(0, height - 4, width, 4);

  return canvas.toBuffer("image/png");
}

function drawRoundedRect(
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

async function renderFallbackInfographic(req: InfographicRequest): Promise<Buffer> {
  const { createCanvas } = await import("canvas");
  const canvas = createCanvas(800, 300);
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = CORP.white;
  ctx.fillRect(0, 0, 800, 300);
  ctx.fillStyle = CORP.primary;
  ctx.fillRect(0, 0, 800, 50);
  ctx.fillStyle = CORP.white;
  ctx.font = "bold 20px Arial";
  ctx.textAlign = "center";
  ctx.fillText(req.title, 400, 33);
  ctx.fillStyle = CORP.text;
  ctx.font = "14px Arial";
  ctx.fillText("Infografik wird generiert…", 400, 175);
  return canvas.toBuffer("image/png");
}
