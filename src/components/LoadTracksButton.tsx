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

export function LoadReleaseTracksButton({ releaseId }: { releaseId: string }) {
  return (
    <form action={loadReleaseTracksAction.bind(null, releaseId)}>
      <Submit idle="Load songs" busy="Loading…" />
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
