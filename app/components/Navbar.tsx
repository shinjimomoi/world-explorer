"use client";

import Link from "next/link";
import { useNavbar, type GameNavState } from "@/app/context/navbar";

export default function Navbar() {
  const { state } = useNavbar();
  return state.active ? <GameNavbar s={state} /> : <RegularNavbar />;
}

// ─── Regular navbar ───────────────────────────────────────────────────────────

function RegularNavbar() {
  return (
    <header className="flex h-[52px] shrink-0 items-center justify-between border-b border-border bg-surface px-4 sm:px-6">
      <Link
        href="/"
        className="text-base font-semibold tracking-wide text-foreground transition-colors hover:text-accent-hover"
      >
        World Explorer
      </Link>
      <nav className="flex gap-6 text-sm text-foreground-muted">
        <Link href="/game" className="transition-colors hover:text-foreground">
          Play
        </Link>
        <Link href="/leaderboard" className="transition-colors hover:text-foreground">
          Leaderboard
        </Link>
      </nav>
    </header>
  );
}

// ─── Game navbar ──────────────────────────────────────────────────────────────

function GameNavbar({ s }: { s: GameNavState }) {
  return (
    <header className="relative flex h-[52px] shrink-0 items-center border-b border-border bg-surface px-3 sm:px-4">
      {/* Left: quit + logo */}
      <div className="flex shrink-0 items-center gap-2">
        <button
          onClick={s.onQuit}
          aria-label="Quit game"
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
        <span className="hidden text-sm font-semibold text-foreground sm:block">
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
              <span style={{ color: "#58a6ff" }}>{s.capital}</span>
              {s.hint && ` · ${s.hint}`}
            </span>
          )}
        </p>
      </div>

      {/* Right: streak + round + score */}
      <div className="shrink-0 whitespace-nowrap text-right text-xs text-foreground-muted">
        {s.streak >= 3 && (
          <span className="mr-1.5 font-semibold text-amber-400">🔥{s.streak}</span>
        )}
        <span>
          Round {s.round}/{s.totalRounds} · {s.totalScore.toLocaleString()}
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
