import { providerLabel } from "@/lib/providers";

/**
 * Which service a match came from, on the match itself.
 *
 * Search shows whichever service answers first, and until now did so silently.
 * Someone who came here expecting one service could be handed another's
 * results, pick one, and have no way to work out why nothing changed. The
 * results have always known where they came from; they just never said.
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
 * Only for the panel that moves an artist between services, which is the one
 * place Spotify is searched. Offering "every service" and quietly listing two
 * of the three gives exactly the wrong impression — that Spotify was asked and
 * had nothing, rather than never asked at all.
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
