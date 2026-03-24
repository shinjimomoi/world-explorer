import { Flame } from "lucide-react";
import type { GuessResult } from "../../types";
import { TOTAL_ROUNDS, MAX_POINTS, RESULT_MS } from "../../types";
import { ptColor, streakMultiplier } from "../../utils";

const MAX_DISTANCE = 20000;

function distanceColor(km: number): string {
  if (km < 500) return "#4ade80";
  if (km < 2000) return "#fbbf24";
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

  const headline = result.timedOut
    ? "Time's up"
    : result.basePoints >= 900
    ? "Outstanding"
    : result.basePoints >= 700
    ? "Great shot"
    : result.basePoints >= 500
    ? "Not bad"
    : "Keep exploring";

  const distKm = result.distanceKm !== null ? Math.round(result.distanceKm) : null;
  const distPct = distKm !== null ? Math.min(100, (distKm / MAX_DISTANCE) * 100) : 0;
  const dColor = distKm !== null ? distanceColor(distKm) : "#666";

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10">
      <div
        className="pointer-events-auto border-t border-[#222222] px-5 py-5"
        style={{
          background: "rgba(10, 10, 10, 0.95)",
          backdropFilter: "blur(20px)",
          animation: "sheetSlideUp 250ms ease-out both",
        }}
      >
        {/* ── Row 1: headline + streak ── */}
        <div className="mb-4 flex items-center justify-between">
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
          <div className="mb-4 flex items-start gap-6">
            {/* Distance */}
            <div className="flex-1">
              <p className="font-mono text-[28px] font-bold leading-none text-foreground">
                {distKm !== null ? `${distKm.toLocaleString()} km` : "—"}
              </p>
              <p className="mt-1 text-sm text-[#666666]">
                from {result.country.capital}
              </p>
            </div>

            {/* Divider */}
            <div className="h-12 w-px shrink-0 bg-[#222222]" />

            {/* Points */}
            <div className="text-right">
              <p className="font-mono text-[28px] font-bold leading-none" style={{ color }}>
                +{result.points.toLocaleString()}
              </p>
              {result.multiplier > 1.0 && (
                <p className="mt-1 font-mono text-[13px] text-[#666666]">
                  {result.basePoints.toLocaleString()} × {result.multiplier}×
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="mb-4">
            <p className="text-sm text-[#666666]">
              Capital of {result.country.name} is{" "}
              <span className="font-semibold text-accent">{result.country.capital}</span>
            </p>
            <p className="mt-2 font-mono text-[28px] font-bold leading-none text-[#f87171]">
              +0
            </p>
          </div>
        )}

        {/* ── Distance scale bar ── */}
        {!result.timedOut && distKm !== null && (
          <div className="mb-4">
            <div className="relative h-1.5 overflow-hidden rounded-full bg-[#1a1a1a]">
              <div
                className="absolute left-0 top-0 h-full rounded-full transition-[width] duration-700"
                style={{ width: `${Math.max(distPct, 0.5)}%`, backgroundColor: dColor }}
              />
              <div
                className="absolute top-1/2 -translate-y-1/2 h-3 w-3 rounded-full border-2 border-[#0a0a0a]"
                style={{
                  left: `${Math.min(distPct, 97)}%`,
                  backgroundColor: dColor,
                  transition: "left 700ms ease",
                }}
              />
            </div>
            <div className="mt-1 flex justify-between text-[10px] text-[#444444]">
              <span>0 km</span>
              <span>20,000 km</span>
            </div>
          </div>
        )}

        {/* ── Bottom row: legend + countdown + next ── */}
        <div className="flex items-center justify-between">
          {!result.timedOut ? (
            <div className="flex gap-4 text-xs text-[#666666]">
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
            <div />
          )}

          <div className="flex items-center gap-3">
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
        <div className="mt-3 h-0.5 overflow-hidden rounded-full bg-[#1a1a1a]">
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
