"use client";

import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { countries } from "@/data/countries";
import { CONTINENT_MAP, filterCountries } from "@/data/categories";
import { Flame } from "lucide-react";

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

// ─── Date formatting ─────────────────────────────────────────────────────────

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
  country_code: string;
  correct_count: number;
  attempts: number;
}

interface ScoreRow {
  score: number;
  best_streak: number;
  category: string;
  difficulty: string;
  created_at: string;
}

interface ProfileData {
  user: { id: string; name: string; email: string; avatar_url: string; xp: number } | null;
  mastery: MasteryRow[];
  recentScores: ScoreRow[];
  bestStreak: number;
  totalGames: number;
}

// ─── Regions for mastery breakdown ───────────────────────────────────────────

const REGIONS = ["Africa", "Americas", "Asia", "Europe", "Oceania"] as const;

export default function ProfilePage() {
  const { isSignedIn, isLoaded, user } = useUser();
  const router = useRouter();
  const [data, setData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) {
      router.replace("/?message=signin");
      return;
    }
    fetch(`/api/profile?userId=${user.id}`)
      .then((r) => r.json())
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [isLoaded, isSignedIn, user, router]);

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

  const totalCorrect = data.mastery.reduce((s, m) => s + m.correct_count, 0);
  const totalAttempts = data.mastery.reduce((s, m) => s + m.attempts, 0);
  const accuracy = totalAttempts > 0 ? Math.round((totalCorrect / totalAttempts) * 100) : 0;
  const mastered = data.mastery.filter((m) => m.correct_count >= 3).length;

  // Build mastery lookup
  const masteryMap = new Map(data.mastery.map((m) => [m.country_code, m]));

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

        {/* ── Mastery by Region ────────────────────────────────────── */}
        <div className="mb-6 rounded-xl border border-border bg-surface p-4">
          <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.08em] text-foreground-muted">
            Mastery by Region
          </p>
          <div className="flex flex-col gap-3">
            {REGIONS.map((region) => {
              const total = filterCountries(region).length;
              const regionMastered = data.mastery.filter(
                (m) =>
                  m.correct_count >= 3 && CONTINENT_MAP[m.country_code] === region
              ).length;
              const pct = total > 0 ? (regionMastered / total) * 100 : 0;
              const barColor =
                pct > 50 ? "#4ade80" : pct >= 10 ? "#EF9F27" : "#333333";
              return (
                <div key={region}>
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-sm text-foreground">{region}</span>
                    <span className="font-mono text-xs text-foreground-muted">
                      {regionMastered}/{total}
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-[#1a1a1a]">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${Math.max(pct, 1)}%`,
                        backgroundColor: barColor,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Countries Grid ───────────────────────────────────────── */}
        <div className="mb-6 rounded-xl border border-border bg-surface p-4">
          <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.08em] text-foreground-muted">
            Countries
          </p>
          <div className="flex flex-wrap gap-1.5">
            {countries.map((c) => {
              const m = masteryMap.get(c.code);
              let bg = "bg-surface-elevated";
              let text = "text-foreground-muted";
              if (m) {
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
              }
              return (
                <span
                  key={c.code}
                  className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${bg} ${text}`}
                >
                  {c.name}
                </span>
              );
            })}
          </div>
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
      </div>
    </div>
  );
}
