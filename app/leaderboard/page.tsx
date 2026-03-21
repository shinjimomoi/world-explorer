"use client";

import { useEffect, useState } from "react";
import { getTopScores, type LeaderboardEntry } from "@/lib/leaderboard";

export default function LeaderboardPage() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getTopScores()
      .then(setEntries)
      .catch(() => setError("Failed to load scores."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="flex flex-1 flex-col items-center px-4 py-10">
      <div className="w-full max-w-xl">
        <div className="mb-8 text-center">
          <p className="mb-1 text-sm font-medium uppercase tracking-widest text-foreground-muted">
            Hall of Fame
          </p>
          <h1 className="text-4xl font-bold text-foreground">Leaderboard</h1>
        </div>

        <div className="rounded-xl border border-border bg-surface overflow-hidden">
          {loading ? (
            <div className="divide-y divide-border">
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
            <div className="px-6 py-12 text-center text-red-400">{error}</div>
          ) : entries.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <p className="text-foreground-muted">No scores yet. Play a game to get on the board!</p>
              <a
                href="/game"
                className="mt-4 inline-block rounded-lg bg-accent px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-hover"
              >
                Play Now
              </a>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-foreground-muted w-10">#</th>
                  <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-foreground-muted">Player</th>
                  <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-foreground-muted text-right">Score</th>
                  <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-foreground-muted text-right">Streak</th>
                  <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-foreground-muted text-right hidden sm:table-cell">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {entries.map((entry, i) => {
                  const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : null;
                  const rankColor =
                    i === 0 ? "#fbbf24" : i === 1 ? "#94a3b8" : i === 2 ? "#b45309" : undefined;
                  return (
                    <tr key={i} className="transition-colors hover:bg-surface-elevated">
                      <td className="px-4 py-3 text-sm font-bold tabular-nums" style={{ color: rankColor }}>
                        {medal ?? i + 1}
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold text-foreground">
                        {entry.name}
                      </td>
                      <td className="px-4 py-3 text-right text-sm font-bold tabular-nums text-accent">
                        {entry.score.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right text-sm tabular-nums text-amber-400">
                        {entry.bestStreak > 0 ? `🔥 ${entry.bestStreak}` : "—"}
                      </td>
                      <td className="px-4 py-3 text-right text-xs text-foreground-muted hidden sm:table-cell">
                        {new Date(entry.date).toLocaleDateString()}
                      </td>
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
