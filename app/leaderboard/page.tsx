"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { getTopScores, type LeaderboardEntry } from "@/lib/leaderboard";
import { Flame } from "lucide-react";

const TABS = ["All", "Africa", "Americas", "Asia", "Europe", "Oceania", "Microstates"] as const;

export default function LeaderboardPage() {
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("category") ?? "All";
  const [tab, setTab] = useState(
    TABS.includes(initialTab as (typeof TABS)[number]) ? initialTab : "All",
  );
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    getTopScores(tab === "All" ? undefined : tab)
      .then(setEntries)
      .catch(() => setError("Failed to load scores."))
      .finally(() => setLoading(false));
  }, [tab]);

  return (
    <div className="flex flex-1 flex-col items-center overflow-y-auto px-4 py-10">
      <div className="w-full max-w-xl">
        <div className="mb-8 text-center">
          <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.08em] text-foreground-muted">
            Hall of Fame
          </p>
          <h1 className="text-4xl font-bold text-foreground">Leaderboard</h1>
        </div>

        {/* Tabs */}
        <div className="mb-4 flex gap-1 overflow-x-auto border-b border-border pb-px">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`shrink-0 px-3 py-2 text-xs font-medium transition-colors ${
                tab === t
                  ? "border-b-2 border-accent text-foreground"
                  : "text-foreground-muted hover:text-foreground"
              }`}
            >
              {t === "All" ? "All" : t}
            </button>
          ))}
        </div>

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
                {tab === "All"
                  ? "No scores yet. Play a game to get on the board!"
                  : `No scores for ${tab} yet.`}
              </p>
              <a
                href={tab === "All" ? "/game" : `/game?category=${tab}`}
                className="mt-4 inline-block rounded-lg bg-[#f0f0f0] px-6 py-2.5 text-sm font-semibold text-[#0a0a0a] transition-colors hover:bg-white"
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
                  <th className="px-4 py-3 text-[11px] font-medium uppercase tracking-[0.08em] text-foreground-muted text-right hidden sm:table-cell">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1a1a1a]">
                {entries.map((entry, i) => (
                  <tr
                    key={i}
                    className="transition-colors hover:bg-surface-elevated"
                    style={i < 3 ? { borderLeft: "2px solid #4ade80" } : undefined}
                  >
                    <td className="px-4 py-3 font-mono text-sm tabular-nums text-foreground-muted">
                      {i + 1}
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-foreground">
                      {entry.name}
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
                    <td className="px-4 py-3 text-right text-xs text-foreground-muted hidden sm:table-cell">
                      {new Date(entry.date).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
