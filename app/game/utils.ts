import type { Country } from "@/data/countries";
import { CONTINENT_MAP } from "@/data/categories";
import { MAX_POINTS, TOTAL_ROUNDS, SURVIVAL_TIMER } from "./types";

export function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function shuffled(pool: Country[]): Country[] {
  return [...pool].sort(() => Math.random() - 0.5);
}

export function toSVGCoords(e: React.MouseEvent, el: SVGGraphicsElement): DOMPoint {
  const svg = el.closest("svg") as SVGSVGElement;
  const pt = svg.createSVGPoint();
  pt.x = e.clientX;
  pt.y = e.clientY;
  return pt.matrixTransform(el.getScreenCTM()!.inverse());
}

export function sessionRating(score: number): string {
  const max = MAX_POINTS * TOTAL_ROUNDS;
  const pct = score / max;
  if (pct >= 0.9) return "Geography Master";
  if (pct >= 0.7) return "Expert Explorer";
  if (pct >= 0.5) return "Seasoned Traveller";
  if (pct >= 0.3) return "Emerging Geographer";
  return "Keep Exploring!";
}

export function streakMultiplier(streak: number): {
  multiplier: number;
  label: string;
} {
  if (streak >= 10) return { multiplier: 2.0, label: "World Explorer!" };
  if (streak >= 7) return { multiplier: 1.5, label: "Unstoppable!" };
  if (streak >= 5) return { multiplier: 1.25, label: "Blazing!" };
  if (streak >= 3) return { multiplier: 1.1, label: "On fire!" };
  return { multiplier: 1.0, label: "" };
}

/** green ≥800 · amber ≥500 · red <500 */
export function ptColor(points: number): string {
  if (points >= 800) return "#4ade80";
  if (points >= 500) return "#fb923c";
  return "#f87171";
}

export function getZoomConfig(
  country: Country
): { scale: number; center: [number, number]; region: string } {
  const { capitalLat, capitalLng, code } = country;
  const region = CONTINENT_MAP[code] ?? "";

  if (capitalLng >= -25 && capitalLng <= 45 && capitalLat >= 35 && capitalLat <= 72)
    return { scale: 520, center: [15, 52], region };
  if (capitalLng >= -20 && capitalLng <= 55 && capitalLat >= -36 && capitalLat <= 38)
    return { scale: 330, center: [22, 2], region };
  if (capitalLng >= 25 && capitalLng <= 180 && capitalLat >= -10 && capitalLat <= 75)
    return { scale: 270, center: [90, 35], region };
  if (capitalLng >= -170 && capitalLng <= -50 && capitalLat >= 7)
    return { scale: 300, center: [-95, 45], region };
  if (capitalLng >= -85 && capitalLng <= -32 && capitalLat <= 15)
    return { scale: 330, center: [-58, -15], region };
  if (capitalLng >= 110 && capitalLat <= 5)
    return { scale: 390, center: [145, -25], region };
  return { scale: 160, center: [0, 10], region };
}

export function survivalTier(round: number): {
  name: string;
  maxRank: 1 | 2 | 3;
  showHint: boolean;
  timerSeconds: number;
  borderOpacity: number;
} {
  if (round <= 10) return { name: "EASY", maxRank: 1, showHint: true, timerSeconds: 0, borderOpacity: 1 };
  if (round <= 20) return { name: "MEDIUM", maxRank: 2, showHint: false, timerSeconds: 0, borderOpacity: 0.2 };
  return { name: "HARD", maxRank: 3, showHint: false, timerSeconds: SURVIVAL_TIMER, borderOpacity: 0 };
}
