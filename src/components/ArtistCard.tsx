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
    <li className="panel row-hover flex flex-col items-center gap-2 p-3 text-center">
      <Link
        href={`/artists/${artist.id}`}
        className="flex w-full min-w-0 flex-col items-center gap-2"
      >
        {artist.imageUrl ? (
          /* eslint-disable-next-line @next/next/no-img-element -- provider host isn't known ahead of time */
          <img
            src={artist.imageUrl}
            alt=""
            loading="lazy"
            className="size-14 rounded-full object-cover ring-1 ring-white/10 transition duration-300 hover:ring-2 hover:ring-accent/50"
          />
        ) : (
          <div className="flex size-14 items-center justify-center rounded-full bg-gradient-to-br from-accent/25 to-accent-2/25 ring-1 ring-white/10">
            <VinylIcon className="size-7 text-white/35" />
          </div>
        )}
        <div className="w-full min-w-0">
          <p className="truncate text-xs font-medium" title={artist.name}>
            {artist.name}
          </p>
          <p className="mt-0.5 text-[0.7rem] text-faint">
            {artist._count.releases} release
            {artist._count.releases === 1 ? "" : "s"}
          </p>
        </div>
      </Link>
      <StatusToggleButton artistId={artist.id} status={artist.status} />
    </li>
  );
}
