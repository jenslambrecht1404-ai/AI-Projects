/**
 * DOCX Corporate Style Definitions
 * All styles reference CORPORATE_CONFIG for easy brand updates.
 */

import {
  AlignmentType,
  BorderStyle,
  HeadingLevel,
  IStylesOptions,
  ShadingType,
  UnderlineType,
} from "docx";
import { CORPORATE_CONFIG } from "@/lib/config";

const C = CORPORATE_CONFIG.colors;
const F = CORPORATE_CONFIG.fonts;

// Convert hex color string to DOCX format (without #)
function hex(color: string): string {
  return color.replace("#", "");
}

export const DOCX_STYLES: IStylesOptions = {
  default: {
    document: {
      run: {
        font: F.body,
        size: 24, // 12pt (half-points)
        color: hex(C.text),
      },
      paragraph: {
        spacing: { line: 360, after: 160 }, // 1.5 line spacing
        alignment: AlignmentType.JUSTIFIED,
      },
    },
    heading1: {
      run: {
        font: F.heading,
        size: 48, // 24pt
        bold: true,
        color: hex(C.primary),
      },
      paragraph: {
        spacing: { before: 480, after: 240 },
        border: {
          bottom: {
            color: hex(C.secondary),
            space: 4,
            style: BorderStyle.SINGLE,
            size: 6,
          },
        },
      },
    },
    heading2: {
      run: {
        font: F.heading,
        size: 36, // 18pt
        bold: true,
        color: hex(C.primary),
      },
      paragraph: {
        spacing: { before: 360, after: 160 },
      },
    },
    heading3: {
      run: {
        font: F.heading,
        size: 28, // 14pt
        bold: true,
        color: hex(C.accent),
      },
      paragraph: {
        spacing: { before: 240, after: 120 },
      },
    },
  },
  paragraphStyles: [
    {
      id: "ChapterTitle",
      name: "Chapter Title",
      basedOn: "Heading1",
      run: {
        font: F.heading,
        size: 56, // 28pt
        bold: true,
        color: hex(C.primary),
        allCaps: false,
      },
      paragraph: {
        spacing: { before: 720, after: 360 },
        shading: {
          type: ShadingType.SOLID,
          color: "F0F4F8",
          fill: "F0F4F8",
        },
      },
    },
    {
      id: "ChapterSubtitle",
      name: "Chapter Subtitle",
      basedOn: "Normal",
      run: {
        font: F.body,
        size: 24,
        italics: true,
        color: hex(C.textLight),
      },
      paragraph: {
        spacing: { after: 480 },
      },
    },
    {
      id: "KeyTakeaway",
      name: "Key Takeaway",
      basedOn: "Normal",
      run: {
        font: F.body,
        size: 22,
        bold: true,
        color: hex(C.primary),
      },
      paragraph: {
        spacing: { before: 120, after: 120 },
        indent: { left: 720 },
        border: {
          left: {
            color: hex(C.secondary),
            space: 8,
            style: BorderStyle.SINGLE,
            size: 12,
          },
        },
      },
    },
    {
      id: "BookTitle",
      name: "Book Title",
      basedOn: "Normal",
      run: {
        font: F.heading,
        size: 80, // 40pt
        bold: true,
        color: hex(C.primary),
      },
      paragraph: {
        alignment: AlignmentType.CENTER,
        spacing: { before: 1440, after: 480 },
      },
    },
    {
      id: "BookSubtitle",
      name: "Book Subtitle",
      basedOn: "Normal",
      run: {
        font: F.heading,
        size: 40, // 20pt
        color: hex(C.secondary),
        italics: true,
      },
      paragraph: {
        alignment: AlignmentType.CENTER,
        spacing: { after: 720 },
      },
    },
    {
      id: "TOCHeading",
      name: "TOC Heading",
      basedOn: "Normal",
      run: {
        font: F.heading,
        size: 40,
        bold: true,
        color: hex(C.primary),
      },
      paragraph: {
        spacing: { before: 480, after: 240 },
        border: {
          bottom: {
            color: hex(C.secondary),
            space: 4,
            style: BorderStyle.SINGLE,
            size: 6,
          },
        },
      },
    },
    {
      id: "ImageCaption",
      name: "Image Caption",
      basedOn: "Normal",
      run: {
        font: F.body,
        size: 18,
        italics: true,
        color: hex(C.textLight),
      },
      paragraph: {
        alignment: AlignmentType.CENTER,
        spacing: { before: 60, after: 240 },
      },
    },
    {
      id: "FooterStyle",
      name: "Footer Style",
      basedOn: "Normal",
      run: {
        font: F.body,
        size: 18,
        color: hex(C.textLight),
      },
      paragraph: {
        alignment: AlignmentType.CENTER,
      },
    },
  ],
};
