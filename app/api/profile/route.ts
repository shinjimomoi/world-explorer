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
      .select("country, attempts, correct_count, last_played")
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

    // Collectibles — backfill any mastered countries that are missing cards
    const { data: collectibles } = await supabaseAdmin
      .from("collectibles")
      .select("country, rarity, unlocked_at")
      .eq("user_id", userId)
      .order("unlocked_at", { ascending: false });

    const unlockedSet = new Set((collectibles ?? []).map((c) => c.country));
    const { countries: allCountries } = await import("@/data/countries");
    const masteredMissing = (mastery ?? []).filter(
      (m) => m.correct_count >= 3 && !unlockedSet.has(m.country)
    );
    if (masteredMissing.length > 0) {
      const countryMap = new Map(allCountries.map((c) => [c.name, c]));
      const rows = masteredMissing.map((m) => ({
        user_id: userId,
        country: m.country,
        rarity: countryMap.get(m.country)?.rarity ?? "common",
        unlocked_at: m.last_played ?? new Date().toISOString(),
      }));
      await supabaseAdmin.from("collectibles").upsert(rows, { onConflict: "user_id,country" });
      // Re-fetch after backfill
      const { data: updated } = await supabaseAdmin
        .from("collectibles")
        .select("country, rarity, unlocked_at")
        .eq("user_id", userId)
        .order("unlocked_at", { ascending: false });
      if (updated) (collectibles as typeof updated).splice(0, collectibles!.length, ...updated);
    }

    // Daily challenge history (last 30 days)
    const { data: dailyAttempts } = await supabaseAdmin
      .from("daily_attempts")
      .select("daily_date, completed")
      .eq("user_id", userId)
      .eq("completed", true)
      .order("daily_date", { ascending: false });

    const { data: dailyScores } = await supabaseAdmin
      .from("scores")
      .select("score, best_streak, created_at")
      .eq("user_id", userId)
      .eq("category", "Daily Challenge")
      .order("created_at", { ascending: false });

    // Build daily history with scores matched by date
    const dailyScoreByDate = new Map<string, { score: number; bestStreak: number }>();
    for (const s of dailyScores ?? []) {
      const date = s.created_at?.slice(0, 10);
      if (date && !dailyScoreByDate.has(date)) {
        dailyScoreByDate.set(date, { score: s.score, bestStreak: s.best_streak });
      }
    }

    const dailyHistory = (dailyAttempts ?? []).map((a) => {
      const scoreData = dailyScoreByDate.get(a.daily_date);
      return {
        date: a.daily_date,
        score: scoreData?.score ?? 0,
        bestStreak: scoreData?.bestStreak ?? 0,
      };
    });

    const dailyBestScore = dailyScores && dailyScores.length > 0
      ? Math.max(...dailyScores.map((s) => s.score))
      : 0;
    const dailyDaysPlayed = dailyAttempts?.length ?? 0;

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
      collectibles: collectibles ?? [],
      daily: {
        streak: user?.daily_streak ?? 0,
        bestScore: dailyBestScore,
        daysPlayed: dailyDaysPlayed,
        history: dailyHistory.slice(0, 30),
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
