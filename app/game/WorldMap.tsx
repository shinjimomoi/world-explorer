"use client";

import { useState, useCallback, memo, useRef, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  ComposableMap,
  Geographies,
  Geography,
  Marker,
  Line,
  ZoomableGroup,
  useMapContext,
} from "react-simple-maps";
import {
  countriesByNumericCode,
  type Country,
} from "@/data/countries";
import { saveScore } from "@/lib/leaderboard";
import { useNavbar } from "@/app/context/navbar";
import DifficultyModal from "@/app/components/DifficultyModal";
import ScoreCard from "@/app/components/ScoreCard";
import { filterCountries, type Category } from "@/data/categories";
import { Flame, CheckCircle, Camera, RotateCcw } from "lucide-react";

// ─── constants ────────────────────────────────────────────────────────────────

const GEO_URL =
  "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";
const TOTAL_ROUNDS = process.env.NODE_ENV === "development" ? 3 : 3;
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
  basePoints: number;
  multiplier: number;
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
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
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

function shuffled(pool: Country[]): Country[] {
  return [...pool].sort(() => Math.random() - 0.5);
}

function toSVGCoords(e: React.MouseEvent, el: SVGGraphicsElement): DOMPoint {
  const svg = el.closest("svg") as SVGSVGElement;
  const pt = svg.createSVGPoint();
  pt.x = e.clientX;
  pt.y = e.clientY;
  return pt.matrixTransform(el.getScreenCTM()!.inverse());
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

function streakMultiplier(streak: number): {
  multiplier: number;
  label: string;
} {
  if (streak >= 10) return { multiplier: 2.0, label: "World Explorer!" };
  if (streak >= 7) return { multiplier: 1.5, label: "Unstoppable!" };
  if (streak >= 5) return { multiplier: 1.25, label: "Blazing!" };
  if (streak >= 3) return { multiplier: 1.1, label: "On fire!" };
  return { multiplier: 1.0, label: "" };
}

/** green ≥800 · amber ≥500 · red <500 */
function ptColor(points: number): string {
  if (points >= 800) return "#4ade80";
  if (points >= 500) return "#fbbf24";
  return "#f87171";
}

function getZoomConfig(
  capitalLat: number,
  capitalLng: number
): { scale: number; center: [number, number]; region: string } {
  // Europe (lng −25→45, lat 35→72)
  if (
    capitalLng >= -25 &&
    capitalLng <= 45 &&
    capitalLat >= 35 &&
    capitalLat <= 72
  )
    return { scale: 520, center: [15, 52], region: "Europe" };
  // Africa (lng −20→55, lat −36→38)
  if (
    capitalLng >= -20 &&
    capitalLng <= 55 &&
    capitalLat >= -36 &&
    capitalLat <= 38
  )
    return { scale: 330, center: [22, 2], region: "Africa" };
  // Asia (remaining eastern hemisphere above −10 lat)
  if (
    capitalLng >= 25 &&
    capitalLng <= 180 &&
    capitalLat >= -10 &&
    capitalLat <= 75
  )
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
        const { x, y } = toSVGCoords(
          e,
          e.currentTarget as unknown as SVGGraphicsElement
        );
        const coords = projection.invert([x, y]);
        if (!coords) return;
        onClick({
          lng: +coords[0].toFixed(4),
          lat: +coords[1].toFixed(4),
          country: null,
        });
      }}
    />
  );
}

// ─── MapCanvas ────────────────────────────────────────────────────────────────
// memo'd — only re-renders when result or projectionConfig or mapZoom changes.

interface ZoomState {
  center: [number, number];
  zoom: number;
}

interface MapCanvasProps {
  onClick: (info: ClickInfo) => void;
  result: GuessResult | null;
  projectionConfig: { scale: number; center: [number, number] };
  mapZoom: ZoomState;
  onZoomChange: (z: ZoomState) => void;
}

const MapCanvas = memo(function MapCanvas({
  onClick,
  result,
  projectionConfig,
  mapZoom,
  onZoomChange,
}: MapCanvasProps) {
  const disabled = result !== null;

  return (
    <ComposableMap
      projection="geoEqualEarth"
      projectionConfig={projectionConfig}
      width={960}
      height={500}
      style={{
        width: "100%",
        height: "100%",
        display: "block",
        cursor: disabled ? "default" : "crosshair",
        touchAction: "none",
      }}
    >
      <ZoomableGroup
        center={mapZoom.center}
        zoom={mapZoom.zoom}
        minZoom={1}
        maxZoom={8}
        onMoveEnd={({ coordinates, zoom }) =>
          onZoomChange({ center: coordinates as [number, number], zoom })
        }
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
                  const { x, y } = toSVGCoords(
                    e,
                    e.currentTarget as SVGGraphicsElement
                  );
                  const coords = (projection as D3Projection).invert([x, y]);
                  if (!coords) return;
                  onClick({
                    lng: +coords[0].toFixed(4),
                    lat: +coords[1].toFixed(4),
                    country: countriesByNumericCode.get(Number(geo.id)) ?? null,
                  });
                }}
                style={{
                  default: {
                    fill: "#1a1a1a",
                    stroke: "#2a2a2a",
                    strokeWidth: 0.5,
                    outline: "none",
                  },
                  hover: {
                    fill: disabled ? "#1a1a1a" : "#222222",
                    stroke: disabled ? "#2a2a2a" : "#333333",
                    strokeWidth: 0.5,
                    outline: "none",
                  },
                  pressed: {
                    fill: "#1e2a1e",
                    stroke: "#2a3a2a",
                    strokeWidth: 0.75,
                    outline: "none",
                  },
                }}
              />
            ))
          }
        </Geographies>

        {result && (
          <>
            {/* Player pin + line — only when there was an actual guess */}
            {!result.timedOut &&
              result.guessLat !== null &&
              result.guessLng !== null && (
                <>
                  <Line
                    from={[result.guessLng, result.guessLat]}
                    to={[result.country.capitalLng, result.country.capitalLat]}
                    stroke="#444444"
                    strokeWidth={1}
                    strokeLinecap="round"
                    strokeDasharray="4,3"
                    style={{
                      strokeDashoffset: "500",
                      animation:
                        "lineGrow 0.4s ease-out 0.4s forwards",
                    }}
                  />
                  <Marker coordinates={[result.guessLng, result.guessLat]}>
                    <g
                      style={{
                        animation:
                          "pinDrop 0.4s cubic-bezier(0.34,1.56,0.64,1) both",
                      }}
                    >
                      <path
                        d="M0,-5 C-2.76,-5 -5,-2.76 -5,0 C-5,2.76 0,7 0,7 C0,7 5,2.76 5,0 C5,-2.76 2.76,-5 0,-5Z"
                        fill="#f87171"
                        stroke="#fff"
                        strokeWidth={1.5}
                      />
                      <text
                        textAnchor="middle"
                        y={-10}
                        style={{
                          fontSize: 9,
                          fill: "#999999",
                          fontFamily: "sans-serif",
                          pointerEvents: "none",
                        }}
                      >
                        You
                      </text>
                    </g>
                  </Marker>
                </>
              )}

            {/* Correct capital pin — always shown */}
            <Marker
              coordinates={[
                result.country.capitalLng,
                result.country.capitalLat,
              ]}
            >
              {/* Pulsing ring */}
              <circle
                r={8}
                fill="none"
                stroke="#4ade80"
                strokeWidth={1.5}
                style={
                  {
                    animation: "pulseRing 1.6s ease-out infinite",
                    transformBox: "fill-box",
                    transformOrigin: "center",
                  } as React.CSSProperties
                }
              />
              {/* Pin — drops 300ms after player pin */}
              <g
                style={{
                  animation:
                    "pinDrop 0.4s cubic-bezier(0.34,1.56,0.64,1) 0.3s both",
                }}
              >
                <path
                  d="M0,-5 C-2.76,-5 -5,-2.76 -5,0 C-5,2.76 0,7 0,7 C0,7 5,2.76 5,0 C5,-2.76 2.76,-5 0,-5Z"
                  fill="#4ade80"
                  stroke="#fff"
                  strokeWidth={1.5}
                />
                <text
                  textAnchor="middle"
                  y={-10}
                  style={{
                    fontSize: 9,
                    fill: "#4ade80",
                    fontFamily: "sans-serif",
                    fontWeight: 600,
                    pointerEvents: "none",
                  }}
                >
                  {result.country.capital}
                </text>
              </g>
            </Marker>
          </>
        )}
      </ZoomableGroup>
    </ComposableMap>
  );
});

// ─── QuitDialog ───────────────────────────────────────────────────────────────

function QuitDialog({
  onConfirm,
  onCancel,
}: {
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 px-4 backdrop-blur-xl">
      <div className="w-full max-w-sm rounded-2xl border border-[#222222] bg-surface p-6">
        <h2 className="text-lg font-bold text-foreground">Quit game?</h2>
        <p className="mt-2 text-sm text-foreground-muted">
          Are you sure you want to quit? Your progress will be lost.
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="rounded-lg border border-[#333333] px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:border-[#555555]"
          >
            Keep playing
          </button>
          <button
            onClick={onConfirm}
            className="rounded-lg bg-[#f87171] px-4 py-2 text-sm font-semibold text-[#0a0a0a] transition-colors hover:bg-[#fca5a5]"
          >
            Quit
          </button>
        </div>
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
            className="rounded-lg bg-[#f0f0f0] px-3 py-1.5 text-xs font-semibold text-[#0a0a0a] transition-colors hover:bg-white"
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

// ─── EndScreen ────────────────────────────────────────────────────────────────

function EndScreen({
  totalScore,
  bestStreak,
  difficulty,
  category,
  rounds,
  onPlayAgain,
}: {
  totalScore: number;
  bestStreak: number;
  difficulty: Difficulty;
  category: Category;
  rounds: RoundRecord[];
  onPlayAgain: (difficulty: Difficulty, category: Category) => void;
}) {
  const [showDifficultyModal, setShowDifficultyModal] = useState(false);
  const [name, setName] = useState("");
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
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
      await saveScore(trimmed, totalScore, bestStreak, category);
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
                  href="/leaderboard"
                  className="text-xs text-accent transition-colors hover:text-accent-hover"
                >
                  View leaderboard →
                </a>
              </div>
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
                  className="rounded-lg bg-[#f0f0f0] px-4 py-2 text-sm font-semibold text-[#0a0a0a] transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
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
              className="flex flex-col items-center justify-center gap-1.5 rounded-xl py-3 text-white transition-opacity hover:opacity-85"
              style={{ background: "#000" }}
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
              <span className="text-[11px] font-semibold">Share on X</span>
            </button>

            {/* WhatsApp */}
            <button
              onClick={handleWhatsApp}
              className="flex flex-col items-center justify-center gap-1.5 rounded-xl py-3 text-white transition-opacity hover:opacity-85"
              style={{ background: "#25D366" }}
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
              <span className="text-[11px] font-semibold">
                Share on WhatsApp
              </span>
            </button>

            {/* Instagram */}
            <button
              onClick={handleInstagram}
              disabled={instagramStatus === "generating"}
              className="flex flex-col items-center justify-center gap-1.5 rounded-xl py-3 text-white transition-opacity hover:opacity-85 disabled:opacity-60"
              style={{
                background:
                  "linear-gradient(45deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)",
              }}
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
              </svg>
              <span className="text-[11px] font-semibold">
                {instagramStatus === "generating"
                  ? "Saving…"
                  : "Share on Instagram"}
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
          className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-[#f0f0f0] py-3 text-sm font-semibold text-[#0a0a0a] transition-colors hover:bg-white"
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

// ─── WorldMap — game root ─────────────────────────────────────────────────────

export default function WorldMap({
  difficulty,
  category,
}: {
  difficulty: Difficulty;
  category: Category;
}) {
  const roundSeconds = difficulty === "hard" ? 15 : 30;
  const router = useRouter();
  const { setState: setNavbarState } = useNavbar();
  const [showQuitDialog, setShowQuitDialog] = useState(false);

  // ── stable refs (mutations don't trigger re-renders) ─────────────────────
  const queueRef = useRef<Country[]>([]);
  const currentCountryRef = useRef<Country | null>(null);
  const acceptingRef = useRef(true);
  const roundRef = useRef(1);
  const streakRef = useRef(0);
  const bestStreakRef = useRef(0);

  const pool = filterCountries(category);

  function drawNext(): Country {
    if (queueRef.current.length === 0) queueRef.current = shuffled(pool);
    return queueRef.current.pop()!;
  }

  if (!currentCountryRef.current) {
    currentCountryRef.current = drawNext();
  }

  // ── state ─────────────────────────────────────────────────────────────────
  const [gamePhase, setGamePhase] = useState<GamePhase>("playing");
  const [currentCountry, setCurrentCountry] = useState<Country>(
    () => currentCountryRef.current!
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
  const [mapZoom, setMapZoom] = useState<ZoomState>({
    center: [0, 0],
    zoom: 1,
  });

  // ── projection config (memo'd so MapCanvas doesn't re-render on timer ticks)
  const { projectionConfig, hint } = useMemo(() => {
    if (difficulty === "easy" && result === null) {
      const zoom = getZoomConfig(
        currentCountry.capitalLat,
        currentCountry.capitalLng
      );
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
    let basePoints = 0;
    if (!timedOut && info) {
      distanceKm = haversineKm(
        info.lat,
        info.lng,
        country.capitalLat,
        country.capitalLng
      );
      basePoints = Math.max(0, MAX_POINTS - Math.floor(distanceKm));
    }

    const newStreak = basePoints > STREAK_THRESHOLD ? streakRef.current + 1 : 0;
    streakRef.current = newStreak;
    if (newStreak > bestStreakRef.current) bestStreakRef.current = newStreak;

    const { multiplier } = streakMultiplier(newStreak);
    const points = Math.round(basePoints * multiplier);

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
      basePoints,
      multiplier,
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
    queueRef.current = shuffled(pool);
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
    setMapZoom({ center: [0, 0], zoom: 1 });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── round timer: counts down while in guessing phase ─────────────────────
  useEffect(() => {
    if (result !== null || gamePhase !== "playing") return;
    const iv = setInterval(
      () => setTimerSecondsLeft((s) => Math.max(0, s - 1)),
      1000
    );
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
    [submitResult]
  );

  // ── quit handlers ─────────────────────────────────────────────────────────
  const handleQuit = useCallback(() => setShowQuitDialog(true), []);
  const handleConfirmQuit = useCallback(() => {
    router.push("/");
  }, [router]);

  // ── sync game state into the merged navbar ────────────────────────────────
  useEffect(() => {
    if (gamePhase !== "playing") return;
    const timerPct =
      result !== null ? 0 : (timerSecondsLeft / roundSeconds) * 100;
    const timerColor =
      timerSecondsLeft > roundSeconds * 0.5
        ? "#4ade80"
        : timerSecondsLeft > roundSeconds * 0.25
        ? "#fbbf24"
        : "#f87171";
    setNavbarState({
      active: true,
      countryName: currentCountry.name,
      capital: currentCountry.capital,
      hint,
      round,
      totalRounds: TOTAL_ROUNDS,
      totalScore,
      streak,
      timerPct,
      timerColor,
      isResult: result !== null,
      onQuit: handleQuit,
    });
  }, [
    gamePhase,
    currentCountry,
    hint,
    round,
    totalScore,
    streak,
    timerSecondsLeft,
    result,
    roundSeconds,
    setNavbarState,
    handleQuit,
  ]);

  // ── clear navbar when game ends or component unmounts ────────────────────
  useEffect(() => {
    if (gamePhase === "ended") setNavbarState({ active: false });
  }, [gamePhase, setNavbarState]);

  useEffect(() => {
    return () => setNavbarState({ active: false });
  }, [setNavbarState]);

  // ── render ────────────────────────────────────────────────────────────────

  if (gamePhase === "ended") {
    return (
      <EndScreen
        totalScore={totalScore}
        bestStreak={bestStreak}
        difficulty={difficulty}
        category={category}
        rounds={rounds}
        onPlayAgain={(d, c) => {
          if (d === difficulty && c === category) resetGame();
          else router.push(`/game?difficulty=${d}&category=${c}`);
        }}
      />
    );
  }

  return (
    // Wrapper: position:relative so the popup can absolute-center inside it.
    // No overflow:hidden here — that lives on the inner map div so the popup
    // isn't clipped.
    <div className="relative flex flex-1 flex-col min-h-0">
      {/* Map fills all remaining height */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <MapCanvas
          onClick={handleClick}
          result={result}
          projectionConfig={projectionConfig}
          mapZoom={mapZoom}
          onZoomChange={setMapZoom}
        />
      </div>

      {/* Result popup: sibling to the map, centered in the wrapper */}
      {result && (
        <ResultOverlay
          result={result}
          round={round}
          newStreak={resultStreak}
          countdown={countdown}
          onAdvance={advance}
        />
      )}

      {showQuitDialog && (
        <QuitDialog
          onConfirm={handleConfirmQuit}
          onCancel={() => setShowQuitDialog(false)}
        />
      )}
    </div>
  );
}
