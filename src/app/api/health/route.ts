import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    services: {
      anthropic: !!process.env.ANTHROPIC_API_KEY,
      elevenlabs: !!process.env.ELEVENLABS_API_KEY,
      napkin: !!process.env.NAPKIN_API_KEY,
      nanoBanana: !!process.env.NANO_BANANA_API_KEY,
    },
  });
}
