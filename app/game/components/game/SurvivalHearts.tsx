import { Heart } from "lucide-react";

export default function SurvivalHearts({
  lives,
  maxLives,
}: {
  lives: number;
  maxLives: number;
}) {
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: maxLives }).map((_, i) => (
        <Heart
          key={i}
          className="h-4 w-4"
          strokeWidth={1.5}
          fill={i < lives ? "#f87171" : "none"}
          color={i < lives ? "#f87171" : "#333333"}
        />
      ))}
    </div>
  );
}
