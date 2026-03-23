import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

const STREAK_THRESHOLD = 500;

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
    const { userId, userName, session } = await req.json();

    if (!userId || !session) {
      return NextResponse.json({ error: "Missing data" }, { status: 400 });
    }

    // Check played_at is within 24 hours
    const playedAt = new Date(session.played_at);
    if (Date.now() - playedAt.getTime() > 24 * 60 * 60 * 1000) {
      return NextResponse.json({ ok: true, merged: false, reason: "expired" });
    }

    // 1. Insert score
    const { error: scoreErr } = await supabaseAdmin
      .from("scores")
      .insert({
        name: userName || "Player",
        score: session.score,
        best_streak: session.best_streak,
        category: session.category || "All World",
        user_id: userId,
      });

    if (scoreErr) {
      console.error("[merge] Score insert error:", scoreErr);
    }

    // 2. Upsert mastery for each round
    for (const round of session.rounds ?? []) {
      const { data: existing } = await supabaseAdmin
        .from("mastery")
        .select("attempts, correct_count")
        .eq("user_id", userId)
        .eq("country", round.country)
        .single();

      const attempts = (existing?.attempts ?? 0) + 1;
      const correctCount = (existing?.correct_count ?? 0) + (round.correct ? 1 : 0);

      await supabaseAdmin
        .from("mastery")
        .upsert(
          {
            user_id: userId,
            country: round.country,
            attempts,
            correct_count: correctCount,
            last_played: session.played_at,
          },
          { onConflict: "user_id,country" }
        );
    }

    // 3. Update user stats
    const { data: user } = await supabaseAdmin
      .from("users")
      .select("total_games, total_guesses, total_correct, xp")
      .eq("id", userId)
      .single();

    const correctRounds = (session.rounds ?? []).filter((r: { correct: boolean }) => r.correct).length;
    let xpEarned = 0;
    for (const r of session.rounds ?? []) {
      if (r.score > 800) xpEarned += 40;
      else if (r.score > STREAK_THRESHOLD) xpEarned += 20;
    }
    if (session.best_streak >= 3) xpEarned += (session.best_streak - 2) * 10;

    const totalXp = (user?.xp ?? 0) + xpEarned;

    await supabaseAdmin
      .from("users")
      .update({
        total_games: (user?.total_games ?? 0) + 1,
        total_guesses: (user?.total_guesses ?? 0) + (session.rounds?.length ?? 0),
        total_correct: (user?.total_correct ?? 0) + correctRounds,
        xp: totalXp,
        level: levelFromXp(totalXp),
      })
      .eq("id", userId);

    return NextResponse.json({ ok: true, merged: true });
  } catch (err) {
    console.error("[merge] Error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
