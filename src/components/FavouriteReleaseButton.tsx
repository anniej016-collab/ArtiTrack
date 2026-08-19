"use client";

import { setReleaseFavourite } from "@/lib/actions";
import { HeartIcon } from "@/components/icons";
import { useToggleState } from "@/components/pending";

/**
 * Shortlists this release among the artist's.
 *
 * Visible at all times, unlike the song hearts: there is one of these per page
 * rather than one per row, so it clutters nothing, and a control you have to go
 * looking for is no use for the thing the artist page is meant to make obvious.
 */
function Toggle({ favourite }: { favourite: boolean }) {
  const { shown, pending } = useToggleState(favourite);

  return (
    <button
      type="submit"
      disabled={pending}
      aria-pressed={shown}
      title={
        shown ? "Take off your favourites" : "Add to your favourites by this artist"
      }
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition ${
        shown
          ? "bg-accent/15 text-accent ring-1 ring-inset ring-accent/30 hover:bg-accent/25"
          : "btn-ghost"
      }`}
    >
      <HeartIcon className="size-3.5" filled={shown} />
      {shown ? "Favourite" : "Add to favourites"}
    </button>
  );
}

export function FavouriteReleaseButton({
  releaseId,
  favourite,
}: {
  releaseId: string;
  favourite: boolean;
}) {
  return (
    <form action={setReleaseFavourite.bind(null, releaseId, !favourite)}>
      <Toggle favourite={favourite} />
    </form>
  );
}
