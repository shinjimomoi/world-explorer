"use client";

import { useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import type { Country } from "@/data/countries";
import {
  filterCountries,
  countriesByMaxRank,
  type Category,
} from "@/data/categories";
import type {
  Difficulty,
  GamePhase,
  ClickInfo,
  GuessResult,
  RoundRecord,
  ZoomState,
} from "../types";
import {
  MAX_POINTS,
  STREAK_THRESHOLD,
  SURVIVAL_LIVES,
  TOTAL_ROUNDS,
} from "../types";
import { haversineKm, shuffled, streakMultiplier, survivalTier } from "../utils";
import { getDailyCountries, getTodayDateStr } from "@/lib/dailyChallenge";

export function useGameState(difficulty: Difficulty, category: Category) {
  const isDaily = difficulty === "daily";
  const roundSeconds =
    difficulty === "survival" ? 999 : (difficulty === "hard" || isDaily) ? 15 : 30;
  const router = useRouter();
  const [showQuitDialog, setShowQuitDialog] = useState(false);
  const masteryBonusRef = useRef(0);

  // ── stable refs (mutations don't trigger re-renders) ─────────────────────
  const queueRef = useRef<Country[]>([]);
  const currentCountryRef = useRef<Country | null>(null);
  const acceptingRef = useRef(true);
  const roundRef = useRef(1);
  const streakRef = useRef(0);
  const bestStreakRef = useRef(0);

  const pool = filterCountries(category);
  const dailyPool = useRef(isDaily ? getDailyCountries(getTodayDateStr()) : []);
  const dailyIndex = useRef(0);
  const usedCountriesRef = useRef(new Set<string>());

  function drawNext(): Country {
    if (isDaily && dailyPool.current.length > 0) {
      const pick = dailyPool.current[dailyIndex.current % dailyPool.current.length];
      dailyIndex.current++;
      return pick;
    }
    if (difficulty === "survival") {
      const tier = survivalTier(roundRef.current);
      const tierPool = countriesByMaxRank(tier.maxRank).filter(
        (c) => !usedCountriesRef.current.has(c.code)
      );
      const source =
        tierPool.length > 0 ? tierPool : countriesByMaxRank(tier.maxRank);
      const pick = source[Math.floor(Math.random() * source.length)];
      usedCountriesRef.current.add(pick.code);
      return pick;
    }
    if (queueRef.current.length === 0) queueRef.current = shuffled(pool);
    return queueRef.current.pop()!;
  }

  if (!currentCountryRef.current) {
    currentCountryRef.current = drawNext();
  }

  // ── state ─────────────────────────────────────────────────────────────────
  const [gamePhase, setGamePhase] = useState<GamePhase>("playing");
  const [currentCountry, setCurrentCountry] = useState<Country>(
    () => currentCountryRef.current!
  );
  const [round, setRound] = useState(1);
  const [timerSecondsLeft, setTimerSecondsLeft] = useState(roundSeconds);
  const [totalScore, setTotalScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [rounds, setRounds] = useState<RoundRecord[]>([]);
  const [result, setResult] = useState<GuessResult | null>(null);
  const [resultStreak, setResultStreak] = useState(0);
  const [countdown, setCountdown] = useState(3);
  const [showIntro, setShowIntro] = useState(true);
  const [introFading, setIntroFading] = useState(false);
  const [introMessage, setIntroMessage] = useState<string | null>(null);
  const [lives, setLives] = useState(SURVIVAL_LIVES);
  const isSurvival = difficulty === "survival";
  const [mapZoom, setMapZoom] = useState<ZoomState>({
    center: [0, 0],
    zoom: 1,
  });

  // ── submit result (shared by click and timeout) ───────────────────────────
  const submitResult = useCallback((info: ClickInfo | null) => {
    const country = currentCountryRef.current!;
    const timedOut = info === null;

    let distanceKm: number | null = null;
    let basePoints = 0;
    if (!timedOut && info) {
      distanceKm = haversineKm(
        info.lat,
        info.lng,
        country.capitalLat,
        country.capitalLng
      );
      basePoints = Math.max(0, MAX_POINTS - Math.floor(distanceKm));
    }

    const newStreak =
      basePoints > STREAK_THRESHOLD ? streakRef.current + 1 : 0;
    streakRef.current = newStreak;
    if (newStreak > bestStreakRef.current) bestStreakRef.current = newStreak;

    const { multiplier } = streakMultiplier(newStreak);
    const points = Math.round(basePoints * multiplier);

    setRounds((prev) => [
      ...prev,
      { round: roundRef.current, country, points, distanceKm, timedOut },
    ]);
    setTotalScore((s) => s + points);
    setStreak(newStreak);
    setBestStreak(bestStreakRef.current);
    setResultStreak(newStreak);
    setResult({
      guessLat: info?.lat ?? null,
      guessLng: info?.lng ?? null,
      country,
      distanceKm,
      basePoints,
      multiplier,
      points,
      timedOut,
    });
  }, []); // stable: only refs + functional setters

  // ── advance to next round (or end game) ───────────────────────────────────
  // roundSeconds is stable for the component lifetime (difficulty prop is fixed per game)
  const advance = useCallback(() => {
    if (!isSurvival && roundRef.current >= TOTAL_ROUNDS) {
      setGamePhase("ended");
      return;
    }
    const next = roundRef.current + 1;
    roundRef.current = next;
    currentCountryRef.current = drawNext();
    acceptingRef.current = false;

    // Survival: set timer based on tier
    if (isSurvival) {
      const tier = survivalTier(next);
      setTimerSecondsLeft(tier.timerSeconds || 999);
      // Tier transition messages
      if (next === 11) setIntroMessage("Borders fading...");
      else if (next === 21)
        setIntroMessage("No more borders. No more hints.");
      else setIntroMessage(null);
    } else {
      setTimerSecondsLeft(roundSeconds);
      setIntroMessage(null);
    }

    setResult(null);
    setCurrentCountry(currentCountryRef.current!);
    setRound(next);
    setShowIntro(true);
    setIntroFading(false);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── reset / play again ────────────────────────────────────────────────────
  const resetGame = useCallback(() => {
    queueRef.current = shuffled(pool);
    roundRef.current = 1;
    streakRef.current = 0;
    bestStreakRef.current = 0;
    currentCountryRef.current = queueRef.current.pop()!;
    acceptingRef.current = false;

    setGamePhase("playing");
    setCurrentCountry(currentCountryRef.current);
    setRound(1);
    setTimerSecondsLeft(roundSeconds);
    setTotalScore(0);
    setStreak(0);
    setBestStreak(0);
    setRounds([]);
    setResult(null);
    setMapZoom({ center: [0, 0], zoom: 1 });
    setShowIntro(true);
    setIntroFading(false);
    setIntroMessage(null);
    setLives(SURVIVAL_LIVES);
    usedCountriesRef.current = new Set();
    dailyIndex.current = 0;
    if (isDaily) dailyPool.current = getDailyCountries(getTodayDateStr());
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── stable click handler ──────────────────────────────────────────────────
  const handleClick = useCallback(
    (info: ClickInfo) => {
      if (showIntro) return;
      if (!acceptingRef.current) return;
      acceptingRef.current = false;
      submitResult(info);
    },
    [showIntro, submitResult]
  );

  // ── quit handlers ─────────────────────────────────────────────────────────
  const handleQuit = useCallback(() => setShowQuitDialog(true), []);
  const handleConfirmQuit = useCallback(() => {
    router.push("/");
  }, [router]);

  return {
    // state
    gamePhase,
    setGamePhase,
    currentCountry,
    round,
    timerSecondsLeft,
    setTimerSecondsLeft,
    totalScore,
    streak,
    bestStreak,
    rounds,
    result,
    setResult,
    resultStreak,
    countdown,
    setCountdown,
    showIntro,
    setShowIntro,
    introFading,
    setIntroFading,
    introMessage,
    lives,
    setLives,
    isSurvival,
    isDaily,
    mapZoom,
    setMapZoom,

    // refs
    queueRef,
    currentCountryRef,
    acceptingRef,
    roundRef,
    streakRef,
    bestStreakRef,
    usedCountriesRef,
    masteryBonusRef,

    // callbacks
    submitResult,
    advance,
    resetGame,
    handleClick,

    // quit
    showQuitDialog,
    setShowQuitDialog,
    handleQuit,
    handleConfirmQuit,

    // misc
    roundSeconds,
    pool,
    router,
  };
}
