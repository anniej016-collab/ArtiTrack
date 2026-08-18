"use client";

import { useFormStatus } from "react-dom";
import { loadArtistTracksAction, loadReleaseTracksAction } from "@/lib/actions";
import { VinylIcon } from "@/components/icons";

function Submit({ idle, busy }: { idle: string; busy: string }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="btn-ghost flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium disabled:opacity-60"
    >
      <VinylIcon className={`size-3.5 ${pending ? "animate-spin-slow" : ""}`} />
      {pending ? busy : idle}
    </button>
  );
}

/**
 * Fetches this release's tracklist, or asks for it again.
 *
 * Two labels for one action, because after the first press it is a different
 * job: "Load songs" reads as unfinished business and belongs beside the other
 * things to do with the release, while a refresh is housekeeping — worth having
 * (services fill in tracklists late, correct titles and add tracks to a
 * re-issue) but not worth advertising. Nothing expires: there is no interval
 * after which this has to be pressed again.
 */
export function LoadReleaseTracksButton({
  releaseId,
  loaded = false,
}: {
  releaseId: string;
  loaded?: boolean;
}) {
  return (
    <form action={loadReleaseTracksAction.bind(null, releaseId)}>
      <Submit
        idle={loaded ? "Refresh songs" : "Load songs"}
        busy={loaded ? "Refreshing…" : "Loading…"}
      />
    </form>
  );
}

export function LoadArtistTracksButton({
  artistId,
  remaining,
}: {
  artistId: string;
  remaining: number;
}) {
  return (
    <form action={loadArtistTracksAction.bind(null, artistId)}>
      <Submit
        idle={`Load songs (${remaining} left)`}
        busy="Loading…"
      />
    </form>
  );
}
