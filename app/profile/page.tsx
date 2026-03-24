"use client";

import { useEffect, useState, useCallback } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import {
  ComposableMap,
  Geographies,
  Geography,
  ZoomableGroup,
} from "react-simple-maps";
import { countries, countriesByNumericCode } from "@/data/countries";
import { filterCountries } from "@/data/categories";
import { Flame, Swords, Plus, Minus, RotateCcw, Play } from "lucide-react";

const GEO_URL = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

// ─── XP / Level helpers ──────────────────────────────────────────────────────

function xpForLevel(level: number): number {
  return level * 100;
}

function levelFromXp(xp: number): { level: number; current: number; needed: number } {
  let level = 1;
  let remaining = xp;
  while (remaining >= xpForLevel(level)) {
    remaining -= xpForLevel(level);
    level++;
  }
  return { level, current: remaining, needed: xpForLevel(level) };
}

function levelTitle(level: number): string {
  if (level >= 20) return "Geography Master";
  if (level >= 15) return "World Authority";
  if (level >= 10) return "Expert Geographer";
  if (level >= 7) return "Seasoned Traveller";
  if (level >= 4) return "Rising Explorer";
  return "Novice";
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// ─── Types ───────────────────────────────────────────────────────────────────

interface MasteryRow {
  country: string;
  correct_count: number;
  attempts: number;
  last_played?: string;
}

interface ScoreRow {
  score: number;
  best_streak: number;
  category: string;
  difficulty: string;
  created_at: string;
}

interface ProfileData {
  user: { id: string; name: string; email: string; avatar_url: string; xp: number; total_games: number; total_guesses: number; total_correct: number } | null;
  mastery: MasteryRow[];
  recentScores: ScoreRow[];
  bestStreak: number;
  totalGames: number;
  accuracy: number;
  masteredCount: number;
  survival: { games: number; bestScore: number; bestStreak: number };
}

// ─── Mastery color helpers ───────────────────────────────────────────────────

function masteryFill(m: MasteryRow | undefined): string {
  if (!m) return "#1a1a1a";
  if (m.correct_count >= 3) return "#4ade80";
  if (m.correct_count >= 1) return "#854F0B";
  return "#2a2a2a";
}

function masteryHover(m: MasteryRow | undefined): string {
  if (!m) return "#222222";
  if (m.correct_count >= 3) return "#6ee7a0";
  if (m.correct_count >= 1) return "#a0630e";
  return "#333333";
}

function masteryStatus(m: MasteryRow | undefined): string {
  if (!m) return "Not played";
  if (m.correct_count >= 3) return "Mastered";
  if (m.correct_count >= 1) return "Learning";
  return "Seen";
}

// ─── Regions ─────────────────────────────────────────────────────────────────

const REGIONS = ["Africa", "Americas", "Asia", "Europe", "Oceania"] as const;

const REGION_ZOOM: Record<string, { center: [number, number]; zoom: number }> = {
  Africa: { center: [22, 2], zoom: 2.2 },
  Americas: { center: [-80, 10], zoom: 1.5 },
  Asia: { center: [90, 35], zoom: 1.8 },
  Europe: { center: [15, 52], zoom: 3.5 },
  Oceania: { center: [145, -25], zoom: 2.5 },
};

export default function ProfilePage() {
  const { isSignedIn, isLoaded, user } = useUser();
  const router = useRouter();
  const [data, setData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; m: MasteryRow | undefined; name: string; capital: string } | null>(null);
  const [mapCenter, setMapCenter] = useState<[number, number]>([0, 10]);
  const [mapZoom, setMapZoom] = useState(1);

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) {
      router.replace("/?message=signin");
      return;
    }
    fetch(`/api/profile?userId=${user.id}&t=${Date.now()}`)
      .then((r) => r.json())
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [isLoaded, isSignedIn, user, router]);

  const handleMoveEnd = useCallback(
    ({ coordinates, zoom }: { coordinates: [number, number]; zoom: number }) => {
      setMapCenter(coordinates);
      setMapZoom(zoom);
    },
    []
  );

  if (!isLoaded || loading || !data) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div
          className="h-5 w-5 rounded-full border-2 border-[#333333] border-t-accent"
          style={{ animation: "spin 0.6s linear infinite" }}
        />
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    );
  }

  const xp = data.user?.xp ?? 0;
  const { level, current, needed } = levelFromXp(xp);
  const title = levelTitle(level);
  const accuracy = data.accuracy;
  const mastered = data.masteredCount;

  // Mastery lookup by country name
  const masteryMap = new Map(data.mastery.map((m) => [m.country, m]));
  // Also by numeric code for map rendering
  const nameByNumeric = new Map<number, string>();
  countries.forEach((c) => nameByNumeric.set(c.numericCode, c.name));

  const playedCount = data.mastery.length;
  const seenCount = data.mastery.filter((m) => m.correct_count === 0).length;
  const learningCount = data.mastery.filter((m) => m.correct_count >= 1 && m.correct_count < 3).length;

  return (
    <div className="flex flex-1 flex-col overflow-y-auto">
      <div className="mx-auto w-full max-w-2xl px-4 py-8">
        {/* ── Header ───────────────────────────────────────────────── */}
        <div className="mb-6 flex items-center gap-4">
          <img
            src={user?.imageUrl ?? ""}
            alt=""
            className="h-[52px] w-[52px] shrink-0 rounded-full border-2 border-accent object-cover"
          />
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-xl font-bold text-foreground">
              {user?.fullName ?? user?.username ?? "Player"}
            </h1>
            <p className="text-sm text-foreground-muted">
              Level {level} · {title}
            </p>
            <div className="mt-1.5 flex items-center gap-2">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#1a1a1a]">
                <div
                  className="h-full rounded-full bg-accent transition-all"
                  style={{ width: `${(current / needed) * 100}%` }}
                />
              </div>
              <span className="shrink-0 font-mono text-[11px] text-foreground-muted">
                {current}/{needed} XP
              </span>
            </div>
          </div>
        </div>

        {/* ── Stats Row ────────────────────────────────────────────── */}
        <div className="mb-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[
            { label: "Games", value: data.totalGames },
            { label: "Accuracy", value: `${accuracy}%` },
            { label: "Mastered", value: mastered },
            { label: "Best Streak", value: data.bestStreak, icon: true },
          ].map((s) => (
            <div key={s.label} className="rounded-xl border border-border bg-surface p-3 text-center">
              <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-foreground-muted">{s.label}</p>
              <p className="mt-1 font-mono text-xl font-bold text-foreground">
                {s.icon ? (
                  <span className="inline-flex items-center gap-1">
                    <Flame className="h-4 w-4 text-accent" strokeWidth={1.5} />{s.value}
                  </span>
                ) : s.value}
              </p>
            </div>
          ))}
        </div>

        {/* ── Mastery Heatmap ──────────────────────────────────────── */}
        <div className="relative mb-4 overflow-hidden rounded-xl border border-border bg-[#0a0a0a]">
          <div style={{ height: 400 }}>
            <ComposableMap
              projection="geoEqualEarth"
              projectionConfig={{ scale: 160, center: [0, 10] }}
              width={960}
              height={500}
              style={{ width: "100%", height: "100%", display: "block" }}
            >
              <ZoomableGroup
                center={mapCenter}
                zoom={mapZoom}
                minZoom={1}
                maxZoom={8}
                onMoveEnd={handleMoveEnd}
              >
                <Geographies geography={GEO_URL}>
                  {({ geographies }: any) =>
                    geographies.map((geo: any) => {
                      const countryName = nameByNumeric.get(Number(geo.id));
                      const m = countryName ? masteryMap.get(countryName) : undefined;
                      const country = countryName ? countriesByNumericCode.get(Number(geo.id)) : undefined;
                      return (
                        <Geography
                          key={geo.rsmKey}
                          geography={geo}
                          onMouseEnter={(e) => {
                            if (!countryName || !country) return;
                            setTooltip({
                              x: e.clientX,
                              y: e.clientY,
                              m,
                              name: countryName,
                              capital: country.capital,
                            });
                          }}
                          onMouseMove={(e) => {
                            if (tooltip) {
                              setTooltip((prev) => prev ? { ...prev, x: e.clientX, y: e.clientY } : null);
                            }
                          }}
                          onMouseLeave={() => setTooltip(null)}
                          style={{
                            default: {
                              fill: masteryFill(m),
                              stroke: "#2a2a2a",
                              strokeWidth: 0.5,
                              outline: "none",
                              transition: "fill 500ms ease",
                            },
                            hover: {
                              fill: masteryHover(m),
                              stroke: "#333333",
                              strokeWidth: 0.5,
                              outline: "none",
                              cursor: "pointer",
                            },
                            pressed: {
                              fill: masteryHover(m),
                              stroke: "#333333",
                              strokeWidth: 0.5,
                              outline: "none",
                            },
                          }}
                        />
                      );
                    })
                  }
                </Geographies>
              </ZoomableGroup>
            </ComposableMap>
          </div>

          {/* Tooltip */}
          {tooltip && (
            <div
              className="pointer-events-none fixed z-50"
              style={{
                left: Math.min(tooltip.x + 12, typeof window !== "undefined" ? window.innerWidth - 200 : 600),
                top: Math.min(tooltip.y - 10, typeof window !== "undefined" ? window.innerHeight - 120 : 400),
              }}
            >
              <div className="rounded-lg border border-[#222222] bg-[#111111] px-3 py-2">
                <p className="text-[13px] font-semibold text-foreground">{tooltip.name}</p>
                <p className="text-[12px] text-foreground-muted">{tooltip.capital}</p>
                <p className="mt-1 text-[12px]" style={{ color: masteryFill(tooltip.m) === "#1a1a1a" ? "#666" : masteryFill(tooltip.m) }}>
                  {masteryStatus(tooltip.m)}
                </p>
                {tooltip.m && (
                  <>
                    <p className="text-[11px] text-foreground-muted">
                      {tooltip.m.correct_count}/{tooltip.m.attempts} correct
                    </p>
                    {tooltip.m.last_played && (
                      <p className="text-[11px] text-foreground-muted">
                        Last played: {formatDate(tooltip.m.last_played)}
                      </p>
                    )}
                  </>
                )}
              </div>
            </div>
          )}

          {/* Map controls */}
          <div className="absolute right-3 top-3 flex flex-col gap-1">
            <button
              onClick={() => setMapZoom((z) => Math.min(8, z * 1.5))}
              className="flex h-7 w-7 items-center justify-center rounded-md border border-[#333333] bg-[#111111] text-foreground-muted transition-colors hover:bg-[#1a1a1a] hover:text-foreground"
            >
              <Plus className="h-3.5 w-3.5" strokeWidth={1.5} />
            </button>
            <button
              onClick={() => setMapZoom((z) => Math.max(1, z / 1.5))}
              className="flex h-7 w-7 items-center justify-center rounded-md border border-[#333333] bg-[#111111] text-foreground-muted transition-colors hover:bg-[#1a1a1a] hover:text-foreground"
            >
              <Minus className="h-3.5 w-3.5" strokeWidth={1.5} />
            </button>
            <button
              onClick={() => { setMapCenter([0, 10]); setMapZoom(1); }}
              className="flex h-7 w-7 items-center justify-center rounded-md border border-[#333333] bg-[#111111] text-foreground-muted transition-colors hover:bg-[#1a1a1a] hover:text-foreground"
            >
              <RotateCcw className="h-3 w-3" strokeWidth={1.5} />
            </button>
          </div>
        </div>

        {/* ── Legend + Region summary ───────────────────────────────── */}
        <div className="mb-2 flex flex-wrap items-center gap-4 text-[11px] text-foreground-muted">
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#1a1a1a] border border-[#333]" /> Not played
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#2a2a2a]" /> Seen: {seenCount}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#854F0B]" /> Learning: {learningCount}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-accent" /> Mastered: {mastered}
          </span>
        </div>

        <div className="mb-6 flex flex-wrap gap-2">
          {REGIONS.map((region) => {
            const total = filterCountries(region).length;
            const regionMastered = filterCountries(region).filter(
              (c) => (masteryMap.get(c.name)?.correct_count ?? 0) >= 3
            ).length;
            return (
              <button
                key={region}
                onClick={() => {
                  const rz = REGION_ZOOM[region];
                  if (rz) { setMapCenter(rz.center); setMapZoom(rz.zoom); }
                }}
                className="cursor-pointer rounded-lg border border-border bg-surface px-3 py-1.5 font-mono text-xs text-foreground-muted transition-all duration-150 hover:bg-[#1a1a1a] hover:border-[#333333] active:scale-[0.98]"
              >
                {region} · <span className="text-accent">{regionMastered}</span>/{total}
              </button>
            );
          })}
        </div>

        {/* ── Countries Grid ───────────────────────────────────────── */}
        <div className="mb-6 rounded-xl border border-border bg-surface p-4">
          <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.08em] text-foreground-muted">
            {playedCount > 0 ? `${playedCount} countries explored` : "Countries"}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {playedCount === 0 ? (
              <p className="text-xs text-foreground-muted">Play a game to start tracking countries!</p>
            ) : (
              countries
                .filter((c) => masteryMap.has(c.name))
                .map((c) => {
                  const m = masteryMap.get(c.name)!;
                  let bg: string;
                  let text: string;
                  if (m.correct_count >= 3) {
                    bg = "bg-accent/15";
                    text = "text-accent";
                  } else if (m.correct_count >= 1) {
                    bg = "bg-[#EF9F27]/15";
                    text = "text-[#EF9F27]";
                  } else {
                    bg = "bg-[#333333]/50";
                    text = "text-[#888888]";
                  }
                  return (
                    <span
                      key={c.code}
                      className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${bg} ${text}`}
                    >
                      {c.name}
                    </span>
                  );
                })
            )}
          </div>
          {playedCount > 0 && (
            <div className="mt-3 flex gap-4 text-[10px] text-foreground-muted">
              <span className="flex items-center gap-1">
                <span className="inline-block h-2 w-2 rounded-full bg-accent" /> Mastered (3+)
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block h-2 w-2 rounded-full bg-[#EF9F27]" /> Learning (1-2)
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block h-2 w-2 rounded-full bg-[#888888]" /> Seen
              </span>
            </div>
          )}
        </div>

        {/* ── Recent Games ─────────────────────────────────────────── */}
        {data.recentScores.length > 0 && (
          <div className="mb-6 rounded-xl border border-border bg-surface overflow-hidden">
            <div className="border-b border-border px-4 py-3">
              <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-foreground-muted">
                Recent Games
              </p>
            </div>
            <div className="divide-y divide-[#1a1a1a]">
              {data.recentScores.map((s, i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-2.5">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-foreground">
                        {s.category || "All World"}
                      </span>
                      {s.difficulty && (
                        <span className="rounded-full bg-surface-elevated px-2 py-0.5 text-[10px] font-medium text-foreground-muted">
                          {s.difficulty}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-foreground-muted">{formatDate(s.created_at)}</p>
                  </div>
                  <span className="shrink-0 font-mono text-sm font-bold text-accent">
                    {s.score.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Survival Stats ────────────────────────────────────────── */}
        {(() => {
          const sv = data.survival;
          // Estimate best run from best streak (proxy until rounds_survived is stored)
          const bestRun = sv.bestStreak > 0 ? sv.bestStreak + 2 : 0;
          const furthestTier = bestRun >= 21 ? "hard" : bestRun >= 11 ? "medium" : bestRun > 0 ? "easy" : "none";

          const tiers: { id: string; label: string; rounds: string }[] = [
            { id: "easy", label: "Easy", rounds: "Rounds 1–10" },
            { id: "medium", label: "Medium", rounds: "Rounds 11–20" },
            { id: "hard", label: "Hard", rounds: "Rounds 21+" },
          ];

          function tierStyle(id: string) {
            if (furthestTier === "none") return { bg: "#111111", border: "#222222", label: "#333333", rounds: "#2a2a2a" };
            const reached = (id === "easy") || (id === "medium" && (furthestTier === "medium" || furthestTier === "hard")) || (id === "hard" && furthestTier === "hard");
            const isFurthest = id === furthestTier;
            if (isFurthest) return { bg: "#0f200f", border: "#4ade80", label: "#4ade80", rounds: "#4ade80" };
            if (reached) return { bg: "#0f1a0f", border: "#2a3a2a", label: "#4ade80", rounds: "#2a5a2a" };
            return { bg: "#111111", border: "#222222", label: "#333333", rounds: "#2a2a2a" };
          }

          return (
            <div className="mb-6 flex flex-col gap-4 rounded-xl border border-[#222222] bg-[#111111] p-5">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Swords className="h-3.5 w-3.5 text-[#555555]" strokeWidth={1.5} />
                  <span className="text-[11px] font-medium uppercase text-[#555555]" style={{ letterSpacing: "0.1em" }}>
                    Survival Mode
                  </span>
                </div>
                {bestRun > 0 && (
                  <span className="text-[12px] text-[#555555]">
                    Best run: <span className="font-semibold text-accent">{bestRun}</span> rounds
                  </span>
                )}
              </div>

              {/* Stats row */}
              <div className="grid grid-cols-3 overflow-hidden rounded-lg bg-[#222222]" style={{ gap: 1 }}>
                <div className="bg-[#111111] px-3 py-3 text-center">
                  <p className="text-[11px] font-medium uppercase text-[#444444]" style={{ letterSpacing: "0.08em" }}>Games</p>
                  <p className="mt-1 font-mono text-xl font-bold text-foreground">{sv.games}</p>
                </div>
                <div className="bg-[#111111] px-3 py-3 text-center">
                  <p className="text-[11px] font-medium uppercase text-[#444444]" style={{ letterSpacing: "0.08em" }}>Best Score</p>
                  <p className="mt-1 font-mono text-xl font-bold text-accent">{sv.bestScore.toLocaleString()}</p>
                </div>
                <div className="bg-[#111111] px-3 py-3 text-center">
                  <p className="text-[11px] font-medium uppercase text-[#444444]" style={{ letterSpacing: "0.08em" }}>Best Streak</p>
                  <p className="mt-1 font-mono text-xl font-bold text-foreground">
                    <span className="inline-flex items-center justify-center gap-1">
                      <Flame className="h-4 w-4 text-accent" strokeWidth={1.5} />{sv.bestStreak}
                    </span>
                  </p>
                </div>
              </div>

              {/* Tier progression */}
              <div className="grid grid-cols-3 gap-2">
                {tiers.map((t) => {
                  const s = tierStyle(t.id);
                  const isFurthest = t.id === furthestTier;
                  return (
                    <div
                      key={t.id}
                      className="rounded-lg px-3 py-2 text-center"
                      style={{ background: s.bg, border: `1px solid ${s.border}` }}
                    >
                      <p className="text-[12px] font-semibold" style={{ color: s.label }}>
                        {isFurthest && "← "}{t.label}
                      </p>
                      <p className="mt-0.5 text-[10px]" style={{ color: s.rounds }}>{t.rounds}</p>
                    </div>
                  );
                })}
              </div>

              {/* Play button */}
              <a
                href="/game?difficulty=survival&category=All%20World"
                className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-[#333333] py-2.5 text-sm font-semibold text-foreground transition-all duration-150 hover:bg-[#1a1a1a] hover:border-[#444444] active:scale-[0.98]"
              >
                <Play className="h-3.5 w-3.5" strokeWidth={1.5} /> Play survival
              </a>
            </div>
          );
        })()}
      </div>
    </div>
  );
}
