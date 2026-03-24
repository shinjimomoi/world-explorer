export default function TierBadge({ tier }: { tier: string }) {
  return (
    <span className="inline-flex items-center rounded-full border border-[#333333] bg-[#1a1a1a] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-foreground-muted">
      {tier}
    </span>
  );
}
