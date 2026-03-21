import { supabase } from "./supabase";

export interface LeaderboardEntry {
  name: string;
  score: number;
  bestStreak: number;
  date: string;
}

export async function saveScore(
  name: string,
  score: number,
  bestStreak: number,
): Promise<void> {
  const { error } = await supabase
    .from("scores")
    .insert({ name, score, best_streak: bestStreak });
  if (error) throw error;
}

export async function getTopScores(): Promise<LeaderboardEntry[]> {
  const { data, error } = await supabase
    .from("scores")
    .select("name, score, best_streak, created_at")
    .order("score", { ascending: false })
    .limit(10);
  if (error) throw error;
  return (data ?? []).map((row) => ({
    name: row.name,
    score: row.score,
    bestStreak: row.best_streak,
    date: row.created_at,
  }));
}
