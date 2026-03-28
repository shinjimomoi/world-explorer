"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { getTopScores, getDailyScores, type LeaderboardEntry } from "@/lib/leaderboard";
import { useUser } from "@clerk/nextjs";
import { Flame } from "lucide-react";

const MODES = ["Classic", "Survival", "Daily"] as const;
const REGIONS = ["All", "Africa", "Americas", "Asia", "Europe", "Oceania", "Microstates"] as const;

function resolveInitialMode(cat: string): (typeof MODES)[number] {
  if (cat === "Survival") return "Survival";
  if (cat === "Daily") return "Daily";
  return "Classic";
}

function resolveInitialRegion(cat: string): string {
  if (REGIONS.includes(cat as (typeof REGIONS)[number])) return cat;
  return "All";
}

export default function LeaderboardPage() {
  return (
    <Suspense>
      <LeaderboardContent />
    </Suspense>
  );
}

function getLast7Days(): { date: string; label: string }[] {
  const days: { date: string; label: string }[] = [];
  const today = new Date().toISOString().slice(0, 10);
  for (let i = 0; i < 7; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    days.push({
      date: dateStr,
      label: i === 0 ? "Today" : d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    });
  }
  return days;
}

function LeaderboardContent() {
  const searchParams = useSearchParams();
  const { isSignedIn, user: clerkUser } = useUser();
  const initialCat = searchParams.get("category") ?? "All";
  const [mode, setMode] = useState<(typeof MODES)[number]>(resolveInitialMode(initialCat));
  const [region, setRegion] = useState(resolveInitialRegion(initialCat));
  const [dailyDate, setDailyDate] = useState(new Date().toISOString().slice(0, 10));
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const dailyDays = getLast7Days();

  // Compute the actual filter value
  const filterCategory =
    mode === "Survival" ? "Survival"
    : mode === "Daily" ? "Daily Challenge"
    : region === "All" ? undefined
    : region;

  useEffect(() => {
    setLoading(true);
    setError(null);
    if (mode === "Daily") {
      getDailyScores(dailyDate)
        .then(setEntries)
        .catch(() => setError("Failed to load scores."))
        .finally(() => setLoading(false));
    } else {
      getTopScores(filterCategory)
        .then(setEntries)
        .catch(() => setError("Failed to load scores."))
        .finally(() => setLoading(false));
    }
  }, [mode, filterCategory, dailyDate]);

  return (
    <div className="flex flex-1 flex-col items-center overflow-y-auto px-4 py-10">
      <div className="w-full max-w-xl">
        <div className="mb-8 text-center">
          <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.08em] text-foreground-muted">
            Hall of Fame
          </p>
          <h1 className="text-4xl font-bold text-foreground">Leaderboard</h1>
        </div>

        {/* Level 1: Mode tabs */}
        <div className="mb-3 flex gap-1 border-b border-border pb-px">
          {MODES.map((m) => (
            <button
              key={m}
              onClick={() => { setMode(m); if (m !== "Classic") setRegion("All"); }}
              className={`cursor-pointer px-4 py-2 text-sm font-medium transition-all duration-150 ${
                mode === m
                  ? "border-b-2 border-accent text-foreground"
                  : "text-foreground-muted hover:text-[#aaaaaa]"
              }`}
            >
              {m}
            </button>
          ))}
        </div>

        {/* Level 2: Region pills (only for Classic) */}
        {mode === "Classic" && (
          <div className="mb-4 flex gap-1.5">
            {REGIONS.map((r) => (
              <button
                key={r}
                onClick={() => setRegion(r)}
                className={`cursor-pointer rounded-full px-3 py-1 text-[11px] font-medium transition-all duration-150 ${
                  region === r
                    ? "bg-accent/15 text-accent"
                    : "text-foreground-muted hover:text-foreground"
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        )}

        {/* Daily date pills */}
        {mode === "Daily" && (
          <div className="mb-4 flex gap-1.5 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
            {dailyDays.map((d) => (
              <button
                key={d.date}
                onClick={() => setDailyDate(d.date)}
                className={`cursor-pointer shrink-0 rounded-full px-3 py-1 text-[11px] font-medium transition-all duration-150 ${
                  dailyDate === d.date
                    ? "bg-[#1a2a1a] border border-accent text-accent"
                    : "bg-[#111111] border border-[#222222] text-[#666666] hover:text-foreground"
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>
        )}

        <div className="overflow-hidden rounded-2xl border border-border bg-surface">
          {loading ? (
            <div className="divide-y divide-[#1a1a1a]">
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-3 animate-pulse">
                  <div className="h-4 w-6 rounded bg-surface-elevated" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3.5 w-28 rounded bg-surface-elevated" />
                  </div>
                  <div className="h-3.5 w-14 rounded bg-surface-elevated" />
                  <div className="h-3.5 w-10 rounded bg-surface-elevated" />
                  <div className="hidden h-3 w-16 rounded bg-surface-elevated sm:block" />
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="px-6 py-12 text-center text-[#f87171]">{error}</div>
          ) : entries.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <p className="text-foreground-muted">
                {mode === "Daily"
                  ? "No one played on this day yet."
                  : mode === "Classic" && region === "All"
                  ? "No scores yet. Play a game to get on the board!"
                  : `No scores for ${mode === "Classic" ? region : mode} yet.`}
              </p>
              <a
                href={mode === "Daily" ? "/game?difficulty=daily" : mode === "Survival" ? "/game?difficulty=survival" : region === "All" ? "/game" : `/game?category=${region}`}
                className="mt-4 inline-block rounded-lg bg-[#f0f0f0] px-6 py-2.5 text-sm font-semibold text-[#0a0a0a] transition-all duration-150 hover:bg-[#e5e5e5] active:scale-[0.98]"
              >
                Play Now
              </a>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="px-4 py-3 text-[11px] font-medium uppercase tracking-[0.08em] text-foreground-muted w-10">#</th>
                  <th className="px-4 py-3 text-[11px] font-medium uppercase tracking-[0.08em] text-foreground-muted">Player</th>
                  <th className="px-4 py-3 text-[11px] font-medium uppercase tracking-[0.08em] text-foreground-muted text-right">Score</th>
                  <th className="px-4 py-3 text-[11px] font-medium uppercase tracking-[0.08em] text-foreground-muted text-right">Streak</th>
                  {mode !== "Daily" && (
                    <th className="px-4 py-3 text-[11px] font-medium uppercase tracking-[0.08em] text-foreground-muted text-right hidden sm:table-cell">Date</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1a1a1a]">
                {entries.map((entry, i) => {
                  const isCurrentUser = mode === "Daily" && isSignedIn && clerkUser && entry.userId === clerkUser.id;
                  return (
                    <tr
                      key={i}
                      className="transition-colors hover:bg-surface-elevated"
                      style={{
                        borderLeft: isCurrentUser ? "2px solid #4ade80" : i < 3 ? "2px solid #4ade80" : "none",
                        background: isCurrentUser ? "#0f1a0f" : undefined,
                      }}
                    >
                      <td className="px-4 py-3 font-mono text-sm tabular-nums text-foreground-muted">
                        {i + 1}
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold text-foreground">
                        {entry.name}
                        {isCurrentUser && <span className="ml-1.5 text-[10px] text-accent">(you)</span>}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-sm font-bold tabular-nums text-accent">
                        {entry.score.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-sm tabular-nums text-accent">
                        {entry.bestStreak > 0 ? (
                          <span className="inline-flex items-center justify-end gap-0.5">
                            <Flame className="h-3 w-3" strokeWidth={1.5} /> {entry.bestStreak}
                          </span>
                        ) : "—"}
                      </td>
                      {mode !== "Daily" && (
                        <td className="px-4 py-3 text-right text-xs text-foreground-muted hidden sm:table-cell">
                          {new Date(entry.date).toLocaleDateString()}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
