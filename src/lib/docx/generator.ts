/**
 * DOCX Generator
 *
 * Builds the complete Word document with:
 * - Cover page with title & subtitle
 * - Clickable, internally linked Table of Contents
 * - Chapter content with inline diagrams and infographics
 * - Corporate fonts, colors, and styling throughout
 * - Fixed footer with copyright notice on every page
 */

import {
  AlignmentType,
  Bookmark,
  Document,
  Footer,
  HeadingLevel,
  ImageRun,
  InternalHyperlink,
  Packer,
  PageBreak,
  PageNumberElement,
  Paragraph,
  TextRun,
  UnderlineType,
  BorderStyle,
  NumberFormat,
} from "docx";
import { CORPORATE_CONFIG } from "@/lib/config";
import { DOCX_STYLES } from "./styles";
import type { BookOutline, GeneratedChapter } from "@/lib/claude";

const C = CORPORATE_CONFIG.colors;
const Corp = CORPORATE_CONFIG.company;

function hex(color: string): string {
  return color.replace("#", "");
}

export interface DocxGeneratorInput {
  outline: BookOutline;
  chapters: GeneratedChapter[];
  diagrams: Map<number, Buffer>; // chapterNumber → PNG buffer
  infographics: Map<number, Buffer>;
}

export async function generateDocx(input: DocxGeneratorInput): Promise<Buffer> {
  const { outline, chapters, diagrams, infographics } = input;

  // ─── Cover Page Section ──────────────────────────────────────────────────
  const coverSection = buildCoverSection(outline);

  // ─── TOC Section ─────────────────────────────────────────────────────────
  const tocSection = buildTocSection(outline);

  // ─── Chapter Sections ────────────────────────────────────────────────────
  const chapterChildren: Paragraph[] = [];

  for (const chapter of chapters) {
    const diagramBuffer = diagrams.get(chapter.outline.number);
    const infographicBuffer = infographics.get(chapter.outline.number);

    chapterChildren.push(...buildChapterContent(chapter, diagramBuffer, infographicBuffer));
  }

  // Conclusion
  chapterChildren.push(...buildConclusion(outline.conclusion));

  const doc = new Document({
    styles: DOCX_STYLES,
    numbering: {
      config: [
        {
          reference: "bullet-list",
          levels: [
            {
              level: 0,
              format: NumberFormat.BULLET,
              text: "•",
              alignment: AlignmentType.LEFT,
              style: {
                paragraph: {
                  indent: { left: 720, hanging: 360 },
                },
                run: {
                  font: "Symbol",
                },
              },
            },
          ],
        },
      ],
    },
    sections: [
      // Cover + TOC
      {
        properties: {
          page: {
            margin: {
              top: CORPORATE_CONFIG.docx.pageMargins.top,
              right: CORPORATE_CONFIG.docx.pageMargins.right,
              bottom: CORPORATE_CONFIG.docx.pageMargins.bottom,
              left: CORPORATE_CONFIG.docx.pageMargins.left,
            },
          },
        },
        footers: {
          default: buildFooter(outline.bookTitle),
        },
        children: [...coverSection, ...tocSection],
      },
      // Chapters
      {
        properties: {
          page: {
            margin: {
              top: CORPORATE_CONFIG.docx.pageMargins.top,
              right: CORPORATE_CONFIG.docx.pageMargins.right,
              bottom: CORPORATE_CONFIG.docx.pageMargins.bottom,
              left: CORPORATE_CONFIG.docx.pageMargins.left,
            },
          },
        },
        footers: {
          default: buildFooter(outline.bookTitle),
        },
        children: chapterChildren,
      },
    ],
  });

  return await Packer.toBuffer(doc);
}

// ─── Cover Page ─────────────────────────────────────────────────────────────

function buildCoverSection(outline: BookOutline): Paragraph[] {
  return [
    // Spacer
    new Paragraph({ text: "", spacing: { before: 720 } }),

    // Title
    new Paragraph({
      style: "BookTitle",
      children: [new TextRun({ text: outline.bookTitle })],
    }),

    // Divider line (via border)
    new Paragraph({
      text: "",
      border: {
        bottom: {
          color: hex(C.secondary),
          space: 1,
          style: BorderStyle.SINGLE,
          size: 12,
        },
      },
      spacing: { before: 0, after: 360 },
    }),

    // Subtitle
    new Paragraph({
      style: "BookSubtitle",
      children: [new TextRun({ text: outline.subtitle })],
    }),

    // Introduction text
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 480, after: 240 },
      children: [
        new TextRun({
          text: outline.introduction,
          font: CORPORATE_CONFIG.fonts.body,
          size: 24,
          color: hex(C.textLight),
          italics: true,
        }),
      ],
    }),

    // Company name
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 720, after: 120 },
      children: [
        new TextRun({
          text: Corp.name,
          font: CORPORATE_CONFIG.fonts.heading,
          size: 28,
          bold: true,
          color: hex(C.primary),
        }),
      ],
    }),

    // Website
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 0 },
      children: [
        new TextRun({
          text: Corp.website,
          font: CORPORATE_CONFIG.fonts.body,
          size: 22,
          color: hex(C.accent),
        }),
      ],
    }),

    // Page break before TOC
    new Paragraph({ children: [new PageBreak()] }),
  ];
}

// ─── Table of Contents ───────────────────────────────────────────────────────

function buildTocSection(outline: BookOutline): Paragraph[] {
  const items: Paragraph[] = [
    new Paragraph({
      style: "TOCHeading",
      children: [new TextRun({ text: "Inhaltsverzeichnis" })],
    }),
    new Paragraph({ text: "", spacing: { after: 240 } }),
  ];

  // Introduction entry
  items.push(
    buildTocEntry("Einleitung", "", 1)
  );

  // Chapter entries
  outline.chapters.forEach((ch) => {
    items.push(buildTocEntry(`Kapitel ${ch.number}: ${ch.title}`, `chapter-${ch.number}`, ch.number));
  });

  // Conclusion entry
  items.push(buildTocEntry("Schluss & Ausblick", "conclusion", outline.chapters.length + 1));

  // Page break after TOC
  items.push(new Paragraph({ children: [new PageBreak()] }));

  return items;
}

function buildTocEntry(title: string, anchor: string, level: number): Paragraph {
  const isSubItem = level > 1 && !title.startsWith("Kapitel");

  return new Paragraph({
    spacing: { after: 120 },
    indent: isSubItem ? { left: 360 } : undefined,
    children: [
      anchor
        ? new InternalHyperlink({
            anchor,
            children: [
              new TextRun({
                text: title,
                font: CORPORATE_CONFIG.fonts.body,
                size: isSubItem ? 20 : 22,
                bold: !isSubItem,
                color: hex(C.primary),
                underline: { type: UnderlineType.SINGLE, color: hex(C.secondary) },
              }),
            ],
          })
        : new TextRun({
            text: title,
            font: CORPORATE_CONFIG.fonts.body,
            size: 22,
            bold: true,
            color: hex(C.primary),
          }),
    ],
  });
}

// ─── Chapter Content ─────────────────────────────────────────────────────────

function buildChapterContent(
  chapter: GeneratedChapter,
  diagramBuffer?: Buffer,
  infographicBuffer?: Buffer
): Paragraph[] {
  const elements: Paragraph[] = [];
  const { outline, content, diagramPrompt } = chapter;

  // Chapter kicker with the bookmark the TOC hyperlink jumps to
  elements.push(
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      style: "ChapterTitle",
      children: [
        new Bookmark({
          id: `chapter-${outline.number}`,
          children: [
            new TextRun({
              text: `Kapitel ${outline.number}`,
              font: CORPORATE_CONFIG.fonts.heading,
              size: 32,
              bold: false,
              color: hex(C.secondary),
            }),
          ],
        }),
      ],
    })
  );

  // Chapter title
  elements.push(
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      children: [
        new TextRun({
          text: outline.title,
          font: CORPORATE_CONFIG.fonts.heading,
          size: 56,
          bold: true,
          color: hex(C.primary),
        }),
      ],
    })
  );

  // Chapter summary / subtitle
  elements.push(
    new Paragraph({
      style: "ChapterSubtitle",
      children: [new TextRun({ text: outline.summary })],
    })
  );

  // Diagram (if available)
  if (diagramBuffer && diagramBuffer.length > 100) {
    elements.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 240, after: 120 },
        children: [
          new ImageRun({
            data: diagramBuffer,
            transformation: { width: 560, height: 280 },
            type: "png",
          }),
        ],
      }),
      new Paragraph({
        style: "ImageCaption",
        children: [
          new TextRun({
            text: `Abbildung ${outline.number}.1: ${diagramPrompt}`,
            italics: true,
          }),
        ],
      })
    );
  }

  // Chapter body content
  const contentParagraphs = parseMarkdownContent(content);
  elements.push(...contentParagraphs);

  // Infographic (if available)
  if (infographicBuffer && infographicBuffer.length > 100) {
    elements.push(
      new Paragraph({ text: "", spacing: { before: 360 } }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new ImageRun({
            data: infographicBuffer,
            transformation: { width: 560, height: 315 },
            type: "png",
          }),
        ],
      }),
      new Paragraph({
        style: "ImageCaption",
        children: [
          new TextRun({
            text: `Infografik ${outline.number}: Kernpunkte auf einen Blick`,
            italics: true,
          }),
        ],
      })
    );
  }

  // Page break after each chapter
  elements.push(new Paragraph({ children: [new PageBreak()] }));

  return elements;
}

/**
 * Parses simple markdown-like content into DOCX paragraphs.
 * Supports: ### headings, **bold**, bullet points (•)
 */
function parseMarkdownContent(content: string): Paragraph[] {
  const paragraphs: Paragraph[] = [];
  const lines = content.split("\n");

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      paragraphs.push(new Paragraph({ text: "", spacing: { after: 120 } }));
      continue;
    }

    // ### Subheading
    if (trimmed.startsWith("### ")) {
      paragraphs.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_3,
          children: [
            new TextRun({
              text: trimmed.replace(/^### /, ""),
              font: CORPORATE_CONFIG.fonts.heading,
              bold: true,
              color: hex(C.accent),
              size: 28,
            }),
          ],
          spacing: { before: 320, after: 160 },
        })
      );
      continue;
    }

    // ## Subheading level 2
    if (trimmed.startsWith("## ")) {
      paragraphs.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          children: [
            new TextRun({
              text: trimmed.replace(/^## /, ""),
              font: CORPORATE_CONFIG.fonts.heading,
              bold: true,
              color: hex(C.primary),
              size: 36,
            }),
          ],
          spacing: { before: 400, after: 200 },
        })
      );
      continue;
    }

    // • Bullet point (key takeaway)
    if (trimmed.startsWith("• ")) {
      paragraphs.push(
        new Paragraph({
          style: "KeyTakeaway",
          children: [
            new TextRun({
              text: trimmed,
              font: CORPORATE_CONFIG.fonts.body,
              size: 22,
              color: hex(C.primary),
            }),
          ],
        })
      );
      continue;
    }

    // Regular paragraph with inline **bold** parsing
    paragraphs.push(
      new Paragraph({
        alignment: AlignmentType.JUSTIFIED,
        spacing: { line: 360, after: 160 },
        children: parseInlineFormatting(trimmed),
      })
    );
  }

  return paragraphs;
}

function parseInlineFormatting(text: string): TextRun[] {
  const runs: TextRun[] = [];
  const parts = text.split(/(\*\*[^*]+\*\*)/g);

  for (const part of parts) {
    if (part.startsWith("**") && part.endsWith("**")) {
      runs.push(
        new TextRun({
          text: part.replace(/\*\*/g, ""),
          bold: true,
          font: CORPORATE_CONFIG.fonts.body,
          size: 24,
          color: hex(C.text),
        })
      );
    } else if (part) {
      runs.push(
        new TextRun({
          text: part,
          font: CORPORATE_CONFIG.fonts.body,
          size: 24,
          color: hex(C.text),
        })
      );
    }
  }

  return runs.length > 0 ? runs : [new TextRun({ text })];
}

// ─── Conclusion ─────────────────────────────────────────────────────────────

function buildConclusion(conclusionText: string): Paragraph[] {
  return [
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      children: [
        new Bookmark({
          id: "conclusion",
          children: [
            new TextRun({
              text: "Schluss & Ausblick",
              font: CORPORATE_CONFIG.fonts.heading,
              size: 56,
              bold: true,
              color: hex(C.primary),
            }),
          ],
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.JUSTIFIED,
      spacing: { line: 360, after: 240 },
      children: [
        new TextRun({
          text: conclusionText,
          font: CORPORATE_CONFIG.fonts.body,
          size: 24,
          italics: true,
          color: hex(C.textLight),
        }),
      ],
    }),
  ];
}

// ─── Footer ──────────────────────────────────────────────────────────────────

function buildFooter(bookTitle: string): Footer {
  const year = new Date().getFullYear();

  return new Footer({
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        border: {
          top: {
            color: hex(C.secondary),
            space: 4,
            style: BorderStyle.SINGLE,
            size: 4,
          },
        },
        spacing: { before: 120 },
        children: [
          new TextRun({
            text: `© ${year} ${Corp.copyrightHolder}  •  ${bookTitle}  •  Seite `,
            font: CORPORATE_CONFIG.fonts.body,
            size: 18,
            color: hex(C.textLight),
          }),
          new TextRun({
            children: [new PageNumberElement()],
            font: CORPORATE_CONFIG.fonts.body,
            size: 18,
            color: hex(C.primary),
            bold: true,
          }),
          new TextRun({
            text: `  •  ${Corp.website}`,
            font: CORPORATE_CONFIG.fonts.body,
            size: 18,
            color: hex(C.textLight),
          }),
        ],
      }),
    ],
  });
}
