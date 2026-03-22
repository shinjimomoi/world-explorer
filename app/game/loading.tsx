export default function GameLoading() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3">
      <div
        className="h-5 w-5 rounded-full border-2 border-[#333333] border-t-accent"
        style={{ animation: "spin 0.6s linear infinite" }}
      />
      <p className="text-sm text-foreground-muted">Loading map…</p>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  );
}
