export default function QuitDialog({
  onConfirm,
  onCancel,
}: {
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 px-4 backdrop-blur-xl">
      <div className="w-full max-w-sm rounded-2xl border border-[#222222] bg-surface p-6">
        <h2 className="text-lg font-bold text-foreground">Quit game?</h2>
        <p className="mt-2 text-sm text-foreground-muted">
          Are you sure you want to quit? Your progress will be lost.
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="cursor-pointer rounded-lg border border-[#333333] px-4 py-2 text-sm font-semibold text-foreground transition-all duration-150 hover:bg-[#1a1a1a] hover:border-[#555555] active:scale-[0.98]"
          >
            Keep playing
          </button>
          <button
            onClick={onConfirm}
            className="cursor-pointer rounded-lg border border-[#333333] px-4 py-2 text-sm font-semibold text-[#f87171] transition-all duration-150 hover:border-[#f87171] hover:bg-[rgba(248,113,113,0.15)] active:scale-[0.98]"
          >
            Quit
          </button>
        </div>
      </div>
    </div>
  );
}
