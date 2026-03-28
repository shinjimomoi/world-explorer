"use client";

import { useState } from "react";
import type { Country } from "@/data/countries";
import { CONTINENT_MAP } from "@/data/categories";
import { Sparkles } from "lucide-react";

const RARITY_STYLES: Record<string, { border: string; glow: string; flagBg: string; bg: string; badgeBg: string; badgeBorder: string; color: string; label: string }> = {
  common:    { border: "#666666", glow: "0 0 20px rgba(150,150,150,0.2)", flagBg: "rgba(150,150,150,0.05)", bg: "#111111", badgeBg: "rgba(150,150,150,0.15)", badgeBorder: "#666666", color: "#888888", label: "Common" },
  uncommon:  { border: "#4ade80", glow: "0 0 20px rgba(74,222,128,0.3)", flagBg: "rgba(74,222,128,0.05)", bg: "#0f1a0f", badgeBg: "rgba(74,222,128,0.12)", badgeBorder: "rgba(74,222,128,0.4)", color: "#4ade80", label: "Uncommon" },
  rare:      { border: "#fb923c", glow: "0 0 20px rgba(251,146,60,0.3)", flagBg: "rgba(251,146,60,0.05)", bg: "#1a0f0a", badgeBg: "rgba(251,146,60,0.12)", badgeBorder: "rgba(251,146,60,0.4)", color: "#fb923c", label: "Rare" },
  legendary: { border: "#7F77DD", glow: "0 0 24px rgba(127,119,221,0.4)", flagBg: "rgba(127,119,221,0.07)", bg: "#0f0f1a", badgeBg: "rgba(127,119,221,0.15)", badgeBorder: "rgba(127,119,221,0.5)", color: "#7F77DD", label: "Legendary" },
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
  const r = RARITY_STYLES[country.rarity] ?? RARITY_STYLES.common;
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
          style={{ width: 160, height: 230 }}
        >
          {/* Back */}
          <div
            className="card-face card-back flex flex-col items-center justify-center rounded-xl"
            style={{
              width: 160,
              height: 230,
              background: r.bg,
              border: `2px solid ${r.border}`,
              boxShadow: r.glow,
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
              height: 230,
              background: r.bg,
              border: `2px solid ${r.border}`,
              boxShadow: r.glow,
            }}
          >
            {/* Flag area */}
            <div className="relative flex h-20 items-center justify-center" style={{ background: r.flagBg, borderBottom: `1px solid ${r.border}20` }}>
              <img
                src={`https://flagcdn.com/w80/${country.code2}.png`}
                alt={`${country.name} flag`}
                className="h-12 w-auto object-contain"
              />
            </div>

            {/* Body */}
            <div className="flex flex-1 flex-col px-3 py-2.5">
              <p className="text-[13px] font-bold leading-tight text-[#f0f0f0]">{country.name}</p>
              <p className="mt-0.5 text-[11px] font-medium" style={{ color: r.color }}>{country.capital}</p>
              <p className="mt-1.5 flex-1 text-[10px] italic leading-[1.4] text-[#444444]">{country.funFact}</p>
              <div className="mt-1 flex items-center justify-between">
                {continent && <span className="text-[9px]" style={{ color: `${r.color}80` }}>{continent}</span>}
                <span
                  className="ml-auto rounded-full px-1.5 py-0.5 text-[8px] font-semibold uppercase"
                  style={{ letterSpacing: "0.1em", background: r.badgeBg, border: `1px solid ${r.badgeBorder}`, color: r.color }}
                >
                  {r.label}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Text */}
      <div className="mb-1 flex items-center gap-1.5">
        <Sparkles className="h-4 w-4" strokeWidth={1.5} style={{ color: r.color }} />
        <p className="text-sm font-semibold text-foreground">New card unlocked!</p>
      </div>
      <p className="mb-1 text-lg font-bold text-foreground">{country.name}</p>
      <p className="mb-5 text-xs font-semibold uppercase tracking-wider" style={{ color: r.color }}>
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
