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
import { filterCountries, CONTINENT_MAP } from "@/data/categories";
import {
  Flame,
  Swords,
  Plus,
  Minus,
  RotateCcw,
  Play,
  Grid,
  Lock,
  Calendar,
  Trophy,
} from "lucide-react";

const GEO_URL =
  "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

// ─── XP / Level helpers ──────────────────────────────────────────────────────

function xpForLevel(level: number): number {
  return level * 100;
}

function levelFromXp(xp: number): {
  level: number;
  current: number;
  needed: number;
} {
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

interface Collectible {
  country: string;
  rarity: string;
  unlocked_at: string;
}

interface ProfileData {
  user: {
    id: string;
    name: string;
    email: string;
    avatar_url: string;
    xp: number;
    total_games: number;
    total_guesses: number;
    total_correct: number;
    daily_streak?: number;
  } | null;
  mastery: MasteryRow[];
  recentScores: ScoreRow[];
  collectibles: Collectible[];
  bestStreak: number;
  totalGames: number;
  accuracy: number;
  masteredCount: number;
  survival: { games: number; bestScore: number; bestStreak: number };
  daily: {
    streak: number;
    bestScore: number;
    daysPlayed: number;
    history: { date: string; score: number; bestStreak: number }[];
  };
}

// ─── Mastery color helpers ───────────────────────────────────────────────────

function masteryFill(m: MasteryRow | undefined): string {
  if (!m) return "#1a1a1a";
  if (m.correct_count >= 3) return "#4ade80";
  if (m.correct_count >= 1) return "#fb923c";
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

const REGION_ZOOM: Record<string, { center: [number, number]; zoom: number }> =
  {
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
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    m: MasteryRow | undefined;
    name: string;
    capital: string;
  } | null>(null);
  const [mapCenter, setMapCenter] = useState<[number, number]>([0, 10]);
  const [mapZoom, setMapZoom] = useState(1);
  const [profileTab, setProfileTab] = useState<
    "overview" | "collection" | "daily"
  >("overview");
  const [rarityFilter, setRarityFilter] = useState<string>("all");
  const [collectionSort, setCollectionSort] = useState<
    "recent" | "rarity" | "alpha"
  >("recent");

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
    ({
      coordinates,
      zoom,
    }: {
      coordinates: [number, number];
      zoom: number;
    }) => {
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
  const learningCount = data.mastery.filter(
    (m) => m.correct_count >= 1 && m.correct_count < 3
  ).length;

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
            <div
              key={s.label}
              className="rounded-xl border border-border bg-surface p-3 text-center"
            >
              <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-foreground-muted">
                {s.label}
              </p>
              <p className="mt-1 font-mono text-xl font-bold text-foreground">
                {s.icon ? (
                  <span className="inline-flex items-center gap-1">
                    <Flame className="h-4 w-4 text-accent" strokeWidth={1.5} />
                    {s.value}
                  </span>
                ) : (
                  s.value
                )}
              </p>
            </div>
          ))}
        </div>

        {/* ── Tabs ──────────────────────────────────────────────────── */}
        <div className="mb-6 flex gap-1 border-b border-border pb-px">
          {(["overview", "collection", "daily"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setProfileTab(t)}
              className={`cursor-pointer flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-all duration-150 ${
                profileTab === t
                  ? "border-b-2 border-accent text-foreground"
                  : "text-foreground-muted hover:text-[#aaaaaa]"
              }`}
            >
              {t === "overview" && "Overview"}
              {t === "collection" && (
                <>
                  <Grid className="h-3 w-3" strokeWidth={1.5} /> Collection
                  <span className="rounded-full bg-accent/15 px-1.5 py-0.5 text-[10px] font-semibold text-accent">
                    {data.collectibles.length}
                  </span>
                </>
              )}
              {t === "daily" && (
                <>
                  <Calendar className="h-3 w-3" strokeWidth={1.5} /> Daily
                  {data.daily.streak > 0 && (
                    <span className="inline-flex items-center gap-0.5 rounded-full bg-accent/15 px-1.5 py-0.5 text-[10px] font-semibold text-accent">
                      <Flame className="h-2.5 w-2.5" strokeWidth={1.5} />
                      {data.daily.streak}
                    </span>
                  )}
                </>
              )}
            </button>
          ))}
        </div>

        {profileTab === "overview" ? (
          <>
            {/* ── Mastery Heatmap (Overview) ────────────────────────────── */}
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
                          const m = countryName
                            ? masteryMap.get(countryName)
                            : undefined;
                          const country = countryName
                            ? countriesByNumericCode.get(Number(geo.id))
                            : undefined;
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
                                  setTooltip((prev) =>
                                    prev
                                      ? { ...prev, x: e.clientX, y: e.clientY }
                                      : null
                                  );
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
                    left: Math.min(
                      tooltip.x + 12,
                      typeof window !== "undefined"
                        ? window.innerWidth - 200
                        : 600
                    ),
                    top: Math.min(
                      tooltip.y - 10,
                      typeof window !== "undefined"
                        ? window.innerHeight - 120
                        : 400
                    ),
                  }}
                >
                  <div className="rounded-lg border border-[#222222] bg-[#111111] px-3 py-2">
                    <p className="text-[13px] font-semibold text-foreground">
                      {tooltip.name}
                    </p>
                    <p className="text-[12px] text-foreground-muted">
                      {tooltip.capital}
                    </p>
                    <p
                      className="mt-1 text-[12px]"
                      style={{
                        color:
                          masteryFill(tooltip.m) === "#1a1a1a"
                            ? "#666"
                            : masteryFill(tooltip.m),
                      }}
                    >
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
                  onClick={() => {
                    setMapCenter([0, 10]);
                    setMapZoom(1);
                  }}
                  className="flex h-7 w-7 items-center justify-center rounded-md border border-[#333333] bg-[#111111] text-foreground-muted transition-colors hover:bg-[#1a1a1a] hover:text-foreground"
                >
                  <RotateCcw className="h-3 w-3" strokeWidth={1.5} />
                </button>
              </div>
            </div>

            {/* ── Legend + Region summary ───────────────────────────────── */}
            <div className="mb-2 flex flex-wrap items-center gap-4 text-[11px] text-foreground-muted">
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#1a1a1a] border border-[#333]" />{" "}
                Not played
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#2a2a2a]" />{" "}
                Seen: {seenCount}
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#fb923c]" />{" "}
                Learning: {learningCount}
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-2.5 w-2.5 rounded-full bg-accent" />{" "}
                Mastered: {mastered}
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
                      if (rz) {
                        setMapCenter(rz.center);
                        setMapZoom(rz.zoom);
                      }
                    }}
                    className="cursor-pointer rounded-lg border border-border bg-surface px-3 py-1.5 font-mono text-xs text-foreground-muted transition-all duration-150 hover:bg-[#1a1a1a] hover:border-[#333333] active:scale-[0.98]"
                  >
                    {region} ·{" "}
                    <span className="text-accent">{regionMastered}</span>/
                    {total}
                  </button>
                );
              })}
            </div>

            {/* ── Countries Grid ───────────────────────────────────────── */}
            <div className="mb-6 rounded-xl border border-border bg-surface p-4">
              <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.08em] text-foreground-muted">
                {playedCount > 0
                  ? `${playedCount} countries explored`
                  : "Countries"}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {playedCount === 0 ? (
                  <p className="text-xs text-foreground-muted">
                    Play a game to start tracking countries!
                  </p>
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
                        bg = "bg-[#fb923c]/15";
                        text = "text-[#fb923c]";
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
                    <span className="inline-block h-2 w-2 rounded-full bg-accent" />{" "}
                    Mastered (3+)
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="inline-block h-2 w-2 rounded-full bg-[#fb923c]" />{" "}
                    Learning (1-2)
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="inline-block h-2 w-2 rounded-full bg-[#888888]" />{" "}
                    Seen
                  </span>
                </div>
              )}
            </div>

            {/* ── Recent Games (Overview) ─────────────────────────────────── */}
            {data.recentScores.length > 0 && (
              <div className="mb-6 rounded-xl border border-border bg-surface overflow-hidden">
                <div className="border-b border-border px-4 py-3">
                  <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-foreground-muted">
                    Recent Games
                  </p>
                </div>
                <div className="divide-y divide-[#1a1a1a]">
                  {data.recentScores.map((s, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-3 px-4 py-2.5"
                    >
                      <div className="min-w-0 flex-1">
                        <span className="text-sm font-semibold text-foreground">
                          {s.category || "All World"}
                        </span>
                        <p className="text-xs text-foreground-muted">
                          {formatDate(s.created_at)}
                        </p>
                      </div>
                      <span className="shrink-0 font-mono text-sm font-bold text-accent">
                        {s.score.toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Survival slim row (Overview) ─────────────────────────────── */}
            {(() => {
              const sv = data.survival;
              const furthestTier =
                sv.bestStreak >= 19
                  ? "Hard"
                  : sv.bestStreak >= 9
                  ? "Medium"
                  : sv.games > 0
                  ? "Easy"
                  : "—";
              return (
                <div className="mb-6 flex items-center justify-between border-t border-border pt-4">
                  <div className="flex items-center gap-2 text-sm text-foreground-muted">
                    <Swords className="h-3.5 w-3.5" strokeWidth={1.5} />
                    <span>Survival</span>
                    <span className="text-[#444444]">·</span>
                    <span>{sv.games} games</span>
                    {sv.bestScore > 0 && (
                      <>
                        <span className="text-[#444444]">·</span>
                        <span>
                          Best:{" "}
                          <span className="font-mono font-semibold text-accent">
                            {sv.bestScore.toLocaleString()}
                          </span>
                        </span>
                        <span className="text-[#444444]">·</span>
                        <span>Furthest: {furthestTier}</span>
                      </>
                    )}
                  </div>
                  <a
                    href="/game?difficulty=survival&category=All%20World"
                    className="cursor-pointer rounded-lg border border-[#333333] px-3 py-1.5 text-xs font-semibold text-foreground transition-all duration-150 hover:bg-[#1a1a1a] hover:border-[#444444] active:scale-[0.98]"
                  >
                    <Play className="mr-1 inline h-3 w-3" strokeWidth={1.5} />
                    Play
                  </a>
                </div>
              );
            })()}
          </>
        ) : profileTab === "collection" ? (
          /* ── COLLECTION TAB ──────────────────────────────────────────── */
          <>
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm text-foreground">
                <span className="font-bold text-accent">
                  {data.collectibles.length}
                </span>
                <span className="text-foreground-muted">
                  {" "}
                  / {countries.length} cards collected
                </span>
              </p>
              <select
                value={collectionSort}
                onChange={(e) =>
                  setCollectionSort(
                    e.target.value as "recent" | "rarity" | "alpha"
                  )
                }
                className="cursor-pointer rounded-md border border-border bg-surface px-2 py-1 text-xs text-foreground-muted focus:border-accent focus:outline-none"
              >
                <option value="recent">Recently unlocked</option>
                <option value="rarity">Rarity</option>
                <option value="alpha">Alphabetical</option>
              </select>
            </div>
            <div className="mb-4 flex gap-1.5">
              {["all", "common", "uncommon", "rare", "legendary"].map((r) => (
                <button
                  key={r}
                  onClick={() => setRarityFilter(r)}
                  className={`cursor-pointer rounded-full px-3 py-1 text-[11px] font-medium transition-all duration-150 ${
                    rarityFilter === r
                      ? "bg-accent/15 text-accent"
                      : "bg-surface-elevated text-foreground-muted hover:text-foreground"
                  }`}
                >
                  {r === "all" ? "All" : r.charAt(0).toUpperCase() + r.slice(1)}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {(() => {
                const unlockedSet = new Set(
                  data.collectibles.map((c) => c.country)
                );
                const unlockMap = new Map(
                  data.collectibles.map((c) => [c.country, c])
                );
                const rarityOrder: Record<string, number> = {
                  legendary: 0,
                  rare: 1,
                  uncommon: 2,
                  common: 3,
                };
                let allCards = countries.map((c) => ({
                  country: c,
                  unlocked: unlockedSet.has(c.name),
                  unlockedAt: unlockMap.get(c.name)?.unlocked_at,
                }));
                if (rarityFilter !== "all")
                  allCards = allCards.filter(
                    (c) => c.country.rarity === rarityFilter
                  );
                if (collectionSort === "recent")
                  allCards.sort((a, b) => {
                    if (a.unlocked && !b.unlocked) return -1;
                    if (!a.unlocked && b.unlocked) return 1;
                    if (a.unlocked && b.unlocked)
                      return (
                        new Date(b.unlockedAt!).getTime() -
                        new Date(a.unlockedAt!).getTime()
                      );
                    return 0;
                  });
                else if (collectionSort === "rarity")
                  allCards.sort(
                    (a, b) =>
                      (rarityOrder[a.country.rarity] ?? 9) -
                      (rarityOrder[b.country.rarity] ?? 9)
                  );
                else
                  allCards.sort((a, b) =>
                    a.country.name.localeCompare(b.country.name)
                  );

                const RS: Record<
                  string,
                  {
                    border: string;
                    glow: string;
                    glowHover: string;
                    flagBg: string;
                    bg: string;
                    badgeBg: string;
                    badgeBorder: string;
                    color: string;
                  }
                > = {
                  common: {
                    border: "#666666",
                    glow: "0 0 12px rgba(150,150,150,0.15)",
                    glowHover: "0 0 24px rgba(150,150,150,0.25)",
                    flagBg: "rgba(150,150,150,0.05)",
                    bg: "#111111",
                    badgeBg: "rgba(150,150,150,0.15)",
                    badgeBorder: "#666666",
                    color: "#888888",
                  },
                  uncommon: {
                    border: "#4ade80",
                    glow: "0 0 12px rgba(74,222,128,0.15)",
                    glowHover: "0 0 24px rgba(74,222,128,0.3)",
                    flagBg: "rgba(74,222,128,0.05)",
                    bg: "#0f1a0f",
                    badgeBg: "rgba(74,222,128,0.12)",
                    badgeBorder: "rgba(74,222,128,0.4)",
                    color: "#4ade80",
                  },
                  rare: {
                    border: "#fb923c",
                    glow: "0 0 12px rgba(251,146,60,0.15)",
                    glowHover: "0 0 24px rgba(251,146,60,0.3)",
                    flagBg: "rgba(251,146,60,0.05)",
                    bg: "#1a0f0a",
                    badgeBg: "rgba(251,146,60,0.12)",
                    badgeBorder: "rgba(251,146,60,0.4)",
                    color: "#fb923c",
                  },
                  legendary: {
                    border: "#7F77DD",
                    glow: "0 0 12px rgba(127,119,221,0.2)",
                    glowHover: "0 0 28px rgba(127,119,221,0.4)",
                    flagBg: "rgba(127,119,221,0.07)",
                    bg: "#0f0f1a",
                    badgeBg: "rgba(127,119,221,0.15)",
                    badgeBorder: "rgba(127,119,221,0.5)",
                    color: "#7F77DD",
                  },
                };

                return allCards.map(({ country: c, unlocked }, idx) => {
                  const s = RS[c.rarity] ?? RS.common;
                  const continent = CONTINENT_MAP[c.code] ?? "";

                  if (!unlocked) {
                    return (
                      <div
                        key={c.code}
                        className="flex flex-col rounded-xl"
                        style={{
                          width: "100%",
                          minHeight: 230,
                          background: "#0a0a0a",
                          border: "1px solid #1a1a1a",
                          animation: `fadeIn 300ms ease-out ${idx * 15}ms both`,
                        }}
                      >
                        <div className="flex h-20 items-center justify-center">
                          <Lock className="h-7 w-7 text-[#222222]" strokeWidth={1.5} />
                        </div>
                        <div className="flex flex-1 flex-col px-3 pb-3">
                          <p className="text-[13px] font-bold text-[#222222]">{c.name}</p>
                          <span
                            className="mt-auto self-end rounded-full px-1.5 py-0.5 text-[8px] font-semibold uppercase"
                            style={{ letterSpacing: "0.1em", background: `${s.badgeBg}`, border: `1px solid ${s.badgeBorder}40`, color: `${s.color}50` }}
                          >
                            {c.rarity}
                          </span>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={c.code}
                      className="group flex cursor-pointer flex-col rounded-xl transition-all duration-200 hover:-translate-y-1.5"
                      style={{
                        width: "100%",
                        minHeight: 230,
                        background: s.bg,
                        border: `1px solid ${s.border}`,
                        boxShadow: s.glow,
                        animation: `fadeIn 300ms ease-out ${idx * 15}ms both`,
                      }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLElement).style.boxShadow =
                          s.glowHover;
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLElement).style.boxShadow =
                          s.glow;
                      }}
                    >
                      {/* Flag area */}
                      <div
                        className="relative flex h-20 items-center justify-center"
                        style={{
                          background: s.flagBg,
                          borderBottom: `1px solid ${s.border}20`,
                        }}
                      >
                        <img
                          src={`https://flagcdn.com/w80/${c.code2}.png`}
                          alt={`${c.name} flag`}
                          className="h-12 w-auto object-contain"
                        />
                        </div>

                      {/* Body */}
                      <div className="flex flex-1 flex-col px-3 py-2.5">
                        <p className="text-[13px] font-bold leading-tight text-[#f0f0f0]">{c.name}</p>
                        <p className="mt-0.5 text-[11px] font-medium" style={{ color: s.color }}>{c.capital}</p>
                        <p className="mt-1.5 flex-1 text-[10px] italic leading-[1.4] text-[#444444]">{c.funFact}</p>
                        <div className="mt-2 flex items-center justify-between">
                          <span className="text-[9px] text-[#333333]">{continent}</span>
                          <span
                            className="rounded-full px-1.5 py-0.5 text-[8px] font-semibold uppercase"
                            style={{ letterSpacing: "0.1em", background: s.badgeBg, border: `1px solid ${s.badgeBorder}`, color: s.color }}
                          >
                            {c.rarity}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </>
        ) : (
          /* ── DAILY TAB ───────────────────────────────────────────────── */
          <>
            {data.daily.daysPlayed === 0 ? (
              <div className="py-10 text-center">
                <Calendar
                  className="mx-auto mb-3 h-8 w-8 text-[#333333]"
                  strokeWidth={1.5}
                />
                <p className="text-sm text-foreground-muted">
                  No daily challenges yet
                </p>
                <p className="mt-1 text-xs text-[#555555]">
                  Play today&apos;s challenge to start tracking
                </p>
                <a
                  href="/game?difficulty=daily"
                  className="mt-3 inline-block cursor-pointer rounded-lg bg-accent px-5 py-2 text-xs font-semibold text-[#0a0a0a] transition-all duration-150 hover:bg-accent-hover active:scale-[0.98]"
                >
                  Play today&apos;s challenge →
                </a>
              </div>
            ) : (
              <>
                {/* Daily streak */}
                <div className="mb-4">
                  {data.daily.streak > 0 ? (
                    <div className="flex items-center gap-2">
                      <Flame
                        className="h-5 w-5 text-accent"
                        strokeWidth={1.5}
                      />
                      <span className="font-mono text-xl font-bold text-foreground">
                        {data.daily.streak}
                      </span>
                      <span className="text-sm text-foreground-muted">
                        day streak
                      </span>
                    </div>
                  ) : (
                    <a
                      href="/game?difficulty=daily"
                      className="inline-block cursor-pointer rounded-lg bg-accent px-5 py-2 text-xs font-semibold text-[#0a0a0a] transition-all duration-150 hover:bg-accent-hover active:scale-[0.98]"
                    >
                      Play today&apos;s challenge →
                    </a>
                  )}
                </div>

                {/* Stats */}
                <div
                  className="mb-4 grid grid-cols-3 overflow-hidden rounded-lg bg-[#222222]"
                  style={{ gap: 1 }}
                >
                  <div className="bg-[#111111] px-3 py-2.5 text-center">
                    <p
                      className="text-[10px] font-medium uppercase text-[#444444]"
                      style={{ letterSpacing: "0.08em" }}
                    >
                      Days
                    </p>
                    <p className="mt-0.5 font-mono text-lg font-bold text-foreground">
                      {data.daily.daysPlayed}
                    </p>
                  </div>
                  <div className="bg-[#111111] px-3 py-2.5 text-center">
                    <p
                      className="text-[10px] font-medium uppercase text-[#444444]"
                      style={{ letterSpacing: "0.08em" }}
                    >
                      Best
                    </p>
                    <p className="mt-0.5 font-mono text-lg font-bold text-accent">
                      {data.daily.bestScore.toLocaleString()}
                    </p>
                  </div>
                  <div className="bg-[#111111] px-3 py-2.5 text-center">
                    <p
                      className="text-[10px] font-medium uppercase text-[#444444]"
                      style={{ letterSpacing: "0.08em" }}
                    >
                      Streak
                    </p>
                    <p className="mt-0.5 font-mono text-lg font-bold text-foreground">
                      {data.daily.streak}
                    </p>
                  </div>
                </div>

                {/* Calendar heatmap */}
                {(() => {
                  const playedDates = new Set(
                    data.daily.history.map((h) => h.date)
                  );
                  const scoreByDate = new Map(
                    data.daily.history.map((h) => [h.date, h.score])
                  );
                  const today = new Date().toISOString().slice(0, 10);
                  const days: { date: string; label: string }[] = [];
                  for (let i = 29; i >= 0; i--) {
                    const d = new Date();
                    d.setDate(d.getDate() - i);
                    days.push({
                      date: d.toISOString().slice(0, 10),
                      label: d.toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      }),
                    });
                  }
                  return (
                    <div className="mb-4">
                      <div className="flex flex-wrap gap-[3px]">
                        {days.map((d) => {
                          const played = playedDates.has(d.date);
                          const score = scoreByDate.get(d.date);
                          const isToday = d.date === today;
                          let bg: string;
                          if (played && score && score >= 8000) bg = "#4ade80";
                          else if (played) bg = "rgba(74,222,128,0.4)";
                          else if (isToday) bg = "#222222";
                          else bg = "#1a1a1a";
                          const border = isToday ? "1px solid #f0f0f0" : "none";
                          return (
                            <div
                              key={d.date}
                              title={
                                played
                                  ? `${d.label}: ${score?.toLocaleString()} pts`
                                  : d.label
                              }
                              className="rounded-[4px]"
                              style={{
                                width: 32,
                                height: 32,
                                background: bg,
                                border,
                              }}
                            />
                          );
                        })}
                      </div>
                      <div className="mt-2 flex gap-3 text-[10px] text-[#555555]">
                        <span className="flex items-center gap-1">
                          <span className="inline-block h-2 w-2 rounded-sm bg-[#1a1a1a]" />{" "}
                          Not played
                        </span>
                        <span className="flex items-center gap-1">
                          <span
                            className="inline-block h-2 w-2 rounded-sm"
                            style={{ background: "rgba(74,222,128,0.4)" }}
                          />{" "}
                          Played
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="inline-block h-2 w-2 rounded-sm bg-accent" />{" "}
                          Top score
                        </span>
                      </div>
                    </div>
                  );
                })()}

                {/* History list */}
                {data.daily.history.length > 0 && (
                  <div className="overflow-hidden rounded-lg border border-[#222222]">
                    <div className="divide-y divide-[#1a1a1a]">
                      {data.daily.history.slice(0, 10).map((h) => {
                        const d = new Date(h.date + "T00:00:00");
                        const dateStr = d.toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        });
                        const correct = Math.max(
                          0,
                          Math.min(10, Math.round(h.score / 1000))
                        );
                        return (
                          <div
                            key={h.date}
                            className="flex items-center gap-3 px-3 py-2.5"
                          >
                            <span className="w-16 shrink-0 text-xs text-foreground-muted">
                              {dateStr}
                            </span>
                            <span className="flex-1 font-mono text-sm font-bold text-accent">
                              {h.score.toLocaleString()}
                            </span>
                            <span
                              className={`text-xs ${
                                correct === 10
                                  ? "text-accent"
                                  : "text-foreground-muted"
                              }`}
                            >
                              {correct}/10
                            </span>
                            {h.score === data.daily.bestScore && (
                              <Trophy
                                className="h-3 w-3 text-accent"
                                strokeWidth={1.5}
                              />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
