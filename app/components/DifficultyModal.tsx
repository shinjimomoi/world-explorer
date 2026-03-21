"use client";

import type { Difficulty } from "@/app/game/WorldMap";

export default function DifficultyModal({
  onSelect,
  onClose,
}: {
  onSelect: (difficulty: Difficulty) => void;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-xl border border-border bg-surface p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-bold text-foreground">Choose Difficulty</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-md text-foreground-muted transition-colors hover:bg-surface-elevated hover:text-foreground"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 16 16"
              className="h-3.5 w-3.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
            >
              <line x1="2" y1="2" x2="14" y2="14" />
              <line x1="14" y1="2" x2="2" y2="14" />
            </svg>
          </button>
        </div>

        {/* Options */}
        <div className="flex flex-col gap-3">
          <button
            onClick={() => onSelect("easy")}
            className="group rounded-xl border border-border bg-surface-elevated p-4 text-left transition-colors hover:border-accent"
          >
            <p className="font-bold text-foreground transition-colors group-hover:text-accent">
              Easy
            </p>
            <p className="mt-1 text-sm text-foreground-muted">30 seconds per round</p>
            <p className="mt-0.5 text-sm text-foreground-muted">Continent hint · Zoomed map</p>
          </button>

          <button
            onClick={() => onSelect("hard")}
            className="group rounded-xl border border-border bg-surface-elevated p-4 text-left transition-colors hover:border-accent"
          >
            <p className="font-bold text-foreground transition-colors group-hover:text-accent">
              Hard
            </p>
            <p className="mt-1 text-sm text-foreground-muted">15 seconds per round</p>
            <p className="mt-0.5 text-sm text-foreground-muted">No hints · World view</p>
          </button>
        </div>
      </div>
    </div>
  );
}
