import { updateArtist } from "@/lib/actions";

/**
 * The gap-filler for artists no catalogue supplies in full: a hand-added
 * artist, or one from MusicBrainz, which carries no pictures of its own.
 */
export function EditArtistForm({
  artist,
}: {
  artist: { id: string; name: string; imageUrl: string | null };
}) {
  return (
    <form
      action={updateArtist.bind(null, artist.id)}
      className="panel flex flex-col gap-3 p-4"
    >
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="flex-1">
          <label
            htmlFor="artist-name"
            className="mb-1.5 block text-xs font-medium text-muted"
          >
            Name
          </label>
          <input
            id="artist-name"
            name="name"
            required
            defaultValue={artist.name}
            className="field w-full px-3 py-2 text-sm"
          />
        </div>
        <div className="flex-1">
          <label
            htmlFor="artist-image"
            className="mb-1.5 block text-xs font-medium text-muted"
          >
            Photo link
          </label>
          <input
            id="artist-image"
            name="imageUrl"
            type="url"
            defaultValue={artist.imageUrl ?? ""}
            placeholder="https://…"
            className="field w-full px-3 py-2 text-sm"
          />
        </div>
      </div>
      <p className="text-xs text-faint">
        Right-click any picture on the web and copy its image address. Leave it empty
        for the record-sleeve placeholder.
      </p>
      <button type="submit" className="btn-primary self-start px-4 py-2 text-sm">
        Save artist
      </button>
    </form>
  );
}
