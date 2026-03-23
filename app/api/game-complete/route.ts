import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

function levelFromXp(xp: number): number {
  let level = 1;
  let remaining = xp;
  while (remaining >= level * 100) {
    remaining -= level * 100;
    level++;
  }
  return level;
}

export async function POST(req: Request) {
  try {
    const { userId, roundsPlayed, correctRounds, xpEarned } = await req.json();

    if (!userId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 });
    }

    // Fetch current user stats
    const { data: user } = await supabaseAdmin
      .from("users")
      .select("total_games, total_guesses, total_correct, xp")
      .eq("id", userId)
      .single();

    const totalGames = (user?.total_games ?? 0) + 1;
    const totalGuesses = (user?.total_guesses ?? 0) + roundsPlayed;
    const totalCorrect = (user?.total_correct ?? 0) + correctRounds;
    const totalXp = (user?.xp ?? 0) + xpEarned;
    const level = levelFromXp(totalXp);

    // Find favorite continent from scores
    const { data: favData } = await supabaseAdmin
      .from("scores")
      .select("category")
      .eq("user_id", userId);

    let favoriteContinent: string | null = null;
    if (favData && favData.length > 0) {
      const counts: Record<string, number> = {};
      for (const row of favData) {
        const cat = row.category || "All World";
        counts[cat] = (counts[cat] ?? 0) + 1;
      }
      favoriteContinent = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
    }

    const { error } = await supabaseAdmin
      .from("users")
      .update({
        total_games: totalGames,
        total_guesses: totalGuesses,
        total_correct: totalCorrect,
        xp: totalXp,
        level,
        ...(favoriteContinent ? { favorite_continent: favoriteContinent } : {}),
      })
      .eq("id", userId);

    if (error) {
      console.error("[game-complete] Update error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, totalXp, level });
  } catch (err) {
    console.error("[game-complete] Error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
