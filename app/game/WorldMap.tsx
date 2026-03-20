"use client";

import { useState, useCallback, memo, useRef, useEffect, useMemo } from "react";
import {
  ComposableMap,
  Geographies,
  Geography,
  Marker,
  Line,
  useMapContext,
} from "react-simple-maps";
import { countries, countriesByNumericCode, type Country } from "@/data/countries";
import { saveEntry } from "@/lib/leaderboard";

// ─── constants ────────────────────────────────────────────────────────────────

const GEO_URL = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";
const TOTAL_ROUNDS = 10;
const MAX_POINTS = 1000;
const STREAK_THRESHOLD = 500;
const RESULT_MS = 3000;
const DEFAULT_PROJECTION: { scale: number; center: [number, number] } = {
  scale: 160,
  center: [0, 10],
};

// ─── types ────────────────────────────────────────────────────────────────────

export type Difficulty = "easy" | "hard";

interface ClickInfo {
  lat: number;
  lng: number;
  country: Country | null;
}

interface GuessResult {
  guessLat: number | null;
  guessLng: number | null;
  country: Country;
  distanceKm: number | null;
  points: number;
  timedOut: boolean;
}

interface RoundRecord {
  round: number;
  country: Country;
  points: number;
  distanceKm: number | null;
  timedOut: boolean;
}

type GamePhase = "playing" | "ended";

interface D3Projection {
  invert(point: [number, number]): [number, number] | null;
}

// ─── pure helpers ─────────────────────────────────────────────────────────────

function haversineKm(
  lat1: number, lng1: number,
  lat2: number, lng2: number,
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function shuffled(): Country[] {
  return [...countries].sort(() => Math.random() - 0.5);
}

function toSVGCoords(e: React.MouseEvent, svg: SVGSVGElement): DOMPoint {
  const pt = svg.createSVGPoint();
  pt.x = e.clientX;
  pt.y = e.clientY;
  return pt.matrixTransform(svg.getScreenCTM()!.inverse());
}

function sessionRating(score: number): string {
  const max = MAX_POINTS * TOTAL_ROUNDS;
  const pct = score / max;
  if (pct >= 0.9) return "Geography Master";
  if (pct >= 0.7) return "Expert Explorer";
  if (pct >= 0.5) return "Seasoned Traveller";
  if (pct >= 0.3) return "Emerging Geographer";
  return "Keep Exploring!";
}

/** green ≥800 · yellow ≥500 · red <500 */
function ptColor(points: number): string {
  if (points >= 800) return "#22c55e";
  if (points >= 500) return "#eab308";
  return "#ef4444";
}

function getZoomConfig(
  capitalLat: number,
  capitalLng: number,
): { scale: number; center: [number, number]; region: string } {
  // Europe (lng −25→45, lat 35→72)
  if (capitalLng >= -25 && capitalLng <= 45 && capitalLat >= 35 && capitalLat <= 72)
    return { scale: 520, center: [15, 52], region: "Europe" };
  // Africa (lng −20→55, lat −36→38)
  if (capitalLng >= -20 && capitalLng <= 55 && capitalLat >= -36 && capitalLat <= 38)
    return { scale: 330, center: [22, 2], region: "Africa" };
  // Asia (remaining eastern hemisphere above −10 lat)
  if (capitalLng >= 25 && capitalLng <= 180 && capitalLat >= -10 && capitalLat <= 75)
    return { scale: 270, center: [90, 35], region: "Asia" };
  // North America (lng −170→−50, lat > 7)
  if (capitalLng >= -170 && capitalLng <= -50 && capitalLat >= 7)
    return { scale: 300, center: [-95, 45], region: "North America" };
  // South America
  if (capitalLng >= -85 && capitalLng <= -32 && capitalLat <= 15)
    return { scale: 330, center: [-58, -15], region: "South America" };
  // Oceania
  if (capitalLng >= 110 && capitalLat <= 5)
    return { scale: 390, center: [145, -25], region: "Oceania" };
  return { scale: 160, center: [0, 10], region: "" };
}

// ─── OceanClickLayer ──────────────────────────────────────────────────────────

function OceanClickLayer({
  onClick,
  disabled,
}: {
  onClick: (info: ClickInfo) => void;
  disabled: boolean;
}) {
  const { projection } = useMapContext() as { projection: D3Projection };

  return (
    <rect
      width={960}
      height={500}
      fill="transparent"
      style={{ cursor: disabled ? "default" : "crosshair" }}
      onClick={(e: React.MouseEvent<SVGRectElement>) => {
        if (disabled) return;
        const svg = e.currentTarget.closest("svg") as SVGSVGElement | null;
        if (!svg) return;
        const { x, y } = toSVGCoords(e, svg);
        const coords = projection.invert([x, y]);
        if (!coords) return;
        onClick({ lng: +coords[0].toFixed(4), lat: +coords[1].toFixed(4), country: null });
      }}
    />
  );
}

// ─── MapCanvas ────────────────────────────────────────────────────────────────
// memo'd — only re-renders when result or projectionConfig changes.

interface MapCanvasProps {
  onClick: (info: ClickInfo) => void;
  result: GuessResult | null;
  projectionConfig: { scale: number; center: [number, number] };
}

const MapCanvas = memo(function MapCanvas({ onClick, result, projectionConfig }: MapCanvasProps) {
  const disabled = result !== null;

  return (
    <ComposableMap
      projection="geoEqualEarth"
      projectionConfig={projectionConfig}
      width={960}
      height={500}
      style={{ width: "100%", height: "auto", display: "block", cursor: disabled ? "default" : "crosshair" }}
    >
      <OceanClickLayer onClick={onClick} disabled={disabled} />

      <Geographies geography={GEO_URL}>
        {({ geographies, projection }: any) =>
          geographies.map((geo: any) => (
            <Geography
              key={geo.rsmKey}
              geography={geo}
              onClick={(e: React.MouseEvent<SVGPathElement>) => {
                if (disabled) return;
                const svg = (e.currentTarget as Element).closest("svg") as SVGSVGElement | null;
                if (!svg) return;
                const { x, y } = toSVGCoords(e, svg);
                const coords = (projection as D3Projection).invert([x, y]);
                if (!coords) return;
                onClick({
                  lng: +coords[0].toFixed(4),
                  lat: +coords[1].toFixed(4),
                  country: countriesByNumericCode.get(Number(geo.id)) ?? null,
                });
              }}
              style={{
                default: { fill: "#1a2d42", stroke: "#243b55", strokeWidth: 0.5, outline: "none" },
                hover: {
                  fill: disabled ? "#1a2d42" : "#2d4a6a",
                  stroke: disabled ? "#243b55" : "#3a6a9a",
                  strokeWidth: 0.5,
                  outline: "none",
                },
                pressed: { fill: "#388bfd", stroke: "#58a6ff", strokeWidth: 0.75, outline: "none" },
              }}
            />
          ))
        }
      </Geographies>

      {result && (
        <>
          {/* Player pin + line — only when there was an actual guess */}
          {!result.timedOut && result.guessLat !== null && result.guessLng !== null && (
            <>
              <Line
                from={[result.guessLng, result.guessLat]}
                to={[result.country.capitalLng, result.country.capitalLat]}
                stroke="#fbbf24"
                strokeWidth={1.5}
                strokeLinecap="round"
                strokeDasharray="5,4"
              />
              <Marker coordinates={[result.guessLng, result.guessLat]}>
                <g style={{ animation: "pinDrop 0.42s cubic-bezier(0.34,1.56,0.64,1) both" }}>
                  <circle r={7} fill="#ef4444" stroke="#fff" strokeWidth={2} />
                  <text
                    textAnchor="middle"
                    y={-13}
                    style={{ fontSize: 10, fill: "#fca5a5", fontFamily: "sans-serif", pointerEvents: "none" }}
                  >
                    You
                  </text>
                </g>
              </Marker>
            </>
          )}

          {/* Correct capital pin — always shown */}
          <Marker coordinates={[result.country.capitalLng, result.country.capitalLat]}>
            {/* Pulsing ring */}
            <circle
              r={11}
              fill="none"
              stroke="#22c55e"
              strokeWidth={2}
              style={{
                animation: "pulseRing 1.6s ease-out infinite",
                transformBox: "fill-box",
                transformOrigin: "center",
              } as React.CSSProperties}
            />
            {/* Pin — drops in 0.1 s after player pin */}
            <g style={{ animation: "pinDrop 0.42s cubic-bezier(0.34,1.56,0.64,1) 0.1s both" }}>
              <circle r={7} fill="#22c55e" stroke="#fff" strokeWidth={2} />
              <text
                textAnchor="middle"
                y={-13}
                style={{ fontSize: 10, fill: "#86efac", fontFamily: "sans-serif", fontWeight: 600, pointerEvents: "none" }}
              >
                {result.country.capital}
              </text>
            </g>
          </Marker>
        </>
      )}
    </ComposableMap>
  );
});

// ─── GameHeader ───────────────────────────────────────────────────────────────

function GameHeader({
  country,
  round,
  totalScore,
  streak,
  timerSecondsLeft,
  roundSeconds,
  isResult,
  hint,
}: {
  country: Country;
  round: number;
  totalScore: number;
  streak: number;
  timerSecondsLeft: number;
  roundSeconds: number;
  isResult: boolean;
  hint?: string;
}) {
  const timerPct = (timerSecondsLeft / roundSeconds) * 100;
  const timerColor =
    timerSecondsLeft > roundSeconds * 0.5
      ? "#22c55e"
      : timerSecondsLeft > roundSeconds * 0.25
        ? "#eab308"
        : "#ef4444";

  return (
    <div className="border-b border-border bg-surface">
      <div className="flex items-start justify-between gap-3 px-3 py-2 sm:px-6 sm:py-3">
        {/* Left: round label + country */}
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wider text-foreground-muted">
            {isResult ? `Round ${round}/${TOTAL_ROUNDS} · Result` : `Round ${round}/${TOTAL_ROUNDS}`}
          </p>
          <p className="mt-0.5 truncate text-xl font-bold text-foreground sm:text-2xl">
            {country.name}
          </p>
          {!isResult && (
            <p className="mt-0.5 text-xs text-foreground-muted sm:text-sm">
              Find{" "}
              <span className="font-semibold" style={{ color: "#58a6ff" }}>
                {country.capital}
              </span>
              {hint && (
                <span className="ml-2 rounded bg-surface-elevated px-1.5 py-0.5 text-xs text-foreground-muted">
                  📍 {hint}
                </span>
              )}
            </p>
          )}
        </div>

        {/* Right: streak + score */}
        <div className="flex shrink-0 items-start gap-3 text-right sm:gap-5">
          {streak > 0 && (
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-foreground-muted">
                Streak
              </p>
              <p className="mt-0.5 text-xl font-bold text-amber-400 sm:text-2xl">
                🔥 {streak}
              </p>
            </div>
          )}
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-foreground-muted">
              Score
            </p>
            <p className="mt-0.5 text-2xl font-bold tabular-nums text-foreground sm:text-3xl">
              {totalScore.toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      {/* Timer bar */}
      <div className="h-1.5 w-full bg-surface-elevated">
        <div
          style={{
            height: "100%",
            width: isResult ? "0%" : `${timerPct}%`,
            backgroundColor: timerColor,
            transition: isResult ? "none" : "width 1s linear, background-color 0.5s",
          }}
        />
      </div>
    </div>
  );
}

// ─── ResultOverlay ────────────────────────────────────────────────────────────

function ResultOverlay({
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
  const pct = Math.round((result.points / MAX_POINTS) * 100);

  const headline = result.timedOut
    ? "⏱ Time's up!"
    : result.points >= 900
      ? "Outstanding!"
      : result.points >= 700
        ? "Great shot!"
        : result.points >= 500
          ? "Not bad!"
          : "Keep exploring!";

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-2 flex justify-center px-3 sm:bottom-6 sm:px-4">
      <div className="pointer-events-auto w-full max-w-sm rounded-xl border border-border bg-surface/95 p-4 shadow-2xl backdrop-blur-sm sm:p-5">

        {/* Headline */}
        <div className="mb-3 flex items-center justify-between">
          <p className="text-lg font-bold" style={{ color: result.timedOut ? "#ef4444" : color }}>
            {headline}
          </p>
          {newStreak > 1 && (
            <span className="rounded-full bg-amber-400/15 px-2 py-0.5 text-xs font-semibold text-amber-400">
              🔥 {newStreak} streak
            </span>
          )}
        </div>

        {/* Stats */}
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wider text-foreground-muted">Distance</p>
            <p className="text-xl font-bold text-foreground">
              {result.timedOut || result.distanceKm === null
                ? "—"
                : `${Math.round(result.distanceKm).toLocaleString()} km`}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs uppercase tracking-wider text-foreground-muted">Points</p>
            <p className="text-3xl font-bold tabular-nums" style={{ color }}>
              +{result.points.toLocaleString()}
            </p>
          </div>
        </div>

        {/* Score bar */}
        <div className="mb-4 h-2 w-full overflow-hidden rounded-full bg-surface-elevated">
          <div
            className="h-full rounded-full transition-[width] duration-700"
            style={{ width: `${pct}%`, backgroundColor: color }}
          />
        </div>

        {/* Pin legend */}
        {!result.timedOut && (
          <div className="mb-4 flex gap-5 text-xs text-foreground-muted">
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-3 w-3 rounded-full bg-green-500" />
              {result.country.capital}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-3 w-3 rounded-full bg-red-500" />
              Your guess
            </span>
          </div>
        )}

        {/* Timeout: reveal correct capital */}
        {result.timedOut && (
          <p className="mb-4 text-sm text-foreground-muted">
            The capital of{" "}
            <span className="font-semibold text-foreground">{result.country.name}</span> is{" "}
            <span className="font-semibold text-green-400">{result.country.capital}</span>.
          </p>
        )}

        {/* Countdown + action */}
        <div className="flex items-center justify-between">
          <p className="text-xs text-foreground-muted">
            {isLastRound ? "Results in " : "Next in "}
            <span className="font-semibold text-foreground">{countdown}</span>…
          </p>
          <button
            onClick={onAdvance}
            className="rounded-md bg-accent px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-accent-hover"
          >
            {isLastRound ? "See results →" : "Next →"}
          </button>
        </div>

        {/* Auto-advance shrink bar */}
        <div className="mt-3 h-0.5 overflow-hidden rounded-full bg-surface-elevated">
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

// ─── EndScreen ────────────────────────────────────────────────────────────────

function EndScreen({
  totalScore,
  bestStreak,
  rounds,
  onPlayAgain,
}: {
  totalScore: number;
  bestStreak: number;
  rounds: RoundRecord[];
  onPlayAgain: () => void;
}) {
  const [name, setName] = useState("");
  const [saved, setSaved] = useState(false);

  const maxScore = MAX_POINTS * TOTAL_ROUNDS;
  const pct = Math.round((totalScore / maxScore) * 100);
  const rating = sessionRating(totalScore);
  const color = pct >= 80 ? "#22c55e" : pct >= 50 ? "#eab308" : "#ef4444";

  function handleSave() {
    const trimmed = name.trim();
    if (!trimmed) return;
    saveEntry({ name: trimmed, score: totalScore, bestStreak, date: new Date().toISOString() });
    setSaved(true);
  }

  return (
    <div className="flex flex-1 flex-col overflow-y-auto">
      <div className="mx-auto w-full max-w-xl px-4 py-6 sm:py-8">

        {/* Hero */}
        <div className="mb-6 text-center sm:mb-8">
          <p className="mb-1 text-sm font-medium uppercase tracking-widest text-foreground-muted">
            Session Complete
          </p>
          <h1 className="text-3xl font-bold text-foreground sm:text-4xl">{rating}</h1>
        </div>

        {/* Score card */}
        <div className="mb-4 rounded-xl border border-border bg-surface p-4 sm:mb-6 sm:p-5">
          <div className="mb-4 flex items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-wider text-foreground-muted">Total Score</p>
              <p className="text-4xl font-bold tabular-nums sm:text-5xl" style={{ color }}>
                {totalScore.toLocaleString()}
              </p>
              <p className="mt-1 text-sm text-foreground-muted">out of {maxScore.toLocaleString()}</p>
            </div>
            <div className="text-right">
              <p className="text-xs uppercase tracking-wider text-foreground-muted">Best Streak</p>
              <p className="mt-1 text-3xl font-bold text-amber-400 sm:text-4xl">
                {bestStreak > 0 ? `🔥 ${bestStreak}` : "—"}
              </p>
            </div>
          </div>
          <div className="h-3 w-full overflow-hidden rounded-full bg-surface-elevated">
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
              <span className="text-lg text-green-400">✓</span>
              <div>
                <p className="text-sm font-semibold text-foreground">Score saved!</p>
                <a href="/leaderboard" className="text-xs text-accent transition-colors hover:text-accent-hover">
                  View leaderboard →
                </a>
              </div>
            </div>
          ) : (
            <>
              <p className="mb-3 text-sm font-semibold text-foreground">Save to Leaderboard</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Your name"
                  maxLength={24}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSave()}
                  className="min-w-0 flex-1 rounded-md border border-border bg-surface-elevated px-3 py-2 text-sm text-foreground placeholder:text-foreground-muted focus:border-accent focus:outline-none"
                />
                <button
                  onClick={handleSave}
                  disabled={!name.trim()}
                  className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Save
                </button>
              </div>
            </>
          )}
        </div>

        {/* Round breakdown */}
        <div className="mb-4 overflow-hidden rounded-xl border border-border bg-surface sm:mb-6">
          <div className="border-b border-border px-4 py-3">
            <p className="text-sm font-semibold text-foreground">Round Breakdown</p>
          </div>
          <div className="divide-y divide-border">
            {rounds.map((r) => {
              const rColor = ptColor(r.points);
              const rPct = (r.points / MAX_POINTS) * 100;
              return (
                <div key={r.round} className="flex items-center gap-3 px-4 py-2.5 sm:py-3">
                  <span className="w-6 shrink-0 text-center text-xs font-medium text-foreground-muted">
                    {r.round}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-foreground">{r.country.name}</p>
                    <p className="truncate text-xs text-foreground-muted">
                      {r.timedOut
                        ? `Timed out · ${r.country.capital}`
                        : r.distanceKm !== null
                          ? `${Math.round(r.distanceKm).toLocaleString()} km from ${r.country.capital}`
                          : r.country.capital}
                    </p>
                  </div>
                  <div className="hidden w-16 sm:block">
                    <div className="h-1.5 overflow-hidden rounded-full bg-surface-elevated">
                      <div className="h-full rounded-full" style={{ width: `${rPct}%`, backgroundColor: rColor }} />
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

        {/* Play again */}
        <button
          onClick={onPlayAgain}
          className="w-full rounded-lg bg-accent py-3 text-sm font-semibold text-white transition-colors hover:bg-accent-hover"
        >
          Play Again
        </button>
      </div>
    </div>
  );
}

// ─── WorldMap — game root ─────────────────────────────────────────────────────

export default function WorldMap({ difficulty }: { difficulty: Difficulty }) {
  const roundSeconds = difficulty === "hard" ? 15 : 30;

  // ── stable refs (mutations don't trigger re-renders) ─────────────────────
  const queueRef = useRef<Country[]>([]);
  const currentCountryRef = useRef<Country | null>(null);
  const acceptingRef = useRef(true);
  const roundRef = useRef(1);
  const streakRef = useRef(0);
  const bestStreakRef = useRef(0);

  function drawNext(): Country {
    if (queueRef.current.length === 0) queueRef.current = shuffled();
    return queueRef.current.pop()!;
  }

  if (!currentCountryRef.current) {
    currentCountryRef.current = drawNext();
  }

  // ── state ─────────────────────────────────────────────────────────────────
  const [gamePhase, setGamePhase] = useState<GamePhase>("playing");
  const [currentCountry, setCurrentCountry] = useState<Country>(
    () => currentCountryRef.current!,
  );
  const [round, setRound] = useState(1);
  const [timerSecondsLeft, setTimerSecondsLeft] = useState(roundSeconds);
  const [totalScore, setTotalScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [rounds, setRounds] = useState<RoundRecord[]>([]);
  const [result, setResult] = useState<GuessResult | null>(null);
  const [resultStreak, setResultStreak] = useState(0);
  const [countdown, setCountdown] = useState(3);

  // ── projection config (memo'd so MapCanvas doesn't re-render on timer ticks)
  const { projectionConfig, hint } = useMemo(() => {
    if (difficulty === "easy" && result === null) {
      const zoom = getZoomConfig(currentCountry.capitalLat, currentCountry.capitalLng);
      return {
        projectionConfig: { scale: zoom.scale, center: zoom.center },
        hint: zoom.region || undefined,
      };
    }
    return { projectionConfig: DEFAULT_PROJECTION, hint: undefined };
  }, [difficulty, result, currentCountry]);

  // ── submit result (shared by click and timeout) ───────────────────────────
  const submitResult = useCallback((info: ClickInfo | null) => {
    const country = currentCountryRef.current!;
    const timedOut = info === null;

    let distanceKm: number | null = null;
    let points = 0;
    if (!timedOut && info) {
      distanceKm = haversineKm(info.lat, info.lng, country.capitalLat, country.capitalLng);
      points = Math.max(0, MAX_POINTS - Math.floor(distanceKm));
    }

    const newStreak = points > STREAK_THRESHOLD ? streakRef.current + 1 : 0;
    streakRef.current = newStreak;
    if (newStreak > bestStreakRef.current) bestStreakRef.current = newStreak;

    setRounds((prev) => [
      ...prev,
      { round: roundRef.current, country, points, distanceKm, timedOut },
    ]);
    setTotalScore((s) => s + points);
    setStreak(newStreak);
    setBestStreak(bestStreakRef.current);
    setResultStreak(newStreak);
    setResult({
      guessLat: info?.lat ?? null,
      guessLng: info?.lng ?? null,
      country,
      distanceKm,
      points,
      timedOut,
    });
  }, []); // stable: only refs + functional setters

  // ── advance to next round (or end game) ───────────────────────────────────
  // roundSeconds is stable for the component lifetime (difficulty prop is fixed per game)
  const advance = useCallback(() => {
    if (roundRef.current >= TOTAL_ROUNDS) {
      setGamePhase("ended");
      return;
    }
    const next = roundRef.current + 1;
    roundRef.current = next;
    currentCountryRef.current = drawNext();
    acceptingRef.current = true;

    setTimerSecondsLeft(roundSeconds);
    setResult(null);
    setCurrentCountry(currentCountryRef.current!);
    setRound(next);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── reset / play again ────────────────────────────────────────────────────
  const resetGame = useCallback(() => {
    queueRef.current = shuffled();
    roundRef.current = 1;
    streakRef.current = 0;
    bestStreakRef.current = 0;
    currentCountryRef.current = queueRef.current.pop()!;
    acceptingRef.current = true;

    setGamePhase("playing");
    setCurrentCountry(currentCountryRef.current);
    setRound(1);
    setTimerSecondsLeft(roundSeconds);
    setTotalScore(0);
    setStreak(0);
    setBestStreak(0);
    setRounds([]);
    setResult(null);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── round timer: counts down while in guessing phase ─────────────────────
  useEffect(() => {
    if (result !== null || gamePhase !== "playing") return;
    const iv = setInterval(() => setTimerSecondsLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(iv);
  }, [result, round, gamePhase]);

  // ── timeout: fires when timer hits 0 in guessing phase ───────────────────
  useEffect(() => {
    if (timerSecondsLeft > 0) return;
    if (!acceptingRef.current) return;
    if (result !== null) return;
    if (gamePhase !== "playing") return;

    acceptingRef.current = false;
    submitResult(null);
  }, [timerSecondsLeft, result, gamePhase, submitResult]);

  // ── auto-advance after showing result ────────────────────────────────────
  useEffect(() => {
    if (!result || gamePhase !== "playing") return;
    setCountdown(3);
    const iv = setInterval(() => setCountdown((c) => c - 1), 1000);
    const to = setTimeout(advance, RESULT_MS);
    return () => {
      clearInterval(iv);
      clearTimeout(to);
    };
  }, [result, gamePhase, advance]);

  // ── stable click handler ──────────────────────────────────────────────────
  const handleClick = useCallback(
    (info: ClickInfo) => {
      if (!acceptingRef.current) return;
      acceptingRef.current = false;
      submitResult(info);
    },
    [submitResult],
  );

  // ── render ────────────────────────────────────────────────────────────────

  if (gamePhase === "ended") {
    return (
      <EndScreen
        totalScore={totalScore}
        bestStreak={bestStreak}
        rounds={rounds}
        onPlayAgain={resetGame}
      />
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      <GameHeader
        country={currentCountry}
        round={round}
        totalScore={totalScore}
        streak={streak}
        timerSecondsLeft={timerSecondsLeft}
        roundSeconds={roundSeconds}
        isResult={result !== null}
        hint={hint}
      />

      <div className="relative min-h-[160px] flex-1">
        <MapCanvas onClick={handleClick} result={result} projectionConfig={projectionConfig} />

        {result && (
          <ResultOverlay
            result={result}
            round={round}
            newStreak={resultStreak}
            countdown={countdown}
            onAdvance={advance}
          />
        )}
      </div>
    </div>
  );
}
