"use client";

import { useFormStatus } from "react-dom";
import { syncAllAction, syncArtistAction } from "@/lib/actions";
import { VinylIcon } from "@/components/icons";

/** Spins the record while the sync request is actually in flight. */
function SyncSubmit({ idle }: { idle: string }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="btn-ghost flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium disabled:opacity-60"
    >
      <VinylIcon className={`size-3.5 ${pending ? "animate-spin-slow" : ""}`} />
      {pending ? "Checking…" : idle}
    </button>
  );
}

export function SyncAllButton() {
  return (
    <form action={syncAllAction}>
      <SyncSubmit idle="Check for new" />
    </form>
  );
}

export function SyncArtistButton({ artistId }: { artistId: string }) {
  return (
    <form action={syncArtistAction.bind(null, artistId)}>
      <SyncSubmit idle="Check for new" />
    </form>
  );
}
