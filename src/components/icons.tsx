export function VinylIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
      <circle cx="12" cy="12" r="10.25" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="12" cy="12" r="6" stroke="currentColor" strokeWidth="1" opacity="0.5" />
      <circle cx="12" cy="12" r="3.25" stroke="currentColor" strokeWidth="1" opacity="0.35" />
      <circle cx="12" cy="12" r="1.35" fill="currentColor" />
    </svg>
  );
}

/** Placeholder for a release with no artwork — reads as a record, not a broken image. */
export function CoverPlaceholder({ className = "" }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`flex items-center justify-center bg-gradient-to-br from-white/8 to-white/2 ${className}`}
    >
      <VinylIcon className="size-1/2 text-white/20" />
    </div>
  );
}

export function CheckIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className={className}>
      <path
        d="M4.5 10.5l3.5 3.5 7.5-8"
        stroke="currentColor"
        strokeWidth="2.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function GridIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true" className={className}>
      <rect x="1.5" y="1.5" width="5.5" height="5.5" rx="1.4" />
      <rect x="9" y="1.5" width="5.5" height="5.5" rx="1.4" />
      <rect x="1.5" y="9" width="5.5" height="5.5" rx="1.4" />
      <rect x="9" y="9" width="5.5" height="5.5" rx="1.4" />
    </svg>
  );
}

export function ListIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true" className={className}>
      <rect x="1.5" y="2.5" width="13" height="2.2" rx="1.1" />
      <rect x="1.5" y="6.9" width="13" height="2.2" rx="1.1" />
      <rect x="1.5" y="11.3" width="13" height="2.2" rx="1.1" />
    </svg>
  );
}

export function PlusIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className={className}>
      <path
        d="M10 4.5v11M4.5 10h11"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Set aside: taken out of the queue, not ticked off. */
export function MinusIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className={className}>
      <path d="M4.5 10h11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

/** Put back: undo a decision, rather than complete one. */
export function UndoIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className={className}>
      <path
        d="M4 9.5h8a3.5 3.5 0 0 1 0 7H8M4 9.5 7.5 6M4 9.5 7.5 13"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * Marks a favourite, filled or outlined from one path.
 *
 * A heart rather than a second star: releases are rated out of five with stars
 * already, and two meanings on one shape would be unreadable.
 */
export function HeartIcon({
  className = "",
  filled = false,
}: {
  className?: string;
  filled?: boolean;
}) {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" className={className}>
      <path
        d="M10 16.5S3 12.4 3 7.9A3.9 3.9 0 0 1 10 5.6a3.9 3.9 0 0 1 7 2.3c0 4.5-7 8.6-7 8.6z"
        fill={filled ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}
