"use client";

import { useState } from "react";
import type { Country } from "@/data/countries";
import { CONTINENT_MAP } from "@/data/categories";
import { Sparkles } from "lucide-react";

const RARITY_COLORS: Record<string, { border: string; text: string; label: string }> = {
  common: { border: "#444444", text: "#888888", label: "Common" },
  uncommon: { border: "#4ade80", text: "#4ade80", label: "Uncommon" },
  rare: { border: "#EF9F27", text: "#EF9F27", label: "Rare" },
  legendary: { border: "#7F77DD", text: "#7F77DD", label: "Legendary" },
};

export default function CardUnlock({
  country,
  onContinue,
  onViewCollection,
}: {
  country: Country;
  onContinue: () => void;
  onViewCollection: () => void;
}) {
  const [flipped, setFlipped] = useState(false);
  const r = RARITY_COLORS[country.rarity] ?? RARITY_COLORS.common;
  const continent = CONTINENT_MAP[country.code] ?? "";

  // Auto-flip after card flies in
  setTimeout(() => setFlipped(true), 600);

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center"
      style={{ background: "rgba(0,0,0,0.85)", animation: "fadeIn 300ms ease-out both" }}
    >
      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes cardFlyIn {
          from { transform: translateY(100vh) scale(0.8); opacity: 0; }
          60% { transform: translateY(-10px) scale(1.02); opacity: 1; }
          to { transform: translateY(0) scale(1); opacity: 1; }
        }
        .card-container { perspective: 800px; }
        .card-inner {
          transition: transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
          transform-style: preserve-3d;
        }
        .card-inner.flipped { transform: rotateY(180deg); }
        .card-face {
          backface-visibility: hidden;
          position: absolute;
          inset: 0;
        }
        .card-back { transform: rotateY(0deg); }
        .card-front { transform: rotateY(180deg); }
      `}</style>

      {/* Card */}
      <div
        className="card-container mb-6"
        style={{ animation: "cardFlyIn 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) both" }}
      >
        <div
          className={`card-inner ${flipped ? "flipped" : ""}`}
          style={{ width: 160, height: 220 }}
        >
          {/* Back */}
          <div
            className="card-face card-back flex flex-col items-center justify-center rounded-xl"
            style={{
              width: 160,
              height: 220,
              background: "#111111",
              border: `2px solid ${r.border}`,
            }}
          >
            <p className="text-sm font-bold text-[#333333]">World</p>
            <p className="text-sm font-bold text-[#333333]">Explorer</p>
          </div>

          {/* Front */}
          <div
            className="card-face card-front flex flex-col overflow-hidden rounded-xl"
            style={{
              width: 160,
              height: 220,
              background: "#111111",
              border: `2px solid ${r.border}`,
            }}
          >
            {/* Flag */}
            <div className="flex h-16 items-center justify-center bg-[#0a0a0a]">
              <img
                src={`https://flagcdn.com/w80/${country.code2}.png`}
                alt={country.name}
                className="h-10 w-auto object-contain"
              />
            </div>

            {/* Info */}
            <div className="flex flex-1 flex-col p-3">
              <p className="text-[14px] font-bold leading-tight text-foreground">
                {country.name}
              </p>
              <p className="mt-0.5 text-[11px] text-[#666666]">
                {country.capital}
              </p>
              {continent && (
                <span className="mt-1.5 inline-block self-start rounded-full bg-[#1a1a1a] px-2 py-0.5 text-[9px] font-medium text-[#666666]">
                  {continent}
                </span>
              )}
              <p className="mt-auto text-[10px] italic leading-snug text-[#555555]">
                {country.funFact}
              </p>
            </div>

            {/* Rarity bar */}
            <div
              className="flex items-center justify-center py-1.5"
              style={{ background: `${r.border}15` }}
            >
              <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: r.text }}>
                {r.label}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Text */}
      <div className="mb-1 flex items-center gap-1.5">
        <Sparkles className="h-4 w-4" strokeWidth={1.5} style={{ color: r.text }} />
        <p className="text-sm font-semibold text-foreground">New card unlocked!</p>
      </div>
      <p className="mb-1 text-lg font-bold text-foreground">{country.name}</p>
      <p className="mb-5 text-xs font-semibold uppercase tracking-wider" style={{ color: r.text }}>
        {r.label}
      </p>

      {/* Buttons */}
      <div className="flex gap-3">
        <button
          onClick={onViewCollection}
          className="cursor-pointer rounded-lg border border-[#333333] px-4 py-2 text-sm font-semibold text-foreground transition-all duration-150 hover:bg-[#1a1a1a] hover:border-[#555555] active:scale-[0.98]"
        >
          View collection
        </button>
        <button
          onClick={onContinue}
          className="cursor-pointer rounded-lg bg-[#f0f0f0] px-4 py-2 text-sm font-semibold text-[#0a0a0a] transition-all duration-150 hover:bg-[#e5e5e5] active:scale-[0.98]"
        >
          Continue
        </button>
      </div>
    </div>
  );
}
