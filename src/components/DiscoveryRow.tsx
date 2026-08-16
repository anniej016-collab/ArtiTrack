import Link from "next/link";
import { deleteDiscovery, setDiscoveryHeard } from "@/lib/actions";
import { CheckIcon, PlusIcon } from "@/components/icons";

export type DiscoveryRowData = {
  id: string;
  artistName: string;
  title: string | null;
  note: string | null;
  heard: boolean;
};

export function DiscoveryRow({ item }: { item: DiscoveryRowData }) {
  const label = item.title ?? item.artistName;
  const name = item.heard ? `${label}, heard` : `Mark ${label} heard`;

  return (
    <li className="row-hover flex items-center gap-3 px-4 py-3">
      <form action={setDiscoveryHeard.bind(null, item.id, !item.heard)}>
        <button
          type="submit"
          aria-label={name}
          aria-pressed={item.heard}
          title={item.heard ? "Mark as not heard" : "Mark as heard"}
          className={`flex size-7 shrink-0 items-center justify-center rounded-full transition ${
            item.heard
              ? "bg-success/15 text-success ring-1 ring-inset ring-success/25 hover:bg-success/25"
              : "border border-line text-faint hover:bg-panel-hover hover:text-text"
          }`}
        >
          {item.heard ? (
            <CheckIcon className="size-3.5" />
          ) : (
            <PlusIcon className="size-3.5" />
          )}
        </button>
      </form>

      <div className="min-w-0 flex-1">
        <p className={`truncate text-sm ${item.heard ? "text-muted line-through" : ""}`}>
          {item.title ?? item.artistName}
        </p>
        <p className="truncate text-xs text-faint">
          {item.title ? item.artistName : "Artist"}
          {item.note && (
            <>
              <span className="mx-1.5 opacity-40">•</span>
              {item.note}
            </>
          )}
        </p>
      </div>

      {/* Straight into the tracker's own search, with the name filled in — the
          point of the list is that some of these turn into artists you follow. */}
      <Link
        href={`/?q=${encodeURIComponent(item.artistName)}`}
        className="btn-ghost shrink-0 px-2.5 py-1 text-xs font-medium"
        title={`Look up ${item.artistName} to follow them`}
      >
        Follow
      </Link>

      <form action={deleteDiscovery.bind(null, item.id)}>
        <button
          type="submit"
          aria-label={`Remove ${label}`}
          title="Remove from the list"
          className="shrink-0 px-1.5 text-sm text-faint transition-colors hover:text-red-400"
        >
          ×
        </button>
      </form>
    </li>
  );
}
