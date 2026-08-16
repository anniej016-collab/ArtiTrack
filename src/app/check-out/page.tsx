import Link from "next/link";
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
      <Link
        href="/"
        className="inline-flex w-fit items-center gap-1.5 text-xs font-medium text-faint transition-colors hover:text-text"
      >
        <span aria-hidden="true">←</span> Your library
      </Link>

      <section>
        <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
          Check out
        </h1>
        <p className="mt-2 max-w-lg text-sm text-muted">
          Artists and records you don&apos;t follow but mean to hear. Kept out of the
          tracker on purpose — nothing here counts as following anyone, and none of it
          lands in your To listen queue.
        </p>
        {waiting.length > 0 && (
          <p className="mt-3 text-xs text-faint">
            {waiting.length} waiting
            {heard.length > 0 && (
              <>
                <span className="mx-1.5 opacity-40">·</span>
                {heard.length} heard
              </>
            )}
          </p>
        )}
      </section>

      <section>
        {items.length === 0 ? (
          <div className="panel flex flex-col items-center gap-3 px-5 py-12 text-center">
            <VinylIcon className="size-8 text-white/15" />
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
                  <h2 className="eyebrow">To hear · {waiting.length}</h2>
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
                  <h2 className="eyebrow">Heard · {heard.length}</h2>
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

      <section>
        <h2 className="eyebrow mb-3">Add one</h2>
        <AddDiscoveryForm />
      </section>

      <section>
        <details className="group" open={items.length === 0}>
          <summary className="eyebrow inline-flex cursor-pointer list-none items-center gap-1.5 transition-colors hover:text-muted">
            <span className="transition-transform group-open:rotate-90">›</span>
            Paste a playlist
          </summary>
          <div className="mt-3">
            <PasteDiscoveriesForm />
          </div>
        </details>
      </section>
    </div>
  );
}
