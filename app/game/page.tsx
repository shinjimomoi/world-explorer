import WorldMap from "./WorldMap";

export default async function GamePage({
  searchParams,
}: {
  searchParams: Promise<{ difficulty?: string }>;
}) {
  const { difficulty } = await searchParams;
  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
      <WorldMap difficulty={difficulty === "hard" ? "hard" : "easy"} />
    </div>
  );
}
