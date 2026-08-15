import Link from "next/link";
import { StatusToggleButton } from "@/components/StatusToggleButton";
import { VinylIcon } from "@/components/icons";

export type ArtistCardData = {
  id: string;
  name: string;
  imageUrl: string | null;
  status: "ACTIVE" | "PAUSED";
  _count: { releases: number };
};

export function ArtistCard({ artist }: { artist: ArtistCardData }) {
  return (
    // `relative` anchors the stretched link below, so the whole card is the tap
    // target rather than just the words.
    <li className="panel row-hover relative flex flex-col items-center gap-2 p-3 text-center">
      {artist.imageUrl ? (
        /* eslint-disable-next-line @next/next/no-img-element -- provider host isn't known ahead of time */
        <img
          src={artist.imageUrl}
          alt=""
          loading="lazy"
          className="size-14 rounded-full object-cover ring-1 ring-white/10"
        />
      ) : (
        <div className="flex size-14 items-center justify-center rounded-full bg-gradient-to-br from-accent/25 to-accent-2/25 ring-1 ring-white/10">
          <VinylIcon className="size-7 text-white/35" />
        </div>
      )}

      <div className="w-full min-w-0">
        <Link
          href={`/artists/${artist.id}`}
          className="block truncate text-xs font-medium transition-colors after:absolute after:inset-0 hover:text-accent"
          title={artist.name}
        >
          {artist.name}
        </Link>
        <p className="mt-0.5 text-[0.7rem] text-faint">
          {artist._count.releases} release
          {artist._count.releases === 1 ? "" : "s"}
        </p>
      </div>

      {/* Lifted above the stretched link so it stays clickable. */}
      <div className="relative z-10">
        <StatusToggleButton artistId={artist.id} status={artist.status} />
      </div>
    </li>
  );
}
