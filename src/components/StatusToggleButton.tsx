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
            : "chip-on rounded-full px-3 py-1.5 text-xs transition hover:brightness-110"
        }
      >
        {label}
      </button>
    </form>
  );
}
