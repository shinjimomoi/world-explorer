"use client";

import { useState } from "react";
import { ComposableMap, Geographies, Geography } from "react-simple-maps";
import DifficultyModal from "./components/DifficultyModal";
import { useRouter } from "next/navigation";
import type { Difficulty } from "./game/WorldMap";
import type { Category } from "@/data/categories";

const GEO_URL =
  "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

const TICKER_CITIES = [
  "Tokyo", "Paris", "Nairobi", "Buenos Aires", "Bangkok",
  "Cairo", "Ottawa", "Oslo", "Seoul", "Lima",
  "Canberra", "Berlin", "Brasília", "Hanoi", "Accra",
  "Madrid", "Ankara", "Havana",
];

export default function Home() {
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);

  function handleSelect(difficulty: Difficulty, category: Category) {
    setShowModal(false);
    router.push(`/game?difficulty=${difficulty}&category=${category}`);
  }

  const tickerText = TICKER_CITIES.join(" · ") + " · ";

  return (
    <div className="relative flex flex-1 flex-col overflow-hidden">
      {/* Map background */}
      <div
        className="absolute inset-0"
        style={{
          animation: "panMap 60s linear infinite alternate",
          width: "110%",
          left: "-5%",
        }}
      >
        <ComposableMap
          projection="geoEqualEarth"
          projectionConfig={{ scale: 160, center: [0, 10] }}
          width={960}
          height={500}
          style={{ width: "100%", height: "100%", display: "block" }}
        >
          <Geographies geography={GEO_URL}>
            {({ geographies }: any) =>
              geographies.map((geo: any) => (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  style={{
                    default: { fill: "#1a1a1a", stroke: "#2a2a2a", strokeWidth: 0.5, outline: "none" },
                    hover:   { fill: "#1a1a1a", stroke: "#2a2a2a", strokeWidth: 0.5, outline: "none" },
                    pressed: { fill: "#1a1a1a", stroke: "#2a2a2a", strokeWidth: 0.5, outline: "none" },
                  }}
                />
              ))
            }
          </Geographies>
        </ComposableMap>
      </div>

      {/* Dark overlay */}
      <div className="absolute inset-0 bg-black/55" />

      {/* Hero content */}
      <div className="relative z-10 flex flex-1 flex-col items-center justify-center gap-8 px-4 text-center">
        <div className="flex flex-col items-center gap-4">
          <p
            className="text-[11px] font-medium uppercase text-accent"
            style={{ letterSpacing: "0.15em" }}
          >
            Capital City Quiz
          </p>
          <h1 className="text-6xl font-bold tracking-tight text-white sm:text-[64px]">
            World Explorer
          </h1>
          <p className="max-w-md text-base text-[#888888]">
            How well do you know the world&apos;s capitals?
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="rounded-lg bg-[#f0f0f0] px-10 py-3.5 text-sm font-semibold text-[#0a0a0a] transition-colors hover:bg-white"
        >
          Play
        </button>

        <div className="flex items-center gap-3 text-xs text-[#666666]">
          <span>195 capitals</span>
          <span className="text-[#333333]">·</span>
          <span>7 regions</span>
          <span className="text-[#333333]">·</span>
          <span>2 difficulty levels</span>
        </div>
      </div>

      {/* Bottom ticker */}
      <div className="relative z-10 h-8 shrink-0 overflow-hidden opacity-20">
        <div
          className="flex h-full items-center whitespace-nowrap text-xs text-foreground-muted"
          style={{ animation: "ticker 30s linear infinite" }}
        >
          <span>{tickerText}</span>
          <span>{tickerText}</span>
        </div>
      </div>

      {showModal && (
        <DifficultyModal onSelect={handleSelect} onClose={() => setShowModal(false)} />
      )}
    </div>
  );
}
