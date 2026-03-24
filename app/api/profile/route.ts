import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");

  if (!userId) {
    return NextResponse.json({ error: "Missing userId" }, { status: 400 });
  }

  console.log("[profile] Fetching data for userId:", userId);

  try {
    // Fetch user row
    const { data: user, error: userErr } = await supabaseAdmin
      .from("users")
      .select("*")
      .eq("id", userId)
      .single();

    console.log("[profile] User:", user, "Error:", userErr);

    // Fetch mastery rows
    const { data: mastery, error: masteryErr } = await supabaseAdmin
      .from("mastery")
      .select("country, attempts, correct_count")
      .eq("user_id", userId);

    console.log("[profile] Mastery rows:", mastery?.length, "Error:", masteryErr);

    // Fetch recent scores
    const { data: scores, error: scoresErr } = await supabaseAdmin
      .from("scores")
      .select("score, best_streak, category, difficulty, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(5);

    console.log("[profile] Scores:", scores?.length, "Error:", scoresErr);

    // Best streak from scores
    const { data: bestStreakRow } = await supabaseAdmin
      .from("scores")
      .select("best_streak")
      .eq("user_id", userId)
      .order("best_streak", { ascending: false })
      .limit(1)
      .single();

    const bestStreak = bestStreakRow?.best_streak ?? 0;
    console.log("[profile] Best streak:", bestStreak);

    // Mastered count
    const masteredCount = (mastery ?? []).filter((m) => m.correct_count >= 3).length;

    // Survival stats
    const { data: survivalScores } = await supabaseAdmin
      .from("scores")
      .select("score, best_streak, created_at")
      .eq("user_id", userId)
      .eq("category", "Survival")
      .order("score", { ascending: false });

    const survivalGames = survivalScores?.length ?? 0;
    const survivalBestScore = survivalScores?.[0]?.score ?? 0;
    const survivalBestStreak = survivalGames > 0
      ? Math.max(...(survivalScores ?? []).map((s) => s.best_streak ?? 0))
      : 0;
    // Approximate rounds from score: each correct ~500-1000 pts
    // We can't know exact rounds without storing them, so show game count + best score

    const result = {
      user,
      mastery: mastery ?? [],
      recentScores: scores ?? [],
      bestStreak,
      totalGames: user?.total_games ?? 0,
      accuracy: user?.total_guesses > 0
        ? Math.round(((user?.total_correct ?? 0) / user.total_guesses) * 100)
        : 0,
      masteredCount,
      survival: {
        games: survivalGames,
        bestScore: survivalBestScore,
        bestStreak: survivalBestStreak,
      },
    };

    console.log("[profile] Returning:", {
      totalGames: result.totalGames,
      accuracy: result.accuracy,
      masteredCount: result.masteredCount,
      bestStreak: result.bestStreak,
    });

    return NextResponse.json(result);
  } catch (err) {
    console.error("[profile] Error:", err);
    return NextResponse.json({ error: "Failed to load profile" }, { status: 500 });
  }
}
