import { releaseTypeLabels } from "@/lib/format";

// Distinct hues so an album, an EP and a single are separable at a glance.
const styles: Record<string, string> = {
  ALBUM: "bg-violet-500/15 text-violet-300 ring-violet-400/25",
  EP: "bg-cyan-500/15 text-cyan-300 ring-cyan-400/25",
  SINGLE: "bg-amber-500/15 text-amber-300 ring-amber-400/25",
  OTHER: "bg-white/8 text-zinc-400 ring-white/15",
};

export function ReleaseTypeBadge({ type }: { type: string }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide ring-1 ring-inset ${
        styles[type] ?? styles.OTHER
      }`}
    >
      {releaseTypeLabels[type] ?? "Release"}
    </span>
  );
}
