"use client";

import { AIModel, MODEL_LABELS } from "@/lib/config";

interface ModelToggleProps {
  value: AIModel;
  onChange: (model: AIModel) => void;
}

export function ModelToggle({ value, onChange }: ModelToggleProps) {
  const models: AIModel[] = ["claude-sonnet-4-6", "claude-opus-4-6"];

  return (
    <div className="space-y-2">
      <label className="block text-sm font-semibold text-slate-700">
        KI-Modell
      </label>
      <div className="flex rounded-xl border border-slate-200 bg-slate-50 p-1 gap-1">
        {models.map((model) => {
          const isActive = value === model;
          const isOpus = model === "claude-opus-4-6";
          return (
            <button
              key={model}
              type="button"
              onClick={() => onChange(model)}
              className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                isActive
                  ? isOpus
                    ? "bg-[#1A3C5E] text-white shadow-md"
                    : "bg-[#2E7DB6] text-white shadow-md"
                  : "text-slate-600 hover:text-slate-800 hover:bg-white"
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <span className={`w-2 h-2 rounded-full ${isActive ? "bg-[#D4AF37]" : "bg-slate-300"}`} />
                <span>{isOpus ? "Opus 4" : "Sonnet 4"}</span>
              </div>
              <div className={`text-xs mt-0.5 font-normal ${isActive ? "text-white/80" : "text-slate-400"}`}>
                {isOpus ? "Höchste Qualität" : "Schnell & effizient"}
              </div>
            </button>
          );
        })}
      </div>
      <p className="text-xs text-slate-500">
        {value === "claude-opus-4-6"
          ? "Opus 4 erzeugt die tiefgründigsten Texte, benötigt aber mehr Zeit."
          : "Sonnet 4 ist ideal für schnelle Iterationen und kostengünstige Generierung."}
      </p>
    </div>
  );
}
