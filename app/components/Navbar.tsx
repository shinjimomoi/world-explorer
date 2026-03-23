"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useNavbar, type GameNavState } from "@/app/context/navbar";
import DifficultyModal from "./DifficultyModal";
import type { Difficulty } from "@/app/game/WorldMap";
import type { Category } from "@/data/categories";
import { X, Flame } from "lucide-react";

export default function Navbar() {
  const { state } = useNavbar();
  return state.active ? <GameNavbar s={state} /> : <RegularNavbar />;
}

// ─── Regular navbar ───────────────────────────────────────────────────────────

function RegularNavbar() {
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);

  function handleSelect(difficulty: Difficulty, category: Category) {
    setShowModal(false);
    router.push(`/game?difficulty=${difficulty}&category=${category}`);
  }

  return (
    <>
      <header className="flex h-12 shrink-0 items-center justify-between border-b border-border bg-surface px-4 sm:px-6">
        <Link
          href="/"
          className="text-base font-semibold tracking-tight text-foreground transition-colors hover:text-accent"
        >
          World Explorer
        </Link>
        <nav className="flex gap-6 text-sm text-foreground-muted">
          <button
            onClick={() => setShowModal(true)}
            className="cursor-pointer transition-all duration-150 hover:text-foreground"
          >
            Play
          </button>
          <Link href="/leaderboard" className="transition-all duration-150 hover:text-foreground">
            Leaderboard
          </Link>
        </nav>
      </header>
      {showModal && (
        <DifficultyModal onSelect={handleSelect} onClose={() => setShowModal(false)} />
      )}
    </>
  );
}

// ─── Game navbar ──────────────────────────────────────────────────────────────

function GameNavbar({ s }: { s: GameNavState }) {
  return (
    <header className="relative flex h-12 shrink-0 items-center border-b border-border bg-surface px-3 sm:px-4">
      {/* Left: quit + logo */}
      <div className="flex shrink-0 items-center gap-2">
        <button
          onClick={s.onQuit}
          aria-label="Quit game"
          className="flex h-8 w-8 items-center justify-center rounded-md text-foreground-muted transition-colors hover:bg-surface-elevated hover:text-foreground"
        >
          <X className="h-4 w-4" strokeWidth={1.5} />
        </button>
        <span className="hidden text-base font-semibold tracking-tight text-foreground sm:block">
          World Explorer
        </span>
      </div>

      {/* Center: country + hint */}
      <div className="min-w-0 flex-1 px-2 text-center">
        <p className="truncate text-sm leading-tight">
          <span className="font-semibold text-foreground">{s.countryName}</span>
          {!s.isResult && (
            <span className="text-foreground-muted">
              {" · Find "}
              <span className="text-accent">{s.capital}</span>
              {s.hint && ` · ${s.hint}`}
            </span>
          )}
        </p>
      </div>

      {/* Right: streak + round + score */}
      <div className="shrink-0 whitespace-nowrap text-right font-mono text-xs text-foreground-muted">
        {s.streak >= 3 && (
          <span className="mr-1.5 inline-flex items-center gap-0.5 font-semibold text-accent">
            <Flame className="h-3 w-3" strokeWidth={1.5} />{s.streak}
          </span>
        )}
        <span>
          R{s.round}/{s.totalRounds} · {s.totalScore.toLocaleString()}
        </span>
      </div>

      {/* Timer bar pinned to bottom edge */}
      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-surface-elevated">
        <div
          style={{
            height: "100%",
            width: `${s.timerPct}%`,
            backgroundColor: s.timerColor,
            transition: s.isResult
              ? "none"
              : "width 1s linear, background-color 0.5s",
          }}
        />
      </div>
    </header>
  );
}
