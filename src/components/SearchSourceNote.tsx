import { providerLabel } from "@/lib/providers";

/**
 * Which service a match came from, on the match itself.
 *
 * Search tries Spotify, then Deezer, then MusicBrainz, and shows whichever
 * answers first — sensible, and until now completely silent. Someone who came
 * here to reach Spotify could be handed Deezer results, pick one, and have no
 * way to work out why nothing changed. The results have always known where they
 * came from; they just never said.
 */
export function SourceBadge({ source }: { source: string }) {
  return (
    <span className="shrink-0 rounded-full bg-white/5 px-1.5 py-0.5 text-[0.65rem] font-medium text-faint">
      {providerLabel(source)}
    </span>
  );
}

/**
 * Says outright when Spotify was skipped for want of credentials.
 *
 * The one case where the fallback is not merely a detail: the whole reason for
 * adding Spotify was a catalogue Deezer is missing, so quietly answering with
 * Deezer gives exactly the wrong impression — that Spotify was asked and had
 * nothing.
 */
export function SpotifySkippedNote({ configured }: { configured: boolean }) {
  if (configured) return null;

  return (
    <p className="text-xs text-faint">
      Spotify isn&apos;t set up, so this searched Deezer. Add{" "}
      <code className="text-muted">SPOTIFY_CLIENT_ID</code> and{" "}
      <code className="text-muted">SPOTIFY_CLIENT_SECRET</code> to use it.
    </p>
  );
}
