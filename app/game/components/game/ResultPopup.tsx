import { Flame } from "lucide-react";
import type { GuessResult } from "../../types";
import { TOTAL_ROUNDS, RESULT_MS } from "../../types";
import { ptColor, streakMultiplier } from "../../utils";

const MAX_DISTANCE = 5000;

function distanceColor(km: number): string {
  if (km <= 500) return "#4ade80";
  if (km <= 1000) return "#EF9F27";
  return "#f87171";
}

export default function ResultPopup({
  result,
  round,
  newStreak,
  countdown,
  onAdvance,
  isSurvival,
}: {
  result: GuessResult;
  round: number;
  newStreak: number;
  countdown: number;
  onAdvance: () => void;
  isSurvival?: boolean;
}) {
  const isLastRound = !isSurvival && round >= TOTAL_ROUNDS;
  const color = ptColor(result.points);
  const { label: streakLabel } = streakMultiplier(newStreak);
  const distKm = result.distanceKm !== null ? Math.round(result.distanceKm) : null;

  const headline = result.timedOut
    ? "Time's up"
    : distKm !== null && distKm <= 200
    ? "Outstanding!"
    : distKm !== null && distKm <= 500
    ? "Great shot!"
    : distKm !== null && distKm <= 1000
    ? "Not bad!"
    : "Keep exploring";
  const distPct = distKm !== null ? Math.min(100, (distKm / MAX_DISTANCE) * 100) : 0;
  const dColor = distKm !== null ? distanceColor(distKm) : "#666";

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10">
      <div
        className="pointer-events-auto border-t border-[#222222]"
        style={{
          background: "rgba(10, 10, 10, 0.95)",
          backdropFilter: "blur(20px)",
          animation: "sheetSlideUp 250ms ease-out both",
          padding: "20px 24px",
          minHeight: 180,
        }}
      >
        {/* ── Row 1: headline + streak ── */}
        <div className="mb-5 flex items-center justify-between">
          <p
            className="text-lg font-bold"
            style={{ color: result.timedOut ? "#f87171" : color }}
          >
            {headline}
          </p>
          {newStreak >= 1 && (
            <span
              key={streakLabel || String(newStreak)}
              className="inline-flex items-center gap-1 rounded-full bg-accent/15 px-2.5 py-1 font-mono text-xs font-semibold text-accent"
              style={
                newStreak >= 3
                  ? { animation: "popIn 0.42s cubic-bezier(0.34,1.56,0.64,1) both" }
                  : undefined
              }
            >
              <Flame className="h-3 w-3" strokeWidth={1.5} /> {newStreak}
              {streakLabel ? ` · ${streakLabel}` : ""}
            </span>
          )}
        </div>

        {/* ── Row 2: distance + points ── */}
        {!result.timedOut ? (
          <div className="mb-5 flex items-start gap-6">
            {/* Distance */}
            <div className="flex-1">
              <p className="font-mono text-[28px] font-bold leading-none text-foreground">
                {distKm !== null ? `${distKm.toLocaleString()} km` : "—"}
              </p>
              <p className="mt-1.5 text-[13px] text-[#666666]">
                from {result.country.capital}
              </p>
            </div>

            {/* Divider */}
            <div className="h-14 w-px shrink-0 bg-[#222222]" />

            {/* Points */}
            <div className="text-right">
              <p className="font-mono text-[28px] font-bold leading-none" style={{ color }}>
                +{result.points.toLocaleString()}
              </p>
              {result.multiplier > 1.0 && (
                <p className="mt-1.5 font-mono text-[13px] text-[#666666]">
                  {result.basePoints.toLocaleString()} × {result.multiplier}×
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="mb-5">
            <p className="text-[13px] text-[#666666]">
              Capital of {result.country.name} is{" "}
              <span className="font-semibold text-accent">{result.country.capital}</span>
            </p>
            <p className="mt-2 font-mono text-[28px] font-bold leading-none text-[#f87171]">
              +0
            </p>
          </div>
        )}

        {/* ── Row 3: distance bar + next button ── */}
        <div className="flex items-center gap-4">
          {/* Distance scale bar */}
          {!result.timedOut && distKm !== null ? (
            <div className="h-1 flex-1 overflow-hidden rounded-sm bg-[#222222]">
              <div
                className="h-full rounded-sm transition-[width] duration-700"
                style={{ width: `${Math.max(distPct, 0.5)}%`, backgroundColor: dColor }}
              />
            </div>
          ) : (
            <div className="flex-1" />
          )}

          <div className="flex shrink-0 items-center gap-3">
            <span className="font-mono text-xs text-[#444444]">{countdown}s</span>
            <button
              onClick={onAdvance}
              className="cursor-pointer rounded-lg bg-[#f0f0f0] px-4 py-2 text-xs font-semibold text-[#0a0a0a] transition-all duration-150 hover:bg-[#e5e5e5] active:scale-[0.98]"
            >
              {isLastRound ? "See results →" : "Next →"}
            </button>
          </div>
        </div>

        {/* Auto-advance progress bar */}
        <div className="mt-4 h-0.5 overflow-hidden rounded-full bg-[#1a1a1a]">
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
