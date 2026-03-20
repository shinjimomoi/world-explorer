import WorldMap from "./WorldMap";

export default async function GamePage({
  searchParams,
}: {
  searchParams: Promise<{ difficulty?: string }>;
}) {
  const { difficulty } = await searchParams;
  return (
    <div className="flex flex-col flex-1">
      <WorldMap difficulty={difficulty === "hard" ? "hard" : "easy"} />
    </div>
  );
}
