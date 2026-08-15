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
    <li className="panel row-hover flex flex-col items-center gap-3 p-4 text-center">
      <Link href={`/artists/${artist.id}`} className="flex flex-col items-center gap-3">
        {artist.imageUrl ? (
          /* eslint-disable-next-line @next/next/no-img-element -- provider host isn't known ahead of time */
          <img
            src={artist.imageUrl}
            alt=""
            loading="lazy"
            className="size-20 rounded-full object-cover ring-1 ring-white/10 transition duration-300 hover:ring-2 hover:ring-accent/50"
          />
        ) : (
          <div className="flex size-20 items-center justify-center rounded-full bg-gradient-to-br from-accent/25 to-accent-2/25 ring-1 ring-white/10">
            <VinylIcon className="size-9 text-white/35" />
          </div>
        )}
        <div className="min-w-0">
          <p className="truncate text-sm font-medium" title={artist.name}>
            {artist.name}
          </p>
          <p className="mt-0.5 text-xs text-faint">
            {artist._count.releases} release
            {artist._count.releases === 1 ? "" : "s"}
          </p>
        </div>
      </Link>
      <StatusToggleButton artistId={artist.id} status={artist.status} />
    </li>
  );
}
