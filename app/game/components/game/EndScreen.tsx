"use client";

import { useState, useRef, useEffect } from "react";
import { Flame, CheckCircle, Camera, RotateCcw } from "lucide-react";
import { SignInButton } from "@clerk/nextjs";
import { saveScore } from "@/lib/leaderboard";
import DifficultyModal from "@/app/components/DifficultyModal";
import ScoreCard from "@/app/components/ScoreCard";
import type { Difficulty, RoundRecord } from "../../types";
import { MAX_POINTS, TOTAL_ROUNDS } from "../../types";
import { sessionRating, ptColor } from "../../utils";
import type { Category } from "@/data/categories";

export default function EndScreen({
  totalScore,
  bestStreak,
  difficulty,
  category,
  rounds,
  onPlayAgain,
  userId,
  userName,
  isGuest,
}: {
  totalScore: number;
  bestStreak: number;
  difficulty: Difficulty;
  category: Category;
  rounds: RoundRecord[];
  onPlayAgain: (difficulty: Difficulty, category: Category) => void;
  userId?: string;
  userName?: string;
  isGuest: boolean;
}) {
  const [showDifficultyModal, setShowDifficultyModal] = useState(false);
  const [name, setName] = useState("");
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const hasSavedRef = useRef(false);

  // Auto-save for signed-in users
  useEffect(() => {
    if (!userId || !userName || hasSavedRef.current) return;
    hasSavedRef.current = true;
    setSaving(true);
    saveScore(userName, totalScore, bestStreak, category, userId)
      .then(() => setSaved(true))
      .catch(() => {
        setSaveError("Failed to save.");
        hasSavedRef.current = false;
      })
      .finally(() => setSaving(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const [instagramStatus, setInstagramStatus] = useState<
    "idle" | "generating" | "saved"
  >("idle");
  const scoreCardRef = useRef<HTMLDivElement>(null);

  const categoryLabel = category === "All World" ? "" : ` (${category})`;
  const shareText =
    `🌍 I scored ${totalScore.toLocaleString()} pts on World Explorer${categoryLabel}! Best streak: ${bestStreak} 🔥 ` +
    `Can you beat me? https://world-explorer-five-liard.vercel.app`;

  function handleTwitter() {
    window.open(
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`,
      "_blank"
    );
  }

  function handleWhatsApp() {
    window.open(
      `https://wa.me/?text=${encodeURIComponent(shareText)}`,
      "_blank"
    );
  }

  async function handleInstagram() {
    setInstagramStatus("generating");
    try {
      const { default: html2canvas } = await import("html2canvas");
      // Briefly reveal off-screen element so html2canvas can paint it
      scoreCardRef.current!.style.visibility = "visible";
      const canvas = await html2canvas(scoreCardRef.current!, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#0f1420",
        logging: false,
      });
      scoreCardRef.current!.style.visibility = "hidden";
      const blob = await new Promise<Blob>((resolve, reject) =>
        canvas.toBlob(
          (b) => (b ? resolve(b) : reject(new Error("toBlob failed"))),
          "image/png"
        )
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "world-explorer-score.png";
      a.click();
      URL.revokeObjectURL(url);
      setInstagramStatus("saved");
      setTimeout(() => setInstagramStatus("idle"), 4000);
    } catch {
      setInstagramStatus("idle");
    }
  }

  const maxScore = MAX_POINTS * TOTAL_ROUNDS;
  const pct = Math.round((totalScore / maxScore) * 100);
  const rating = sessionRating(totalScore);
  const color = pct >= 80 ? "#22c55e" : pct >= 50 ? "#eab308" : "#ef4444";

  async function handleSave() {
    const trimmed = name.trim();
    if (!trimmed) return;
    setSaving(true);
    setSaveError(null);
    try {
      await saveScore(trimmed, totalScore, bestStreak, category, userId);
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
          <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.08em] text-foreground-muted">
            Session Complete
          </p>
          <h1 className="text-3xl font-bold text-foreground sm:text-4xl">
            {rating}
          </h1>
        </div>

        {/* Score card */}
        <div className="mb-4 rounded-xl border border-border bg-surface p-4 sm:mb-6 sm:p-5">
          <div className="mb-4 flex items-center justify-between gap-4">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-foreground-muted">
                Total Score
              </p>
              <p
                className="font-mono text-4xl font-bold tabular-nums sm:text-5xl"
                style={{ color }}
              >
                {totalScore.toLocaleString()}
              </p>
              <p className="mt-1 text-sm text-foreground-muted">
                out of {maxScore.toLocaleString()}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-foreground-muted">
                Best Streak
              </p>
              <p className="mt-1 font-mono text-3xl font-bold text-accent sm:text-4xl">
                {bestStreak > 0 ? (
                  <span className="inline-flex items-center gap-1">
                    <Flame className="h-6 w-6" strokeWidth={1.5} /> {bestStreak}
                  </span>
                ) : "—"}
              </p>
            </div>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#1a1a1a]">
            <div
              className="h-full rounded-full transition-[width] duration-1000"
              style={{ width: `${pct}%`, backgroundColor: color }}
            />
          </div>
        </div>

        {/* Save to leaderboard */}
        <div className="mb-4 rounded-xl border border-border bg-surface p-4 sm:mb-6 sm:p-5">
          {saved ? (
            <div className="flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-accent" strokeWidth={1.5} />
              <div>
                <p className="text-sm font-semibold text-foreground">
                  Score saved!
                </p>
                <a
                  href={`/leaderboard?category=${difficulty === "daily" ? "Daily" : category === "All World" ? "All" : category}`}
                  className="text-xs text-accent transition-colors hover:text-accent-hover"
                >
                  View leaderboard →
                </a>
              </div>
            </div>
          ) : saving && userId ? (
            <div className="flex items-center gap-3">
              <div
                className="h-4 w-4 shrink-0 rounded-full border-2 border-[#333333] border-t-accent"
                style={{ animation: "spin 0.6s linear infinite" }}
              />
              <p className="text-sm text-foreground-muted">Saving score…</p>
              <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
            </div>
          ) : (
            <>
              <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.08em] text-foreground-muted">
                Save to Leaderboard
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Your name"
                  maxLength={24}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSave()}
                  disabled={saving}
                  className="min-w-0 flex-1 rounded-md border border-border bg-surface-elevated px-3 py-2 text-sm text-foreground placeholder:text-foreground-muted focus:border-accent focus:outline-none disabled:opacity-50"
                />
                <button
                  onClick={handleSave}
                  disabled={!name.trim() || saving}
                  className="cursor-pointer rounded-lg bg-[#f0f0f0] px-4 py-2 text-sm font-semibold text-[#0a0a0a] transition-all duration-150 hover:bg-[#e5e5e5] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {saving ? "Saving…" : "Save"}
                </button>
              </div>
              {saveError && (
                <p className="mt-2 text-xs text-red-400">{saveError}</p>
              )}
            </>
          )}
        </div>

        {/* Sign-in nudge for guests */}
        {isGuest && (
          <div className="mb-4 rounded-xl border border-[#222222] bg-[#111111] p-4 sm:mb-6">
            <p className="text-[13px] text-[#666666]">
              {bestStreak >= 3
                ? `You finished with a ${bestStreak} streak! Sign in to save your progress and track your best streaks.`
                : "Sign in with Google to track your progress, unlock mastery mode and save scores automatically."}
            </p>
            <SignInButton mode="modal">
              <button className="mt-2 cursor-pointer text-[13px] font-semibold text-accent transition-all duration-150 hover:text-accent-hover">
                Sign in with Google
              </button>
            </SignInButton>
          </div>
        )}

        {/* Round breakdown */}
        <div className="mb-4 overflow-hidden rounded-xl border border-border bg-surface sm:mb-6">
          <div className="border-b border-border px-4 py-3">
            <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-foreground-muted">
              Round Breakdown
            </p>
          </div>
          <div className="divide-y divide-border">
            {rounds.map((r) => {
              const rColor = ptColor(r.points);
              const rPct = (r.points / MAX_POINTS) * 100;
              return (
                <div
                  key={r.round}
                  className="flex items-center gap-3 px-4 py-2.5 sm:py-3"
                >
                  <span className="w-6 shrink-0 text-center text-xs font-medium text-foreground-muted">
                    {r.round}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-foreground">
                      {r.country.name}
                    </p>
                    <p className="truncate text-xs text-foreground-muted">
                      {r.timedOut
                        ? `Timed out · ${r.country.capital}`
                        : r.distanceKm !== null
                        ? `${Math.round(
                            r.distanceKm
                          ).toLocaleString()} km from ${r.country.capital}`
                        : r.country.capital}
                    </p>
                  </div>
                  <div className="hidden w-16 sm:block">
                    <div className="h-1.5 overflow-hidden rounded-full bg-surface-elevated">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${rPct}%`, backgroundColor: rColor }}
                      />
                    </div>
                  </div>
                  <span
                    className="w-16 shrink-0 text-right text-sm font-bold tabular-nums"
                    style={{ color: rColor }}
                  >
                    {r.timedOut ? "0" : `+${r.points}`}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Social share buttons */}
        <div className="mb-4 sm:mb-6">
          <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.08em] text-foreground-muted">
            Share your score
          </p>
          <div className="grid grid-cols-3 gap-2">
            {/* X / Twitter */}
            <button
              onClick={handleTwitter}
              className="cursor-pointer inline-flex h-10 items-center justify-center gap-1.5 rounded-lg border border-[#333333] text-foreground transition-all duration-150 hover:bg-[#1a1a1a] hover:border-[#555555] active:scale-[0.98]"
            >
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
              <span className="text-[11px] font-medium">X</span>
            </button>

            {/* WhatsApp */}
            <button
              onClick={handleWhatsApp}
              className="cursor-pointer inline-flex h-10 items-center justify-center gap-1.5 rounded-lg border border-[#333333] text-foreground transition-all duration-150 hover:bg-[#1a1a1a] hover:border-[#555555] active:scale-[0.98]"
            >
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
              <span className="text-[11px] font-medium">WhatsApp</span>
            </button>

            {/* Instagram */}
            <button
              onClick={handleInstagram}
              disabled={instagramStatus === "generating"}
              className="cursor-pointer inline-flex h-10 items-center justify-center gap-1.5 rounded-lg border border-[#333333] text-foreground transition-all duration-150 hover:bg-[#1a1a1a] hover:border-[#555555] active:scale-[0.98] disabled:opacity-50"
            >
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
              </svg>
              <span className="text-[11px] font-medium">
                {instagramStatus === "generating" ? "Saving…" : "Instagram"}
              </span>
            </button>
          </div>

          {instagramStatus === "saved" && (
            <p className="mt-2 text-center text-xs text-foreground-muted">
              <span className="inline-flex items-center gap-1"><Camera className="h-3.5 w-3.5" strokeWidth={1.5} /> Image saved! Open Instagram and share from your camera roll.</span>
            </p>
          )}
        </div>

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

        {/* Hidden score card captured by html2canvas */}
        <ScoreCard
          ref={scoreCardRef}
          totalScore={totalScore}
          bestStreak={bestStreak}
          difficulty={difficulty}
          category={category}
          rating={rating}
          maxScore={maxScore}
        />
      </div>
    </div>
  );
}
