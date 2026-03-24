import { Flame } from "lucide-react";
import type { GuessResult } from "../../types";
import { TOTAL_ROUNDS, MAX_POINTS, RESULT_MS } from "../../types";
import { ptColor, streakMultiplier } from "../../utils";

export default function ResultPopup({
  result,
  round,
  newStreak,
  countdown,
  onAdvance,
}: {
  result: GuessResult;
  round: number;
  newStreak: number;
  countdown: number;
  onAdvance: () => void;
}) {
  const isLastRound = round >= TOTAL_ROUNDS;
  const color = ptColor(result.points);
  const pct = Math.min(100, Math.round((result.points / MAX_POINTS) * 100));
  const { label: streakLabel } = streakMultiplier(newStreak);

  const headline = result.timedOut
    ? "Time's up"
    : result.basePoints >= 900
    ? "Outstanding"
    : result.basePoints >= 700
    ? "Great shot"
    : result.basePoints >= 500
    ? "Not bad"
    : "Keep exploring";

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10">
      <div
        className="pointer-events-auto rounded-t-2xl border-t border-x border-[#222222] px-4 py-3"
        style={{
          background: "rgba(17, 17, 17, 0.92)",
          backdropFilter: "blur(20px)",
          animation: "slideUp 300ms ease-out both",
        }}
      >
        {/* Row 1: headline + streak badge */}
        <div className="mb-2 flex items-center justify-between">
          <p
            className="text-base font-bold"
            style={{ color: result.timedOut ? "#f87171" : color }}
          >
            {headline}
          </p>
          {newStreak >= 1 && (
            <span
              key={streakLabel || String(newStreak)}
              className="inline-flex items-center gap-1 rounded-full bg-accent/15 px-2 py-0.5 font-mono text-xs font-semibold text-accent"
              style={
                newStreak >= 3
                  ? {
                      animation:
                        "popIn 0.42s cubic-bezier(0.34,1.56,0.64,1) both",
                    }
                  : undefined
              }
            >
              <Flame className="h-3 w-3" strokeWidth={1.5} /> {newStreak}
              {streakLabel ? ` · ${streakLabel}` : ""}
            </span>
          )}
        </div>

        {/* Row 2: distance · points · score bar */}
        <div className="mb-2 flex items-center gap-3">
          <span className="font-mono text-sm text-[#666666]">
            {result.timedOut || result.distanceKm === null
              ? "—"
              : `${Math.round(result.distanceKm).toLocaleString()} km`}
          </span>
          <div className="flex-1 h-1.5 overflow-hidden rounded-full bg-[#1a1a1a]">
            <div
              className="h-full rounded-full transition-[width] duration-700"
              style={{ width: `${pct}%`, backgroundColor: color }}
            />
          </div>
          <div className="shrink-0 text-right">
            {result.multiplier > 1.0 && !result.timedOut && (
              <div className="mb-0.5 font-mono text-xs leading-none text-[#666666] tabular-nums">
                {result.basePoints.toLocaleString()} × {result.multiplier}×
              </div>
            )}
            <span className="font-mono text-xl font-bold tabular-nums" style={{ color }}>
              +{result.points.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Row 3: pin legend or timeout message */}
        {!result.timedOut ? (
          <div className="mb-2 flex gap-4 text-xs text-[#666666]">
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2 w-2 rounded-full bg-[#4ade80]" />
              {result.country.capital}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2 w-2 rounded-full bg-[#f87171]" />
              Your guess
            </span>
          </div>
        ) : (
          <p className="mb-2 text-xs text-[#666666]">
            Capital of {result.country.name} is{" "}
            <span className="font-semibold text-accent">
              {result.country.capital}
            </span>
            .
          </p>
        )}

        {/* Row 4: countdown + next button */}
        <div className="flex items-center justify-between">
          <p className="text-xs text-[#444444]">
            {isLastRound ? "Results in " : "Next in "}
            <span className="font-semibold text-[#888888]">{countdown}</span>…
          </p>
          <button
            onClick={onAdvance}
            className="cursor-pointer rounded-lg bg-[#f0f0f0] px-3 py-1.5 text-xs font-semibold text-[#0a0a0a] transition-all duration-150 hover:bg-[#e5e5e5] active:scale-[0.98]"
          >
            {isLastRound ? "See results →" : "Next →"}
          </button>
        </div>

        {/* Auto-advance progress */}
        <div className="mt-2 h-0.5 overflow-hidden rounded-full bg-[#1a1a1a]">
          <div
            key={`${result.country.numericCode}-${result.guessLat}-${result.guessLng}`}
            className="h-full rounded-full bg-accent"
            style={{ animation: `shrink ${RESULT_MS}ms linear forwards` }}
          />
        </div>
      </div>
    </div>
  );
}
