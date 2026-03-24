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
  // ── currentTier ───────────────────────────────────────────────────────────
  const currentTier = useMemo(
    () => (isSurvival ? survivalTier(round) : null),
    [isSurvival, round]
  );

  // ── projectionConfig + hint ───────────────────────────────────────────────
  const { projectionConfig, hint } = useMemo(() => {
    if (isSurvival && currentTier?.showHint && result === null) {
      const zoom = getZoomConfig(currentCountry);
      return {
        projectionConfig: { scale: zoom.scale, center: zoom.center },
        hint: zoom.region || undefined,
      };
    }
    if (difficulty === "easy" && result === null) {
      const zoom = getZoomConfig(currentCountry);
      return {
        projectionConfig: { scale: zoom.scale, center: zoom.center },
        hint: zoom.region || undefined,
      };
    }
    return { projectionConfig: DEFAULT_PROJECTION, hint: undefined };
  }, [difficulty, isSurvival, currentTier?.showHint, result, currentCountry]);

  return { projectionConfig, hint, currentTier };
}
