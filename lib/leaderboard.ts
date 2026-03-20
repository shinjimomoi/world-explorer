export interface LeaderboardEntry {
  name: string;
  score: number;
  bestStreak: number;
  date: string; // ISO date string
}

const STORAGE_KEY = "world-explorer-leaderboard";
const MAX_ENTRIES = 10;

export function saveEntry(entry: LeaderboardEntry): void {
  const all = getAllEntries();
  all.push(entry);
  all.sort((a, b) => b.score - a.score);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all.slice(0, MAX_ENTRIES)));
}

export function getTopEntries(): LeaderboardEntry[] {
  return getAllEntries().slice(0, MAX_ENTRIES);
}

function getAllEntries(): LeaderboardEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
