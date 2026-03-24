"use client";

import { useState, useRef, useEffect } from "react";
import { Flame, CheckCircle, RotateCcw, Skull } from "lucide-react";
import { SignInButton } from "@clerk/nextjs";
import { saveScore } from "@/lib/leaderboard";
import DifficultyModal from "@/app/components/DifficultyModal";
import type { Difficulty, RoundRecord } from "../../types";
import { ptColor } from "../../utils";
import type { Category } from "@/data/categories";

export default function SurvivalGameOver({
  totalScore,
  bestStreak,
  roundsSurvived,
  rounds,
  onPlayAgain,
  userId,
  userName,
  isGuest,
}: {
  totalScore: number;
  bestStreak: number;
  roundsSurvived: number;
  rounds: RoundRecord[];
  onPlayAgain: (difficulty: Difficulty, category: Category) => void;
  userId?: string;
  userName?: string;
  isGuest: boolean;
}) {
  const [showDifficultyModal, setShowDifficultyModal] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const hasSavedRef = useRef(false);

  const tierReached = roundsSurvived >= 21 ? "Hard" : roundsSurvived >= 11 ? "Medium" : "Easy";
  const bestRoundScore = rounds.length > 0 ? Math.max(...rounds.map((r) => r.points)) : 0;

  // Auto-save for signed-in users
  useEffect(() => {
    if (!userId || !userName || hasSavedRef.current) return;
    hasSavedRef.current = true;
    setSaving(true);
    saveScore(userName, totalScore, bestStreak, "Survival", userId)
      .then(() => setSaved(true))
      .catch(() => {
        setSaveError("Failed to save.");
        hasSavedRef.current = false;
      })
      .finally(() => setSaving(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSave() {
    const trimmed = name.trim();
    if (!trimmed) return;
    setSaving(true);
    setSaveError(null);
    try {
      await saveScore(trimmed, totalScore, bestStreak, "Survival", userId);
      setSaved(true);
    } catch {
      setSaveError("Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-1 flex-col overflow-y-auto">
      <div className="mx-auto w-full max-w-xl px-4 py-6 sm:py-8">
        {/* Hero */}
        <div className="mb-6 text-center sm:mb-8">
          <Skull className="mx-auto mb-3 h-10 w-10 text-[#f87171]" strokeWidth={1.5} />
          <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.08em] text-foreground-muted">
            Game Over
          </p>
          <h1 className="text-3xl font-bold text-foreground sm:text-4xl">
            You survived {roundsSurvived} rounds
          </h1>
        </div>

        {/* Stats */}
        <div className="mb-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <div className="rounded-xl border border-border bg-surface p-3 text-center">
            <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-foreground-muted">Score</p>
            <p className="mt-1 font-mono text-xl font-bold text-accent">{totalScore.toLocaleString()}</p>
          </div>
          <div className="rounded-xl border border-border bg-surface p-3 text-center">
            <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-foreground-muted">Best Round</p>
            <p className="mt-1 font-mono text-xl font-bold text-foreground">{bestRoundScore.toLocaleString()}</p>
          </div>
          <div className="rounded-xl border border-border bg-surface p-3 text-center">
            <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-foreground-muted">Streak</p>
            <p className="mt-1 font-mono text-xl font-bold text-foreground">
              <span className="inline-flex items-center gap-1">
                <Flame className="h-4 w-4 text-accent" strokeWidth={1.5} /> {bestStreak}
              </span>
            </p>
          </div>
          <div className="rounded-xl border border-border bg-surface p-3 text-center">
            <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-foreground-muted">Tier</p>
            <p className="mt-1 text-xl font-bold text-foreground">{tierReached}</p>
          </div>
        </div>

        {/* Save to leaderboard */}
        <div className="mb-4 rounded-xl border border-border bg-surface p-4 sm:mb-6 sm:p-5">
          {saved ? (
            <div className="flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-accent" strokeWidth={1.5} />
              <div>
                <p className="text-sm font-semibold text-foreground">Score saved!</p>
                <a href="/leaderboard?category=Survival" className="text-xs text-accent transition-colors hover:text-accent-hover">
                  View leaderboard →
                </a>
              </div>
            </div>
          ) : saving && userId ? (
            <div className="flex items-center gap-3">
              <div className="h-4 w-4 shrink-0 rounded-full border-2 border-[#333333] border-t-accent" style={{ animation: "spin 0.6s linear infinite" }} />
              <p className="text-sm text-foreground-muted">Saving score…</p>
              <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
            </div>
          ) : (
            <>
              <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.08em] text-foreground-muted">Save to Leaderboard</p>
              <div className="flex gap-2">
                <input type="text" placeholder="Your name" maxLength={24} value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSave()} disabled={saving} className="min-w-0 flex-1 rounded-md border border-border bg-surface-elevated px-3 py-2 text-sm text-foreground placeholder:text-foreground-muted focus:border-accent focus:outline-none disabled:opacity-50" />
                <button onClick={handleSave} disabled={!name.trim() || saving} className="cursor-pointer rounded-lg bg-[#f0f0f0] px-4 py-2 text-sm font-semibold text-[#0a0a0a] transition-all duration-150 hover:bg-[#e5e5e5] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40">
                  {saving ? "Saving…" : "Save"}
                </button>
              </div>
              {saveError && <p className="mt-2 text-xs text-red-400">{saveError}</p>}
            </>
          )}
        </div>

        {/* Sign-in nudge for guests */}
        {isGuest && (
          <div className="mb-4 rounded-xl border border-[#222222] bg-[#111111] p-4 sm:mb-6">
            <p className="text-[13px] text-[#666666]">
              You survived {roundsSurvived} rounds! Sign in to save your progress and track your survival records.
            </p>
            <SignInButton mode="modal">
              <button className="mt-2 cursor-pointer text-[13px] font-semibold text-accent transition-all duration-150 hover:text-accent-hover">
                Sign in with Google
              </button>
            </SignInButton>
          </div>
        )}

        {/* Play Again */}
        <button
          onClick={() => setShowDifficultyModal(true)}
          className="w-full cursor-pointer inline-flex items-center justify-center gap-2 rounded-lg border border-[#333333] py-3 text-sm font-semibold text-foreground transition-all duration-150 hover:bg-[#1a1a1a] hover:border-[#555555] active:scale-[0.98]"
        >
          <RotateCcw className="h-4 w-4" strokeWidth={1.5} /> Play Again
        </button>

        {showDifficultyModal && (
          <DifficultyModal
            onSelect={(d, c) => {
              setShowDifficultyModal(false);
              onPlayAgain(d, c);
            }}
            onClose={() => setShowDifficultyModal(false)}
          />
        )}
      </div>
    </div>
  );
}
