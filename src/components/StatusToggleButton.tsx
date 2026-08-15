import { setArtistStatus } from "@/lib/actions";

export function StatusToggleButton({
  artistId,
  status,
}: {
  artistId: string;
  status: "ACTIVE" | "PAUSED";
}) {
  const nextStatus = status === "ACTIVE" ? "PAUSED" : "ACTIVE";
  const label = status === "ACTIVE" ? "Pause" : "Resume";
  const action = setArtistStatus.bind(null, artistId, nextStatus);

  return (
    <form action={action}>
      <button
        type="submit"
        title={
          status === "ACTIVE"
            ? "Stop pulling in new releases from this artist"
            : "Start pulling in new releases again"
        }
        className={
          status === "ACTIVE"
            ? "btn-ghost px-3 py-1.5 text-xs font-medium"
            : "rounded-full bg-white/90 px-3 py-1.5 text-xs font-semibold text-black transition hover:bg-white"
        }
      >
        {label}
      </button>
    </form>
  );
}
