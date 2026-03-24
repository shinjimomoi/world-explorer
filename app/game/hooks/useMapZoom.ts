"use client";

import { useMemo } from "react";
import type { Country } from "@/data/countries";
import type { Difficulty, GuessResult } from "../types";
import { DEFAULT_PROJECTION } from "../types";
import { getZoomConfig, survivalTier } from "../utils";

interface UseMapZoomParams {
  isSurvival: boolean;
  round: number;
  difficulty: Difficulty;
  currentCountry: Country;
  result: GuessResult | null;
}

export function useMapZoom({
  isSurvival,
  round,
  difficulty,
  currentCountry,
  result,
}: UseMapZoomParams) {
  const currentTier = useMemo(
    () => (isSurvival ? survivalTier(round) : null),
    [isSurvival, round]
  );

  // Always use the default world view — never auto-zoom to a continent.
  // Hint (region name) is still shown for easy mode / survival tier 1.
  const hint = useMemo(() => {
    if (result !== null) return undefined;
    if (difficulty === "easy" || (isSurvival && currentTier?.showHint)) {
      return getZoomConfig(currentCountry).region || undefined;
    }
    return undefined;
  }, [difficulty, isSurvival, currentTier?.showHint, result, currentCountry]);

  return { projectionConfig: DEFAULT_PROJECTION, hint, currentTier };
}
