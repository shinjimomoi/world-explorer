import { supabase } from "./supabase";

export interface LeaderboardEntry {
  name: string;
  score: number;
  bestStreak: number;
  category: string;
  date: string;
  userId?: string;
}

export async function saveScore(
  name: string,
  score: number,
  bestStreak: number,
  category: string = "All World",
  userId?: string,
): Promise<void> {
  const row: Record<string, unknown> = { name, score, best_streak: bestStreak, category };
  if (userId) row.user_id = userId;
  const { error } = await supabase
    .from("scores")
    .insert(row);
  if (error) throw error;
}

export async function getTopScores(
  category?: string,
): Promise<LeaderboardEntry[]> {
  let query = supabase
    .from("scores")
    .select("name, score, best_streak, category, created_at, user_id")
    .order("score", { ascending: false })
    .limit(10);
  if (category && category !== "All") {
    query = query.eq("category", category);
  }
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map((row) => ({
    name: row.name,
    score: row.score,
    bestStreak: row.best_streak,
    category: row.category ?? "All World",
    date: row.created_at,
    userId: row.user_id ?? undefined,
  }));
}

export async function getDailyScores(
  dateStr: string,
): Promise<LeaderboardEntry[]> {
  const startOfDay = `${dateStr}T00:00:00.000Z`;
  const endOfDay = `${dateStr}T23:59:59.999Z`;
  const { data, error } = await supabase
    .from("scores")
    .select("name, score, best_streak, category, created_at, user_id")
    .eq("category", "Daily Challenge")
    .gte("created_at", startOfDay)
    .lte("created_at", endOfDay)
    .order("score", { ascending: false })
    .limit(10);
  if (error) throw error;
  return (data ?? []).map((row) => ({
    name: row.name,
    score: row.score,
    bestStreak: row.best_streak,
    category: row.category ?? "Daily Challenge",
    date: row.created_at,
    userId: row.user_id ?? undefined,
  }));
}
