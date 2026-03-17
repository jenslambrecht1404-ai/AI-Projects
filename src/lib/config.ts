// ============================================================
// Corporate Design Configuration
// Replace placeholder values with your actual brand assets
// ============================================================

export const CORPORATE_CONFIG = {
  // Brand Colors (replace with your actual hex codes)
  colors: {
    primary: "#1A3C5E",        // Navy Blue
    secondary: "#D4AF37",      // Gold
    accent: "#2E7DB6",         // Light Blue
    background: "#F8F9FA",     // Off-white
    text: "#1A1A2E",           // Near-black
    textLight: "#6C757D",      // Muted text
    white: "#FFFFFF",
    border: "#DEE2E6",
  },

  // Typography (place .ttf / .otf files in /public/fonts/ and update paths)
  fonts: {
    heading: "Calibri",        // Replace with your corporate font name
    body: "Calibri",
    mono: "Courier New",
    // headingFontPath: "/fonts/YourHeadingFont-Bold.ttf",
    // bodyFontPath: "/fonts/YourBodyFont-Regular.ttf",
  },

  // Company Info
  company: {
    name: "Ihr Unternehmen GmbH",
    website: "www.ihr-unternehmen.de",
    copyrightHolder: "Ihr Unternehmen GmbH",
  },

  // DOCX Page Layout
  docx: {
    pageMargins: {
      top: 1440,    // twips (1440 = 1 inch)
      right: 1080,
      bottom: 1440,
      left: 1080,
    },
    headerLogoPath: null as string | null, // e.g. "/public/logo.png"
  },

  // Generation Defaults
  generation: {
    defaultModel: "claude-sonnet-4-6" as "claude-opus-4-6" | "claude-sonnet-4-6",
    defaultAudience: "Gemischt" as AudienceLevel,
    chapterCount: 7,
    wordsPerChapter: 600,
  },
} as const;

export type AudienceLevel = "Einsteiger" | "Fortgeschrittene" | "Gemischt";

export type AIModel = "claude-opus-4-6" | "claude-sonnet-4-6";

export const MODEL_LABELS: Record<AIModel, string> = {
  "claude-opus-4-6": "Opus 4 — Höchste Qualität",
  "claude-sonnet-4-6": "Sonnet 4 — Schnell & Effizient",
};

export const AUDIENCE_LABELS: Record<AudienceLevel, string> = {
  Einsteiger: "Einsteiger (einfache Sprache, viele Erklärungen)",
  Fortgeschrittene: "Fortgeschrittene (Fachsprache, kompakt)",
  Gemischt: "Gemischt (ausgewogen für alle Levels)",
};

export const AUDIENCE_TONE_PROMPTS: Record<AudienceLevel, string> = {
  Einsteiger:
    "Verwende einfache, verständliche Sprache ohne Fachjargon. Erkläre Konzepte schrittweise und nutze viele Analogien und Beispiele aus dem Alltag.",
  Fortgeschrittene:
    "Verwende präzise Fachsprache. Setze Grundlagenwissen voraus und fokussiere dich auf fortgeschrittene Konzepte, Nuancen und praktische Tiefe.",
  Gemischt:
    "Schreibe für ein gemischtes Publikum. Führe Fachbegriffe ein und erkläre sie kurz. Balanciere zwischen Zugänglichkeit und inhaltlicher Tiefe.",
};
