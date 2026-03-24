"use client";

import { useEffect } from "react";
import type { GamePhase, GuessResult, RoundRecord } from "../types";
import { STREAK_THRESHOLD, RESULT_MS } from "../types";
import type { Category } from "@/data/categories";

interface UseScoreParams {
  isSurvival: boolean;
  result: GuessResult | null;
  lives: number;
  setLives: React.Dispatch<React.SetStateAction<number>>;
  setGamePhase: React.Dispatch<React.SetStateAction<GamePhase>>;
  isSignedIn: boolean | undefined;
  clerkUser: { id: string } | null | undefined;
  masteryBonusRef: React.RefObject<number>;
  gamePhase: GamePhase;
  rounds: RoundRecord[];
  bestStreak: number;
  totalScore: number;
  category: Category;
}

export function useScoring({
  isSurvival,
  result,
  lives,
  setLives,
  setGamePhase,
  isSignedIn,
  clerkUser,
  masteryBonusRef,
  gamePhase,
  rounds,
  bestStreak,
  totalScore,
  category,
}: UseScoreParams) {
  // ── survival: lose life on bad score ─────────────────────────────────────
  useEffect(() => {
    if (!isSurvival || !result) return;
    if (result.points <= STREAK_THRESHOLD) {
      setLives((prev) => {
        const next = prev - 1;
        if (next <= 0) {
          // Game over — will be picked up by the lives === 0 check
          setTimeout(() => setGamePhase("ended"), RESULT_MS);
        }
        return next;
      });
    }
  }, [result, isSurvival, setLives, setGamePhase]);

  // ── sync mastery to Supabase after each round (signed-in only) ──────────
  useEffect(() => {
    if (!result || !isSignedIn || !clerkUser) return;
    const correct = result.points > STREAK_THRESHOLD;
    fetch("/api/mastery", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: clerkUser.id,
        country: result.country.name,
        correct,
      }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.newlyMastered)
          (masteryBonusRef as React.MutableRefObject<number>).current += 50;
      })
      .catch(() => {});
  }, [result, isSignedIn, clerkUser, masteryBonusRef]);

  // ── sync game completion to Supabase (signed-in only) ──────────────────
  useEffect(() => {
    if (gamePhase !== "ended" || !isSignedIn || !clerkUser) return;
    const correctRounds = rounds.filter(
      (r) => r.points > STREAK_THRESHOLD
    ).length;
    let xpEarned = 0;
    for (const r of rounds) {
      if (r.points > 800) xpEarned += 40;
      else if (r.points > STREAK_THRESHOLD) xpEarned += 20;
    }
    // Streak bonus: +10 per round that was part of a 3+ streak
    // Simplified: if best streak >= 3, award 10 * (bestStreak - 2)
    if (bestStreak >= 3) xpEarned += (bestStreak - 2) * 10;
    // Mastery bonuses accumulated during rounds
    xpEarned += (masteryBonusRef as React.MutableRefObject<number>).current;

    fetch("/api/game-complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: clerkUser.id,
        roundsPlayed: rounds.length,
        correctRounds,
        xpEarned,
      }),
    }).catch(() => {});
  }, [gamePhase, isSignedIn, clerkUser, rounds, bestStreak, masteryBonusRef]);

  // ── save guest game to localStorage for recovery on sign-in ────────────
  useEffect(() => {
    if (gamePhase !== "ended" || isSignedIn) return;
    try {
      localStorage.setItem(
        "pending_game_session",
        JSON.stringify({
          score: totalScore,
          best_streak: bestStreak,
          category,
          rounds: rounds.map((r) => ({
            country: r.country.name,
            capital: r.country.capital,
            score: r.points,
            correct: r.points > STREAK_THRESHOLD,
          })),
          played_at: new Date().toISOString(),
        })
      );
    } catch {}
  }, [gamePhase, isSignedIn, totalScore, bestStreak, category, rounds]);
}
