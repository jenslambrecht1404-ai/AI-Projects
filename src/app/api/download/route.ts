/**
 * /api/download — Secure file download endpoint
 * Serves generated DOCX and MP3 files from the /output directory.
 */

import { NextRequest, NextResponse } from "next/server";
import { readFile, stat } from "fs/promises";
import { join } from "path";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const jobId = searchParams.get("jobId");
  const file = searchParams.get("file");

  if (!jobId || !file) {
    return NextResponse.json({ error: "Missing jobId or file parameter" }, { status: 400 });
  }

  // Sanitize path to prevent directory traversal
  const safeJobId = jobId.replace(/[^a-zA-Z0-9-]/g, "");
  const safeFile = file.replace(/[^a-zA-Z0-9._\-äöüßÄÖÜ]/g, "");

  if (!safeJobId || !safeFile) {
    return NextResponse.json({ error: "Invalid path" }, { status: 400 });
  }

  const filePath = join(process.cwd(), "output", safeJobId, safeFile);

  try {
    await stat(filePath); // Check existence
    const buffer = await readFile(filePath);

    const isDocx = safeFile.endsWith(".docx");
    const isMp3 = safeFile.endsWith(".mp3");

    const contentType = isDocx
      ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      : isMp3
        ? "audio/mpeg"
        : "application/octet-stream";

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${safeFile}"`,
        "Content-Length": buffer.length.toString(),
      },
    });
  } catch {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }
}
