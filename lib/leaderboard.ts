import { supabase } from "./supabase";

export interface LeaderboardEntry {
  name: string;
  score: number;
  bestStreak: number;
  category: string;
  date: string;
}

export async function saveScore(
  name: string,
  score: number,
  bestStreak: number,
  category: string = "All World",
): Promise<void> {
  const { error } = await supabase
    .from("scores")
    .insert({ name, score, best_streak: bestStreak, category });
  if (error) throw error;
}

export async function getTopScores(): Promise<LeaderboardEntry[]> {
  const { data, error } = await supabase
    .from("scores")
    .select("name, score, best_streak, category, created_at")
    .order("score", { ascending: false })
    .limit(10);
  if (error) throw error;
  return (data ?? []).map((row) => ({
    name: row.name,
    score: row.score,
    bestStreak: row.best_streak,
    category: row.category ?? "All World",
    date: row.created_at,
  }));
}
