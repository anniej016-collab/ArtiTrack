"use client";

import { CheckIcon, HeartIcon, PlusIcon } from "@/components/icons";
import { useToggleState } from "@/components/pending";

/**
 * The two per-row controls in a tracklist, as client components so each can see
 * its own form and answer the tap before the server does.
 *
 * A tracklist is where taps come fastest — a dozen songs ticked off in a row —
 * and where a control that looks unchanged for a second is most likely to be
 * pressed twice.
 */
export function SongTickButton({
  listened,
  title,
}: {
  listened: boolean;
  title: string;
}) {
  const { shown, pending } = useToggleState(listened);
  const name = shown ? `${title}, heard` : `Mark ${title} heard`;

  return (
    <button
      type="submit"
      disabled={pending}
      aria-label={name}
      aria-pressed={shown}
      title={
        shown
          ? "Mark as not heard, everywhere this song appears"
          : "Mark as heard, everywhere this song appears"
      }
      className={`flex size-7 shrink-0 items-center justify-center rounded-full transition ${
        shown
          ? "bg-success/15 text-success ring-1 ring-inset ring-success/25 hover:bg-success/25"
          : "border border-line text-faint hover:bg-panel-hover hover:text-text"
      }`}
    >
      {shown ? <CheckIcon className="size-3.5" /> : <PlusIcon className="size-3.5" />}
    </button>
  );
}

export function FavouriteHeartButton({
  favourite,
  spent,
  title,
}: {
  favourite: boolean;
  /** Three are already picked on this release and this isn't one of them. */
  spent: boolean;
  title: string;
}) {
  const { shown, pending } = useToggleState(favourite);

  return (
    <button
      type="submit"
      disabled={spent || pending}
      data-on={shown ? "true" : "false"}
      aria-label={
        shown
          ? `${title}, a favourite on this release`
          : `Make ${title} a favourite on this release`
      }
      aria-pressed={shown}
      title={
        spent
          ? "Three favourites already picked on this release"
          : shown
            ? "Remove from favourites"
            : "Make a favourite of this release"
      }
      className={`song-favourite size-7 items-center justify-center rounded-full transition ${
        shown
          ? "text-accent hover:text-accent/70"
          : spent
            ? "cursor-not-allowed text-white/10"
            : "text-white/25 hover:text-accent"
      }`}
    >
      <HeartIcon className="size-4" filled={shown} />
    </button>
  );
}
