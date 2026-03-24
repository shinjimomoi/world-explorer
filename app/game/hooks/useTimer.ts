"use client";

import { useEffect } from "react";
import type { GamePhase, GuessResult } from "../types";
import { INTRO_MS, RESULT_MS } from "../types";

interface UseTimerParams {
  showIntro: boolean;
  setShowIntro: (v: boolean) => void;
  setIntroFading: (v: boolean) => void;
  acceptingRef: React.RefObject<boolean>;
  gamePhase: GamePhase;
  isSurvival: boolean;
  currentTier: { timerSeconds: number } | null;
  timerSecondsLeft: number;
  setTimerSecondsLeft: React.Dispatch<React.SetStateAction<number>>;
  result: GuessResult | null;
  round: number;
  submitResult: (info: null) => void;
  advance: () => void;
  setCountdown: React.Dispatch<React.SetStateAction<number>>;
  lives: number;
}

export function useTimer({
  showIntro,
  setShowIntro,
  setIntroFading,
  acceptingRef,
  gamePhase,
  isSurvival,
  currentTier,
  timerSecondsLeft,
  setTimerSecondsLeft,
  result,
  round,
  submitResult,
  advance,
  setCountdown,
  lives,
}: UseTimerParams) {
  // ── round intro: show popup then start timer ─────────────────────────────
  useEffect(() => {
    if (!showIntro || gamePhase !== "playing") return;
    const fadeTimer = setTimeout(() => setIntroFading(true), INTRO_MS - 300);
    const hideTimer = setTimeout(() => {
      setShowIntro(false);
      setIntroFading(false);
      (acceptingRef as React.MutableRefObject<boolean>).current = true;
    }, INTRO_MS);
    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(hideTimer);
    };
  }, [showIntro, gamePhase, setIntroFading, setShowIntro, acceptingRef]);

  // ── hasTimer computation ──────────────────────────────────────────────────
  const hasTimer = isSurvival ? (currentTier?.timerSeconds ?? 0) > 0 : true;

  // ── round timer: counts down while in guessing phase ─────────────────────
  useEffect(() => {
    if (!hasTimer || showIntro || result !== null || gamePhase !== "playing")
      return;
    const iv = setInterval(
      () => setTimerSecondsLeft((s) => Math.max(0, s - 1)),
      1000
    );
    return () => clearInterval(iv);
  }, [hasTimer, showIntro, result, round, gamePhase, setTimerSecondsLeft]);

  // ── timeout: fires when timer hits 0 in guessing phase ───────────────────
  useEffect(() => {
    if (!hasTimer) return;
    if (timerSecondsLeft > 0) return;
    if (showIntro) return;
    if (!(acceptingRef as React.MutableRefObject<boolean>).current) return;
    if (result !== null) return;
    if (gamePhase !== "playing") return;

    (acceptingRef as React.MutableRefObject<boolean>).current = false;
    submitResult(null);
  }, [
    hasTimer,
    timerSecondsLeft,
    showIntro,
    result,
    gamePhase,
    submitResult,
    acceptingRef,
  ]);

  // ── auto-advance after showing result ────────────────────────────────────
  useEffect(() => {
    if (!result || gamePhase !== "playing") return;
    // In survival, don't auto-advance if out of lives (game over handled separately)
    if (isSurvival && lives <= 0) return;
    setCountdown(3);
    const iv = setInterval(() => setCountdown((c) => c - 1), 1000);
    const to = setTimeout(advance, RESULT_MS);
    return () => {
      clearInterval(iv);
      clearTimeout(to);
    };
  }, [result, gamePhase, advance, isSurvival, lives, setCountdown]);

  return { hasTimer };
}
