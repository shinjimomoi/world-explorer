import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-8 px-4 text-center sm:px-6">
      <div className="flex flex-col gap-3">
        <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
          World Explorer
        </h1>
        <p className="max-w-md text-base text-foreground-muted sm:text-lg">
          Discover countries, test your geography knowledge, and explore the world one region at a time.
        </p>
      </div>

      <div className="flex w-full max-w-xs flex-col gap-3 sm:max-w-none sm:flex-row sm:justify-center">
        <Link
          href="/game?difficulty=easy"
          className="group rounded-xl border border-border bg-surface p-5 text-left transition-colors hover:border-accent sm:w-52"
        >
          <p className="text-lg font-bold text-foreground transition-colors group-hover:text-accent">
            Easy
          </p>
          <p className="mt-1 text-sm text-foreground-muted">30 s per round</p>
          <p className="mt-0.5 text-sm text-foreground-muted">Region hints + zoomed map</p>
        </Link>

        <Link
          href="/game?difficulty=hard"
          className="group rounded-xl border border-border bg-surface p-5 text-left transition-colors hover:border-accent sm:w-52"
        >
          <p className="text-lg font-bold text-foreground transition-colors group-hover:text-accent">
            Hard
          </p>
          <p className="mt-1 text-sm text-foreground-muted">15 s per round</p>
          <p className="mt-0.5 text-sm text-foreground-muted">No hints · World view</p>
        </Link>
      </div>
    </div>
  );
}
