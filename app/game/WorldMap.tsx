"use client";

import { useCallback, useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useNavbar } from "@/app/context/navbar";
import { countries } from "@/data/countries";
import type { Difficulty } from "./types";
import type { Category } from "@/data/categories";
import { TOTAL_ROUNDS, SURVIVAL_LIVES } from "./types";
import { useGameState } from "./hooks/useGameState";
import { useMapZoom } from "./hooks/useMapZoom";
import { useTimer } from "./hooks/useTimer";
import { useScoring } from "./hooks/useScoring";
import MapCanvas from "./components/game/WorldMapCanvas";
import QuitDialog from "./components/game/QuitDialog";
import RoundIntro from "./components/game/RoundIntro";
import ResultPopup from "./components/game/ResultPopup";
import EndScreen from "./components/game/EndScreen";
import SurvivalGameOver from "./components/game/SurvivalGameOver";
import CardUnlock from "./components/game/CardUnlock";

export type { Difficulty };

export default function WorldMap({
  difficulty,
  category,
}: {
  difficulty: Difficulty;
  category: Category;
}) {
  const { isSignedIn, user: clerkUser } = useUser();
  const { setState: setNavbarState } = useNavbar();
  const navRouter = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  // Collect unlocked cards silently during game, show queue after game ends
  const [pendingUnlocks, setPendingUnlocks] = useState<string[]>([]);
  const [unlockQueue, setUnlockQueue] = useState<string[]>([]);

  const handleCardUnlock = useCallback((countryName: string) => {
    setPendingUnlocks((prev) => [...prev, countryName]);
  }, []);

  // ── core game state ────────────────────────────────────────────────────
  const game = useGameState(difficulty, category);

  // ── projection / hint / tier ───────────────────────────────────────────
  const { projectionConfig, hint, currentTier } = useMapZoom({
    isSurvival: game.isSurvival,
    difficulty,
    round: game.round,
    result: game.result,
    currentCountry: game.currentCountry,
  });

  // ── timer + intro ──────────────────────────────────────────────────────
  const { hasTimer } = useTimer({
    showIntro: game.showIntro,
    setShowIntro: game.setShowIntro,
    setIntroFading: game.setIntroFading,
    acceptingRef: game.acceptingRef,
    gamePhase: game.gamePhase,
    isSurvival: game.isSurvival,
    currentTier,
    result: game.result,
    round: game.round,
    timerSecondsLeft: game.timerSecondsLeft,
    setTimerSecondsLeft: game.setTimerSecondsLeft,
    setCountdown: game.setCountdown,
    submitResult: game.submitResult,
    advance: game.advance,
    lives: game.lives,
  });

  // ── scoring / mastery / supabase sync ──────────────────────────────────
  useScoring({
    gamePhase: game.gamePhase,
    result: game.result,
    isSignedIn: !!isSignedIn,
    clerkUser,
    rounds: game.rounds,
    bestStreak: game.bestStreak,
    totalScore: game.totalScore,
    category,
    isSurvival: game.isSurvival,
    lives: game.lives,
    setLives: game.setLives,
    setGamePhase: game.setGamePhase,
    masteryBonusRef: game.masteryBonusRef,
    onCardUnlock: handleCardUnlock,
  });

  // ── dev cheat: Ctrl+Shift+M to simulate mastery unlock ─────────────────
  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.ctrlKey && e.shiftKey && e.key === "M") {
        const name = game.currentCountry.name;
        setPendingUnlocks((prev) => prev.includes(name) ? prev : [...prev, name]);
        console.log("[Dev] Simulated mastery unlock for:", name);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [game.currentCountry.name]);

  // ── when game ends, move pending unlocks into the display queue ────────
  useEffect(() => {
    if (game.gamePhase === "ended" && pendingUnlocks.length > 0 && unlockQueue.length === 0) {
      setUnlockQueue([...pendingUnlocks]);
      setPendingUnlocks([]);
    }
  }, [game.gamePhase, pendingUnlocks, unlockQueue.length]);

  // ── sync game state into navbar ────────────────────────────────────────
  useEffect(() => {
    if (game.gamePhase !== "playing") return;
    const effectiveTimerSec = game.isSurvival ? (currentTier?.timerSeconds ?? 0) : game.roundSeconds;
    const timerPct =
      !hasTimer || game.showIntro || game.result !== null ? 0 : (game.timerSecondsLeft / effectiveTimerSec) * 100;
    const timerColor =
      game.timerSecondsLeft > effectiveTimerSec * 0.5
        ? "#4ade80"
        : game.timerSecondsLeft > effectiveTimerSec * 0.25
        ? "#fb923c"
        : "#f87171";
    setNavbarState({
      active: true,
      countryName: game.currentCountry.name,
      capital: game.currentCountry.capital,
      hint,
      round: game.round,
      totalRounds: game.isSurvival ? 0 : TOTAL_ROUNDS,
      totalScore: game.totalScore,
      streak: game.streak,
      timerPct: hasTimer ? timerPct : 0,
      timerColor,
      isResult: game.result !== null,
      onQuit: game.handleQuit,
      survival: game.isSurvival,
      lives: game.isSurvival ? game.lives : undefined,
      maxLives: game.isSurvival ? SURVIVAL_LIVES : undefined,
      tier: game.isSurvival ? currentTier?.name : undefined,
      isDaily: game.isDaily,
    });
  }, [
    game.gamePhase, game.currentCountry, hint, game.round, game.totalScore,
    game.streak, game.timerSecondsLeft, game.showIntro, game.result,
    game.roundSeconds, game.isSurvival, currentTier, hasTimer, game.lives,
    setNavbarState, game.handleQuit,
  ]);

  useEffect(() => {
    if (game.gamePhase === "ended") setNavbarState({ active: false });
  }, [game.gamePhase, setNavbarState]);

  useEffect(() => {
    return () => setNavbarState({ active: false });
  }, [setNavbarState]);

  // ── daily challenge: call start API on mount, complete API on game end ──
  useEffect(() => {
    if (!game.isDaily || !mounted) return;
    const userId = isSignedIn && clerkUser ? clerkUser.id : null;
    const guestId = typeof window !== "undefined" ? localStorage.getItem("world_explorer_guest_id") : null;
    if (!userId && !guestId) return;
    fetch("/api/daily", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "start", userId, guestId }),
    }).catch(() => {});
  }, [game.isDaily, mounted, isSignedIn, clerkUser]);

  useEffect(() => {
    if (game.gamePhase !== "ended" || !game.isDaily) return;
    const userId = isSignedIn && clerkUser ? clerkUser.id : null;
    const guestId = typeof window !== "undefined" ? localStorage.getItem("world_explorer_guest_id") : null;
    const userName = isSignedIn && clerkUser ? (clerkUser.fullName ?? clerkUser.username ?? "") : undefined;
    fetch("/api/daily", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "complete",
        userId,
        guestId,
        score: game.totalScore,
        bestStreak: game.bestStreak,
        name: userName || "Player",
      }),
    }).catch(() => {});
  }, [game.gamePhase, game.isDaily, game.totalScore, game.bestStreak, isSignedIn, clerkUser]);

  // ── render ─────────────────────────────────────────────────────────────

  // Wait for client mount to avoid hydration mismatch from Math.random()
  if (!mounted) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div
          className="h-5 w-5 rounded-full border-2 border-[#333333] border-t-accent"
          style={{ animation: "spin 0.6s linear infinite" }}
        />
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    );
  }

  // Show card unlock animations one at a time before end screen
  if (game.gamePhase === "ended" && unlockQueue.length > 0) {
    const countryName = unlockQueue[0];
    const c = countries.find((x) => x.name === countryName);
    if (c) {
      return (
        <CardUnlock
          key={countryName}
          country={c}
          onContinue={() => setUnlockQueue((q) => q.slice(1))}
          onViewCollection={() => {
            setUnlockQueue([]);
            navRouter.push("/profile#collection");
          }}
        />
      );
    }
    // Country not found, skip it
    setUnlockQueue((q) => q.slice(1));
  }

  // End screen (after all unlocks shown)
  if (game.gamePhase === "ended") {
    const uid = isSignedIn && clerkUser ? clerkUser.id : undefined;
    const uname = isSignedIn && clerkUser ? (clerkUser.fullName ?? clerkUser.username ?? "") : undefined;
    const playAgain = (d: Difficulty, c: Category) => {
      if (d === difficulty && c === category) {
        setPendingUnlocks([]);
        setUnlockQueue([]);
        game.resetGame();
      } else {
        game.router.push(`/game?difficulty=${d}&category=${c}`);
      }
    };

    if (game.isSurvival) {
      return (
        <SurvivalGameOver
          totalScore={game.totalScore}
          bestStreak={game.bestStreak}
          roundsSurvived={game.rounds.length}
          rounds={game.rounds}
          userId={uid}
          userName={uname}
          isGuest={!isSignedIn}
          onPlayAgain={playAgain}
        />
      );
    }

    return (
      <EndScreen
        totalScore={game.totalScore}
        bestStreak={game.bestStreak}
        difficulty={difficulty}
        category={category}
        rounds={game.rounds}
        userId={uid}
        userName={uname}
        isGuest={!isSignedIn}
        onPlayAgain={playAgain}
      />
    );
  }

  return (
    <div className="relative flex flex-1 flex-col min-h-0">
      <div className="flex-1 min-h-0 overflow-hidden">
        <MapCanvas
          onClick={game.handleClick}
          result={game.result}
          projectionConfig={projectionConfig}
          mapZoom={game.mapZoom}
          onZoomChange={game.setMapZoom}
          borderOpacity={game.isSurvival ? (currentTier?.borderOpacity ?? 1) : 1}
          hintCountry={!game.showIntro && !game.result && hint ? game.currentCountry.name : null}
        />
      </div>

      {game.showIntro && (
        <RoundIntro
          round={game.round}
          totalRounds={TOTAL_ROUNDS}
          country={game.currentCountry}
          hint={hint}
          fading={game.introFading}
          message={game.introMessage}
          survival={game.isSurvival}
          lives={game.isSurvival ? game.lives : undefined}
        />
      )}

      {game.result && (
        <ResultPopup
          result={game.result}
          round={game.round}
          newStreak={game.resultStreak}
          countdown={game.countdown}
          onAdvance={game.advance}
          isSurvival={game.isSurvival}
          onDevUnlock={process.env.NODE_ENV === "development" ? () => {
            const name = game.currentCountry.name;
            setPendingUnlocks((prev) => prev.includes(name) ? prev : [...prev, name]);
          } : undefined}
        />
      )}

      {game.showQuitDialog && (
        <QuitDialog
          onConfirm={game.handleConfirmQuit}
          onCancel={() => game.setShowQuitDialog(false)}
        />
      )}
    </div>
  );
}
