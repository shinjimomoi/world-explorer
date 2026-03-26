import WorldMap from "./WorldMap";
import { CATEGORIES, type Category } from "@/data/categories";

export default async function GamePage({
  searchParams,
}: {
  searchParams: Promise<{ difficulty?: string; category?: string }>;
}) {
  const { difficulty, category } = await searchParams;
  const validCategory = CATEGORIES.includes(category as Category)
    ? (category as Category)
    : "All World";
  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
      <WorldMap
        key={`${difficulty}-${validCategory}`}
        difficulty={difficulty === "hard" ? "hard" : difficulty === "survival" ? "survival" : difficulty === "daily" ? "daily" : "easy"}
        category={validCategory}
      />
    </div>
  );
}
