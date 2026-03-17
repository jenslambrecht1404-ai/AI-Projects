/**
 * /api/voices — Returns available ElevenLabs voices for the UI selector
 */

import { NextResponse } from "next/server";
import { listAvailableVoices } from "@/lib/tts/elevenlabs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const voices = await listAvailableVoices();
  return NextResponse.json({ voices });
}
