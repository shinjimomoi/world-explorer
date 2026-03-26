import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getTodayDateStr } from "@/lib/dailyChallenge";

// GET: check if user has played today's daily
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");
  const guestId = searchParams.get("guestId");
  const today = getTodayDateStr();

  if (!userId && !guestId) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  let query = supabaseAdmin
    .from("daily_attempts")
    .select("score, best_streak, created_at")
    .eq("daily_date", today);

  if (userId) query = query.eq("user_id", userId);
  else query = query.eq("guest_id", guestId!);

  const { data } = await query.single();

  return NextResponse.json({
    played: !!data,
    score: data?.score ?? null,
    bestStreak: data?.best_streak ?? null,
  });
}

// POST: record daily attempt start or save score
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, userId, guestId, score, bestStreak, name } = body;
    const today = getTodayDateStr();

    if (action === "start") {
      // Insert attempt row to lock the attempt
      const row: Record<string, unknown> = {
        daily_date: today,
        score: 0,
        best_streak: 0,
        name: name || "Player",
      };
      if (userId) row.user_id = userId;
      if (guestId) row.guest_id = guestId;

      const { error } = await supabaseAdmin
        .from("daily_attempts")
        .insert(row);

      if (error) {
        // Already played (unique constraint)
        if (error.code === "23505") {
          return NextResponse.json({ ok: false, alreadyPlayed: true });
        }
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      return NextResponse.json({ ok: true });
    }

    if (action === "complete") {
      // Update the attempt with final score
      let query = supabaseAdmin
        .from("daily_attempts")
        .update({ score, best_streak: bestStreak, name: name || "Player" })
        .eq("daily_date", today);

      if (userId) query = query.eq("user_id", userId);
      else query = query.eq("guest_id", guestId);

      const { error } = await query;
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      // Update daily streak for signed-in users
      if (userId) {
        const { data: user } = await supabaseAdmin
          .from("users")
          .select("daily_streak, last_daily_date")
          .eq("id", userId)
          .single();

        const yesterday = new Date();
        yesterday.setUTCDate(yesterday.getUTCDate() - 1);
        const yesterdayStr = yesterday.toISOString().slice(0, 10);

        let newStreak = 1;
        if (user?.last_daily_date === yesterdayStr) {
          newStreak = (user.daily_streak ?? 0) + 1;
        }

        await supabaseAdmin
          .from("users")
          .update({ daily_streak: newStreak, last_daily_date: today })
          .eq("id", userId);
      }

      // Also save to scores table for leaderboard
      const scoreRow: Record<string, unknown> = {
        name: name || "Player",
        score,
        best_streak: bestStreak,
        category: "Daily Challenge",
      };
      if (userId) scoreRow.user_id = userId;
      await supabaseAdmin.from("scores").insert(scoreRow);

      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
