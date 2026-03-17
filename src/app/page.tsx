"use client";

import { useRef, useState } from "react";
import { ModelToggle } from "@/components/ModelToggle";
import { GenerationProgress } from "@/components/GenerationProgress";
import type { AIModel, AudienceLevel } from "@/lib/config";
import { AUDIENCE_LABELS, CORPORATE_CONFIG } from "@/lib/config";

export default function Home() {
  const [bookTitle, setBookTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [audience, setAudience] = useState<AudienceLevel>("Gemischt");
  const [model, setModel] = useState<AIModel>(CORPORATE_CONFIG.generation.defaultModel);
  const [transcriptFile, setTranscriptFile] = useState<File | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [formDataForGeneration, setFormDataForGeneration] = useState<FormData | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const audienceLevels: AudienceLevel[] = ["Einsteiger", "Gemischt", "Fortgeschrittene"];

  function handleFileChange(file: File) {
    setTranscriptFile(file);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileChange(file);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!transcriptFile) return;

    const fd = new FormData();
    fd.append("transcript", transcriptFile);
    fd.append("bookTitle", bookTitle || "Mein Workbook");
    fd.append("subtitle", subtitle);
    fd.append("audience", audience);
    fd.append("model", model);

    setFormDataForGeneration(fd);
    setIsGenerating(true);
  }

  function handleReset() {
    setIsGenerating(false);
    setFormDataForGeneration(null);
    setTranscriptFile(null);
    setBookTitle("");
    setSubtitle("");
  }

  if (isGenerating && formDataForGeneration) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/30 py-10 px-4">
        <div className="max-w-4xl mx-auto">
          <Header />
          <GenerationProgress formData={formDataForGeneration} onReset={handleReset} />
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/30 py-10 px-4">
      <div className="max-w-2xl mx-auto">
        <Header />

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Upload Section */}
          <section className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
            <h2 className="text-base font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <span className="w-7 h-7 rounded-lg bg-[#1A3C5E] text-white text-xs flex items-center justify-center font-bold">1</span>
              Transkript hochladen
            </h2>

            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                dragOver
                  ? "border-[#1A3C5E] bg-[#1A3C5E]/5"
                  : transcriptFile
                    ? "border-green-300 bg-green-50"
                    : "border-slate-200 hover:border-[#1A3C5E]/40 hover:bg-slate-50"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept=".txt,.md,.vtt,.srt"
                onChange={(e) => e.target.files?.[0] && handleFileChange(e.target.files[0])}
              />
              {transcriptFile ? (
                <div>
                  <div className="text-3xl mb-2">✅</div>
                  <p className="font-semibold text-green-700">{transcriptFile.name}</p>
                  <p className="text-sm text-green-600 mt-1">
                    {(transcriptFile.size / 1024).toFixed(1)} KB — Klicken zum Ändern
                  </p>
                </div>
              ) : (
                <div>
                  <div className="text-3xl mb-2">📄</div>
                  <p className="font-semibold text-slate-700">Transkript hier ablegen</p>
                  <p className="text-sm text-slate-400 mt-1">oder klicken zum Auswählen</p>
                  <p className="text-xs text-slate-300 mt-2">.txt · .md · .vtt · .srt</p>
                </div>
              )}
            </div>
          </section>

          {/* Metadata Section */}
          <section className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
            <h2 className="text-base font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <span className="w-7 h-7 rounded-lg bg-[#1A3C5E] text-white text-xs flex items-center justify-center font-bold">2</span>
              Buch-Metadaten
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Buchtitel <span className="text-slate-400">(optional)</span>
                </label>
                <input
                  type="text"
                  value={bookTitle}
                  onChange={(e) => setBookTitle(e.target.value)}
                  placeholder="z.B. Digitale Transformation verstehen"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#1A3C5E]/30 focus:border-[#1A3C5E] text-slate-800 placeholder:text-slate-300 text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Untertitel <span className="text-slate-400">(optional)</span>
                </label>
                <input
                  type="text"
                  value={subtitle}
                  onChange={(e) => setSubtitle(e.target.value)}
                  placeholder="z.B. Ein Leitfaden für Einsteiger und Profis"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#1A3C5E]/30 focus:border-[#1A3C5E] text-slate-800 placeholder:text-slate-300 text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Zielgruppe & Sprachstil
                </label>
                <div className="flex gap-2">
                  {audienceLevels.map((level) => (
                    <button
                      key={level}
                      type="button"
                      onClick={() => setAudience(level)}
                      className={`flex-1 py-2.5 px-3 rounded-xl text-sm font-medium border transition-all ${
                        audience === level
                          ? "bg-[#1A3C5E] border-[#1A3C5E] text-white"
                          : "bg-white border-slate-200 text-slate-600 hover:border-[#1A3C5E]/40"
                      }`}
                    >
                      {level}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-slate-400 mt-1.5">
                  {AUDIENCE_LABELS[audience]}
                </p>
              </div>
            </div>
          </section>

          {/* Model Selection */}
          <section className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
            <h2 className="text-base font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <span className="w-7 h-7 rounded-lg bg-[#1A3C5E] text-white text-xs flex items-center justify-center font-bold">3</span>
              KI-Modell & Generierung
            </h2>
            <ModelToggle value={model} onChange={setModel} />
          </section>

          {/* Pipeline Info */}
          <section className="bg-[#1A3C5E]/5 rounded-2xl border border-[#1A3C5E]/10 p-5">
            <h3 className="text-sm font-semibold text-[#1A3C5E] mb-3">Was wird generiert:</h3>
            <div className="grid grid-cols-2 gap-2 text-xs text-slate-600">
              {[
                { icon: "📋", label: "Buchstruktur & Outline" },
                { icon: "✍️", label: "Vollständige Kapitel (Streaming)" },
                { icon: "📊", label: "Diagramme (Napkin-Adapter)" },
                { icon: "📈", label: "Infografiken (Nano Banana-Adapter)" },
                { icon: "🎧", label: "Hörbuch-Audio (ElevenLabs)" },
                { icon: "📄", label: "DOCX mit Corporate Design & TOC" },
              ].map(({ icon, label }) => (
                <div key={label} className="flex items-center gap-2">
                  <span>{icon}</span>
                  <span>{label}</span>
                </div>
              ))}
            </div>
          </section>

          {/* Submit */}
          <button
            type="submit"
            disabled={!transcriptFile}
            className={`w-full py-4 rounded-2xl font-bold text-lg transition-all duration-200 ${
              transcriptFile
                ? "bg-gradient-to-r from-[#1A3C5E] to-[#2E7DB6] text-white shadow-lg hover:shadow-xl hover:scale-[1.01] active:scale-[0.99]"
                : "bg-slate-100 text-slate-400 cursor-not-allowed"
            }`}
          >
            {transcriptFile ? "Workbook generieren →" : "Bitte zuerst Transkript hochladen"}
          </button>
        </form>
      </div>
    </main>
  );
}

function Header() {
  return (
    <div className="text-center mb-10">
      <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-[#D4AF37]/20 text-[#1A3C5E] rounded-full text-xs font-semibold mb-4 border border-[#D4AF37]/30">
        <span>⚡</span> KI-Workbook Generator
      </div>
      <h1 className="text-3xl md:text-4xl font-extrabold text-[#1A3C5E] leading-tight">
        Workbook &amp; Buch{" "}
        <span className="text-[#D4AF37]">Generator</span>
      </h1>
      <p className="text-slate-500 mt-3 max-w-lg mx-auto text-sm">
        Verwandelt Transkripte automatisch in professionelle Word-Dokumente mit
        Diagrammen, Infografiken und Hörbuch — im Corporate Design.
      </p>
    </div>
  );
}
