import { setReleaseRating } from "@/lib/actions";
import { STAR_COUNT, formatRating, starFill, type StarFill } from "@/lib/rating";

const STARS = Array.from({ length: STAR_COUNT }, (_, index) => index + 1);

/**
 * One star, drawn empty, half or full.
 *
 * The half is done with a clip rather than two overlaid shapes, so the outline
 * stays a single unbroken star — two halves butted together show a seam down
 * the middle at this size.
 */
function Star({ fill, className = "" }: { fill: StarFill; className?: string }) {
  const path =
    "M10 1.8l2.4 4.9 5.4.8-3.9 3.8.9 5.4-4.8-2.5-4.8 2.5.9-5.4L2.2 7.5l5.4-.8z";

  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" className={className}>
      {fill === "half" && (
        <defs>
          <clipPath id="rating-half">
            <rect x="0" y="0" width="10" height="20" />
          </clipPath>
        </defs>
      )}
      {fill === "full" && <path d={path} fill="currentColor" />}
      {fill === "half" && <path d={path} fill="currentColor" clipPath="url(#rating-half)" />}
      <path d={path} fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * Rates a release out of five, in halves.
 *
 * Each star is two targets: its left half sets the half step, its right half
 * the whole one. Pressing whichever step is already the rating clears it, so
 * one row of controls sets, adjusts and unsets without a separate button.
 *
 * The targets are 14px wide, which is below what a fingertip deserves, so the
 * row is taller than it needs to be to compensate — height is free here, and it
 * gives the tap somewhere to land vertically even if it drifts sideways.
 */
export function RatingStars({
  releaseId,
  rating,
}: {
  releaseId: string;
  rating: number | null;
}) {
  return (
    <div className="flex items-center gap-0.5" role="group" aria-label="Rating">
      {STARS.map((star) => {
        const fill = starFill(star, rating);
        const halves = [star * 2 - 1, star * 2];

        return (
          <span key={star} className="relative flex h-8 w-7 items-center justify-center">
            <Star
              fill={fill}
              className={`pointer-events-none size-5 ${
                fill === "empty" ? "text-white/20" : "text-accent"
              }`}
            />

            {halves.map((value, index) => {
              const isCurrent = rating === value;
              const label = `${formatRating(value)} out of ${STAR_COUNT}`;

              return (
                <form
                  key={value}
                  action={setReleaseRating.bind(null, releaseId, value)}
                  /* Only one position utility per element: pairing `relative`
                     with `absolute` lets `relative` win, since Tailwind emits it
                     later, and the halves drop out of the star entirely. */
                  className={`absolute inset-y-0 w-1/2 ${index === 0 ? "left-0" : "right-0"}`}
                >
                  <button
                    type="submit"
                    aria-label={isCurrent ? `Clear the rating` : `Rate ${label}`}
                    title={isCurrent ? "Clear the rating" : `Rate ${label}`}
                    className="size-full cursor-pointer rounded"
                  />
                </form>
              );
            })}
          </span>
        );
      })}

      {rating !== null && (
        <span className="ml-1.5 text-xs text-faint">
          {formatRating(rating)}/{STAR_COUNT}
        </span>
      )}
    </div>
  );
}
