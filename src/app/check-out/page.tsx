import { prisma } from "@/lib/prisma";
import { AddDiscoveryForm, PasteDiscoveriesForm } from "@/components/DiscoveryForms";
import { DiscoveryRow } from "@/components/DiscoveryRow";
import { ConfirmSubmitButton } from "@/components/ConfirmSubmitButton";
import { VinylIcon } from "@/components/icons";
import { clearAlreadyHeardDiscoveries, clearHeardDiscoveries } from "@/lib/actions";
import { matchDiscovery } from "@/lib/discovery-match";
import { loadLibraryIndex } from "@/lib/library-index";

export const dynamic = "force-dynamic";

export default async function CheckOutPage() {
  const [items, index] = await Promise.all([
    prisma.discovery.findMany({
      // Unheard first, then newest, so the list reads as a queue of work.
      orderBy: [{ heard: "asc" }, { createdAt: "desc" }],
    }),
    loadLibraryIndex(),
  ]);

  // A pasted playlist doesn't know what's already in the tracker, so each row
  // is checked against it and says what it finds.
  const matches = new Map(items.map((item) => [item.id, matchDiscovery(item, index)]));

  const waiting = items.filter((item) => !item.heard);
  const heard = items.filter((item) => item.heard);
  const alreadyHeard = waiting.filter((item) => matches.get(item.id)?.heard);

  return (
    <div className="flex flex-col gap-8">
      {/* A banded hero, like the artist pages, so this reads as its own place
          in the app rather than a bare list bolted onto the side. */}
      <section className="relative overflow-hidden rounded-2xl border border-line">
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-br from-accent/12 via-transparent to-accent-2/10"
        />
        <div className="relative flex flex-col gap-5 p-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <p className="eyebrow mb-2 text-accent">Outside the tracker</p>
            <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
              Check out
            </h1>
            <p className="mt-2.5 max-w-lg text-sm text-muted">
              Artists and records you don&apos;t follow but mean to hear. Nothing here
              counts as following anyone, and none of it lands in your To listen queue.
            </p>
          </div>

          {items.length > 0 && (
            <div className="flex shrink-0 gap-6">
              <div>
                <p className="font-display text-2xl font-semibold tracking-tight">
                  {waiting.length}
                </p>
                <p className="text-xs text-faint">to hear</p>
              </div>
              <div>
                <p className="font-display text-2xl font-semibold tracking-tight text-muted">
                  {heard.length}
                </p>
                <p className="text-xs text-faint">heard</p>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* List and forms side by side once there's room. A single column left
          the middle of a wide screen empty and pushed the forms off the fold. */}
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.9fr)_minmax(0,1fr)] lg:items-start lg:gap-10">
        <section>
          {items.length === 0 ? (
            <div className="panel flex flex-col items-center gap-3 px-5 py-14 text-center">
              <VinylIcon className="size-9 text-accent/25" />
              <p className="max-w-xs text-sm text-muted">
                Nothing on the list yet. Add something below, or paste a playlist in one
                go.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              {waiting.length > 0 && (
                <div>
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <h2 className="section-title">
                      To hear
                      <span className="text-sm font-medium text-faint">
                        {waiting.length}
                      </span>
                    </h2>
                    {/* Offered rather than done automatically: the match is by
                        name, good enough to point at but not to delete on. */}
                    {alreadyHeard.length > 0 && (
                      <form action={clearAlreadyHeardDiscoveries}>
                        <ConfirmSubmitButton
                          message={`Remove ${alreadyHeard.length} the tracker says you've already heard?`}
                          className="text-xs font-medium text-faint transition-colors hover:text-text"
                        >
                          Remove {alreadyHeard.length} already heard
                        </ConfirmSubmitButton>
                      </form>
                    )}
                  </div>
                  <ul className="panel divide-y divide-line overflow-hidden">
                    {waiting.map((item) => (
                      <DiscoveryRow
                        key={item.id}
                        item={item}
                        match={matches.get(item.id)}
                      />
                    ))}
                  </ul>
                </div>
              )}

              {heard.length > 0 && (
                <div>
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <h2 className="section-title">
                      Heard
                      <span className="text-sm font-medium text-faint">{heard.length}</span>
                    </h2>
                    <form action={clearHeardDiscoveries}>
                      <ConfirmSubmitButton
                        message={`Remove all ${heard.length} you've heard from the list?`}
                        className="text-xs font-medium text-faint transition-colors hover:text-red-400"
                      >
                        Clear these
                      </ConfirmSubmitButton>
                    </form>
                  </div>
                  <ul className="panel divide-y divide-line overflow-hidden">
                    {heard.map((item) => (
                      <DiscoveryRow
                        key={item.id}
                        item={item}
                        match={matches.get(item.id)}
                      />
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </section>

        <aside className="flex flex-col gap-6 lg:sticky lg:top-24">
          <section>
            <h2 className="section-title mb-3">Add one</h2>
            <AddDiscoveryForm />
          </section>

          <section>
            <details className="group" open={items.length === 0}>
              <summary className="eyebrow inline-flex cursor-pointer list-none items-center gap-1.5 transition-colors hover:text-text">
                <span className="transition-transform group-open:rotate-90">›</span>
                Paste a playlist
              </summary>
              <div className="mt-3">
                <PasteDiscoveriesForm />
              </div>
            </details>
          </section>
        </aside>
      </div>
    </div>
  );
}
