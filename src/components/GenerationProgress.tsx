"use client";

import { useEffect, useRef, useState } from "react";
import type { BookOutline } from "@/lib/claude";

export interface SSEStatus {
  step: string;
  message: string;
  progress: number;
  chapterNumber?: number;
}

export interface SSEComplete {
  jobId: string;
  docx: { filename: string; downloadUrl: string };
  audio: Array<{ filename: string; downloadUrl: string; duration: number }>;
  outline: BookOutline;
  totalChapters: number;
}

interface ChapterStream {
  number: number;
  title: string;
  content: string;
  complete: boolean;
  wordCount?: number;
}

interface GenerationProgressProps {
  formData: FormData;
  onReset: () => void;
}

export function GenerationProgress({ formData, onReset }: GenerationProgressProps) {
  const [status, setStatus] = useState<SSEStatus>({
    step: "init",
    message: "Verbinde mit dem Server…",
    progress: 0,
  });
  const [chapters, setChapters] = useState<Map<number, ChapterStream>>(new Map());
  const [outline, setOutline] = useState<BookOutline | null>(null);
  const [result, setResult] = useState<SSEComplete | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeChapter, setActiveChapter] = useState<number | null>(null);
  const streamRef = useRef<EventSource | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    startGeneration();
    return () => streamRef.current?.close();
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chapters]);

  async function startGeneration() {
    // Upload formData via fetch, get back a URL for EventSource
    const response = await fetch("/api/generate", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      setError("Fehler beim Verbinden mit dem Server.");
      return;
    }

    if (!response.body) {
      setError("Kein Stream verfügbar.");
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      let eventType = "";
      for (const line of lines) {
        if (line.startsWith("event: ")) {
          eventType = line.slice(7).trim();
        } else if (line.startsWith("data: ")) {
          const data = JSON.parse(line.slice(6));
          handleSSEEvent(eventType, data);
          eventType = "";
        }
      }
    }
  }

  function handleSSEEvent(event: string, data: unknown) {
    const d = data as Record<string, unknown>;
    switch (event) {
      case "status":
        setStatus(d as unknown as SSEStatus);
        break;

      case "outline":
        setOutline((d as { outline: BookOutline }).outline);
        break;

      case "chapterChunk":
        setActiveChapter(d.chapterNumber as number);
        setChapters((prev) => {
          const next = new Map(prev);
          const existing = next.get(d.chapterNumber as number);
          next.set(d.chapterNumber as number, {
            number: d.chapterNumber as number,
            title: d.chapterTitle as string,
            content: (existing?.content || "") + (d.chunk as string),
            complete: false,
          });
          return next;
        });
        break;

      case "chapterComplete":
        setChapters((prev) => {
          const next = new Map(prev);
          const existing = next.get(d.chapterNumber as number);
          if (existing) {
            next.set(d.chapterNumber as number, {
              ...existing,
              complete: true,
              wordCount: d.wordCount as number,
            });
          }
          return next;
        });
        break;

      case "complete":
        setResult(d as unknown as SSEComplete);
        setStatus({ step: "done", message: "Fertig!", progress: 100 });
        break;

      case "error":
        setError(d.message as string);
        break;
    }
  }

  const chapterList = Array.from(chapters.values()).sort((a, b) => a.number - b.number);

  if (error) {
    return (
      <div className="max-w-2xl mx-auto mt-10 p-8 bg-red-50 rounded-2xl border border-red-200 text-center">
        <div className="text-4xl mb-4">❌</div>
        <h3 className="text-xl font-bold text-red-800 mb-2">Fehler bei der Generierung</h3>
        <p className="text-red-600 mb-6">{error}</p>
        <button
          onClick={onReset}
          className="px-6 py-3 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 transition-colors"
        >
          Neu starten
        </button>
      </div>
    );
  }

  if (result) {
    return <DownloadPanel result={result} onReset={onReset} />;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Progress Header */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-lg font-bold text-[#1A3C5E]">Generierung läuft</h2>
            <p className="text-sm text-slate-500 mt-0.5">{status.message}</p>
          </div>
          <div className="text-2xl font-bold text-[#1A3C5E]">{status.progress}%</div>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-3">
          <div
            className="bg-gradient-to-r from-[#1A3C5E] to-[#2E7DB6] h-3 rounded-full transition-all duration-500"
            style={{ width: `${status.progress}%` }}
          />
        </div>
        <div className="flex gap-2 mt-3 flex-wrap">
          {[
            { key: "outline", label: "Struktur" },
            { key: "chapter", label: "Kapitel" },
            { key: "diagram", label: "Diagramme" },
            { key: "audio", label: "Audio" },
            { key: "docx", label: "DOCX" },
            { key: "done", label: "Fertig" },
          ].map(({ key, label }) => {
            const steps = ["outline", "chapter", "diagram", "audio", "docx", "done"];
            const currentIdx = steps.indexOf(status.step);
            const thisIdx = steps.indexOf(key);
            const isDone = thisIdx < currentIdx;
            const isActive = key === status.step;
            return (
              <span
                key={key}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                  isDone
                    ? "bg-green-100 text-green-700"
                    : isActive
                      ? "bg-[#1A3C5E] text-white animate-pulse"
                      : "bg-slate-100 text-slate-400"
                }`}
              >
                {isDone ? "✓ " : isActive ? "⟳ " : ""}{label}
              </span>
            );
          })}
        </div>
      </div>

      {/* Book Outline */}
      {outline && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <h3 className="font-bold text-[#1A3C5E] mb-3 flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-green-100 text-green-600 text-xs flex items-center justify-center font-bold">✓</span>
            Buchstruktur erstellt
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {outline.chapters.map((ch) => {
              const stream = chapters.get(ch.number);
              const isActive = activeChapter === ch.number;
              const isDone = stream?.complete;
              return (
                <div
                  key={ch.number}
                  onClick={() => setActiveChapter(isActive ? null : ch.number)}
                  className={`p-3 rounded-xl border cursor-pointer transition-all ${
                    isDone
                      ? "border-green-200 bg-green-50"
                      : isActive
                        ? "border-[#1A3C5E] bg-[#1A3C5E]/5"
                        : "border-slate-100 bg-slate-50 hover:border-slate-200"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${isDone ? "bg-green-200 text-green-700" : isActive ? "bg-[#D4AF37] text-[#1A3C5E]" : "bg-slate-200 text-slate-500"}`}>
                      {ch.number}
                    </span>
                    <span className="text-xs font-medium text-slate-700 truncate">{ch.title}</span>
                  </div>
                  {stream && (
                    <div className="mt-1.5 text-xs text-slate-400">
                      {isDone ? `✓ ${stream.wordCount} Wörter` : `${stream.content.split(/\s+/).length} Wörter…`}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Live chapter stream */}
      {activeChapter && chapters.get(activeChapter) && (
        <div className="bg-white rounded-2xl shadow-sm border border-[#1A3C5E]/20 p-6">
          <h3 className="font-bold text-[#1A3C5E] mb-1">
            Kapitel {activeChapter}: {chapters.get(activeChapter)!.title}
          </h3>
          <p className="text-xs text-slate-400 mb-3">Live-Vorschau des generierten Texts</p>
          <div
            ref={scrollRef}
            className="max-h-64 overflow-y-auto text-sm text-slate-700 leading-relaxed font-mono bg-slate-50 p-4 rounded-xl whitespace-pre-wrap"
          >
            {chapters.get(activeChapter)!.content}
            {!chapters.get(activeChapter)!.complete && (
              <span className="inline-block w-2 h-4 bg-[#1A3C5E] animate-pulse ml-0.5 align-text-bottom" />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function DownloadPanel({ result, onReset }: { result: SSEComplete; onReset: () => void }) {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Success banner */}
      <div className="bg-gradient-to-r from-[#1A3C5E] to-[#2E7DB6] rounded-2xl p-8 text-white text-center">
        <div className="text-5xl mb-3">🎉</div>
        <h2 className="text-2xl font-bold mb-1">Generierung abgeschlossen!</h2>
        <p className="text-white/80">{result.totalChapters} Kapitel erfolgreich erstellt</p>
      </div>

      {/* DOCX Download */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
        <h3 className="font-bold text-[#1A3C5E] mb-4 flex items-center gap-2">
          <span>📄</span> Word-Dokument
        </h3>
        <a
          href={result.docx.downloadUrl}
          download
          className="flex items-center gap-3 p-4 bg-[#1A3C5E] text-white rounded-xl hover:bg-[#1A3C5E]/90 transition-colors font-medium"
        >
          <span className="text-2xl">⬇</span>
          <div>
            <div>{result.docx.filename}</div>
            <div className="text-xs text-white/70">
              {result.totalChapters} Kapitel • Corporate Design • TOC • Grafiken
            </div>
          </div>
        </a>
      </div>

      {/* Audio Downloads */}
      {result.audio.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <h3 className="font-bold text-[#1A3C5E] mb-4 flex items-center gap-2">
            <span>🎧</span> Hörbuch-Kapitel ({result.audio.length} Dateien)
          </h3>
          <div className="space-y-2">
            {result.audio.map((audio) => (
              <a
                key={audio.filename}
                href={audio.downloadUrl}
                download
                className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl hover:bg-[#D4AF37]/10 border border-transparent hover:border-[#D4AF37]/30 transition-all group"
              >
                <span className="text-xl">🎵</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-slate-700 truncate">{audio.filename}</div>
                  {audio.duration > 0 && (
                    <div className="text-xs text-slate-400">~{Math.ceil(audio.duration / 60)} Min.</div>
                  )}
                </div>
                <span className="text-xs text-[#1A3C5E] font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                  Download
                </span>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Outline summary */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
        <h3 className="font-bold text-[#1A3C5E] mb-3">Buchstruktur</h3>
        <div className="space-y-1.5">
          {result.outline.chapters.map((ch) => (
            <div key={ch.number} className="flex items-start gap-2 text-sm">
              <span className="shrink-0 w-6 h-6 rounded-full bg-[#D4AF37] text-[#1A3C5E] text-xs font-bold flex items-center justify-center">
                {ch.number}
              </span>
              <div>
                <span className="font-medium text-slate-800">{ch.title}</span>
                <span className="text-slate-400 ml-2 text-xs">{ch.summary.substring(0, 80)}…</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <button
        onClick={onReset}
        className="w-full py-3 border-2 border-[#1A3C5E] text-[#1A3C5E] rounded-xl font-medium hover:bg-[#1A3C5E] hover:text-white transition-all"
      >
        Neues Buch generieren
      </button>
    </div>
  );
}
