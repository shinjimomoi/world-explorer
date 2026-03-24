"use client";

import { useState } from "react";
import type { Difficulty } from "@/app/game/WorldMap";
import { CATEGORY_META, categoryCount, type Category } from "@/data/categories";
import { Globe, Sun, Compass, Mountain, Landmark, Waves, Minimize2, Swords, ChevronLeft, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";

const ICON_MAP: Record<string, LucideIcon> = {
  globe: Globe,
  sun: Sun,
  compass: Compass,
  mountain: Mountain,
  landmark: Landmark,
  waves: Waves,
  minimize2: Minimize2,
};

export default function DifficultyModal({
  onSelect,
  onClose,
}: {
  onSelect: (difficulty: Difficulty, category: Category) => void;
  onClose: () => void;
}) {
  const [step, setStep] = useState<"difficulty" | "category">("difficulty");
  const [difficulty, setDifficulty] = useState<Difficulty>("easy");

  function pickDifficulty(d: Difficulty) {
    if (d === "survival") {
      onSelect(d, "All World");
      return;
    }
    setDifficulty(d);
    setStep("category");
  }

  function pickCategory(c: Category) {
    onSelect(difficulty, c);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 backdrop-blur-xl"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl border border-border bg-surface p-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {step === "category" && (
              <button
                onClick={() => setStep("difficulty")}
                aria-label="Back"
                className="flex h-8 w-8 items-center justify-center rounded-md text-foreground-muted transition-colors hover:bg-surface-elevated hover:text-foreground"
              >
                <ChevronLeft className="h-4 w-4" strokeWidth={1.5} />
              </button>
            )}
            <h2 className="text-lg font-bold text-foreground">
              {step === "difficulty" ? "Choose Difficulty" : "Choose Region"}
            </h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-md text-foreground-muted transition-colors hover:bg-surface-elevated hover:text-foreground"
          >
            <X className="h-4 w-4" strokeWidth={1.5} />
          </button>
        </div>

        {/* Step 1: Difficulty */}
        {step === "difficulty" ? (
          <div className="flex flex-col gap-3">
            <button
              onClick={() => pickDifficulty("easy")}
              className="group cursor-pointer rounded-xl border border-border bg-surface p-4 text-left transition-all duration-150 hover:bg-[#1a1a1a] hover:border-[#333333] active:scale-[0.98]"
            >
              <p className="font-bold text-foreground transition-colors group-hover:text-accent">
                Easy
              </p>
              <p className="mt-1 text-sm text-foreground-muted">
                30 seconds per round
              </p>
              <p className="mt-0.5 text-sm text-foreground-muted">
                Continent hint · Zoomed map
              </p>
            </button>

            <button
              onClick={() => pickDifficulty("hard")}
              className="group cursor-pointer rounded-xl border border-border bg-surface p-4 text-left transition-all duration-150 hover:bg-[#1a1a1a] hover:border-[#333333] active:scale-[0.98]"
            >
              <p className="font-bold text-foreground transition-colors group-hover:text-accent">
                Hard
              </p>
              <p className="mt-1 text-sm text-foreground-muted">
                15 seconds per round
              </p>
              <p className="mt-0.5 text-sm text-foreground-muted">
                No hints · World view
              </p>
            </button>

            <button
              onClick={() => pickDifficulty("survival")}
              className="group cursor-pointer rounded-xl border border-border bg-surface p-4 text-left transition-all duration-150 hover:bg-[#1a1a1a] hover:border-[#333333] active:scale-[0.98]"
            >
              <p className="flex items-center gap-2 font-bold text-foreground transition-colors group-hover:text-accent">
                <Swords className="h-4 w-4" strokeWidth={1.5} /> Survival
              </p>
              <p className="mt-1 text-sm text-foreground-muted">
                3 lives · Progressive difficulty
              </p>
              <p className="mt-0.5 text-sm text-foreground-muted">
                How far can you go?
              </p>
            </button>
          </div>
        ) : (
          /* Step 2: Category */
          <div className="grid grid-cols-2 gap-2">
            {CATEGORY_META.map((cat) => {
              const count = categoryCount(cat.id);
              const Icon = ICON_MAP[cat.icon] ?? Globe;
              return (
                <button
                  key={cat.id}
                  onClick={() => pickCategory(cat.id)}
                  className="group flex cursor-pointer flex-col items-center gap-1.5 rounded-xl border border-border bg-surface p-3 text-center transition-all duration-150 hover:bg-[#1a1a1a] hover:border-[#333333] active:scale-[0.98]"
                >
                  <Icon className="h-6 w-6 text-foreground-muted transition-colors group-hover:text-accent" strokeWidth={1.5} />
                  <p className="text-sm font-bold text-foreground transition-colors group-hover:text-accent">
                    {cat.label}
                  </p>
                  <p className="text-xs text-foreground-muted">
                    {count} {count === 1 ? "country" : "countries"}
                  </p>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
