/**
 * ElevenLabs TTS / Voice Cloning Integration
 *
 * Generates MP3 audio for each chapter using ElevenLabs API.
 * Supports Voice Cloning via a pre-cloned Voice ID set in .env.
 */

export interface TTSRequest {
  text: string;
  chapterTitle: string;
  chapterNumber: number;
}

export interface TTSResult {
  audioBuffer: Buffer;
  filename: string;
  durationEstimateSec: number;
}

const ELEVENLABS_BASE = "https://api.elevenlabs.io/v1";

// Words per minute estimate for audio duration calculation
const WORDS_PER_MINUTE = 140;

export async function generateChapterAudio(req: TTSRequest): Promise<TTSResult> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  const voiceId = process.env.ELEVENLABS_VOICE_ID || "21m00Tcm4TlvDq8ikWAM"; // Default: Rachel

  if (!apiKey) {
    console.warn("[ElevenLabs] No API key — returning silent placeholder audio");
    return buildSilentPlaceholder(req);
  }

  const modelId = process.env.ELEVENLABS_MODEL_ID || "eleven_multilingual_v2";

  const response = await fetch(`${ELEVENLABS_BASE}/text-to-speech/${voiceId}`, {
    method: "POST",
    headers: {
      "xi-api-key": apiKey,
      "Content-Type": "application/json",
      Accept: "audio/mpeg",
    },
    body: JSON.stringify({
      text: req.text,
      model_id: modelId,
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.75,
        style: 0.0,
        use_speaker_boost: true,
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`ElevenLabs API error ${response.status}: ${errorText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const audioBuffer = Buffer.from(arrayBuffer);
  const wordCount = req.text.split(/\s+/).length;
  const durationEstimateSec = Math.ceil((wordCount / WORDS_PER_MINUTE) * 60);

  return {
    audioBuffer,
    filename: `kapitel-${req.chapterNumber}-${slugify(req.chapterTitle)}.mp3`,
    durationEstimateSec,
  };
}

/**
 * Lists available voices on the account (useful for the UI voice selector).
 */
export async function listAvailableVoices(): Promise<Array<{ voice_id: string; name: string }>> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) return [];

  const response = await fetch(`${ELEVENLABS_BASE}/voices`, {
    headers: { "xi-api-key": apiKey },
  });

  if (!response.ok) return [];
  const data = await response.json() as { voices: Array<{ voice_id: string; name: string }> };
  return data.voices ?? [];
}

function buildSilentPlaceholder(req: TTSRequest): TTSResult {
  // Minimal valid MP3 header (silent, 1 sec) as placeholder when no API key
  const silentMp3 = Buffer.from([
    0xff, 0xfb, 0x90, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00,
  ]);

  return {
    audioBuffer: silentMp3,
    filename: `kapitel-${req.chapterNumber}-${slugify(req.chapterTitle)}-placeholder.mp3`,
    durationEstimateSec: 0,
  };
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[äöüÄÖÜ]/g, (c) => ({ ä: "ae", ö: "oe", ü: "ue", Ä: "ae", Ö: "oe", Ü: "ue" }[c] ?? c))
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .substring(0, 50);
}
