import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { ImportDiscography } from "@/components/ImportDiscography";
import { IMPORT_SOURCE } from "@/lib/import/apply";
import { byName } from "@/lib/name-order";

export const dynamic = "force-dynamic";
// A few hundred releases is well inside this, but the default is not generous.
export const maxDuration = 60;

export default async function ImportPage() {
  const unsorted = await prisma.artist.findMany({
    where: { source: IMPORT_SOURCE },
    select: { id: true, name: true, _count: { select: { releases: true } } },
  });
  // Ordered here rather than in SQL, so a lowercase name lands under its own
  // letter instead of after every capitalised one. See byName.
  const imported = byName(unsorted, (artist) => artist.name);

  return (
    <div className="flex flex-col gap-8">
      <section>
        <p className="eyebrow mb-2 text-accent">From a file</p>
        <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
          Import a discography
        </h1>
        <p className="mt-2.5 max-w-xl text-sm text-muted">
          For a catalogue you keep yourself rather than one a music service knows about
          — every unit, side project and soundtrack, with its tracklists and cover art.
          Import the same file again whenever you update it: what changed is corrected,
          what&apos;s new is added, and what you&apos;ve marked as heard is left alone.
        </p>
      </section>

      <section>
        <div className="panel p-4 sm:p-5">
          <ImportDiscography />
        </div>
      </section>

      {imported.length > 0 && (
        <section>
          <h2 className="section-title mb-3">
            Already imported
            <span className="text-sm font-medium text-faint">{imported.length}</span>
          </h2>
          <ul className="panel divide-y divide-line overflow-hidden">
            {imported.map((artist) => (
              <li
                key={artist.id}
                className="row-hover relative flex items-center justify-between gap-3 px-4 py-2.5"
              >
                <Link
                  href={`/artists/${artist.id}`}
                  className="min-w-0 truncate text-sm font-medium transition-colors after:absolute after:inset-0 hover:text-accent"
                >
                  {artist.name}
                </Link>
                <span className="shrink-0 text-xs text-faint">
                  {artist._count.releases} release
                  {artist._count.releases === 1 ? "" : "s"}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-faint">
            These aren&apos;t checked for new releases automatically — the file is what
            they come from, so re-import it when it changes.
          </p>
        </section>
      )}
    </div>
  );
}
