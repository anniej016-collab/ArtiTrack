import { setReleaseRating } from "@/lib/actions";

const STARS = [1, 2, 3, 4, 5];

/**
 * Pressing the star that is already the rating clears it, so one row of
 * controls both sets and unsets without needing a separate "clear" button.
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
        const filled = rating !== null && star <= rating;
        const isCurrent = rating === star;

        return (
          <form key={star} action={setReleaseRating.bind(null, releaseId, star)}>
            <button
              type="submit"
              aria-label={
                isCurrent ? `Clear rating` : `Rate ${star} out of 5`
              }
              aria-pressed={filled}
              title={isCurrent ? "Clear rating" : `Rate ${star} out of 5`}
              className={`flex size-6 items-center justify-center rounded transition ${
                filled ? "text-accent" : "text-white/20 hover:text-white/40"
              }`}
            >
              <svg viewBox="0 0 20 20" aria-hidden="true" className="size-4">
                <path
                  d="M10 1.8l2.4 4.9 5.4.8-3.9 3.8.9 5.4-4.8-2.5-4.8 2.5.9-5.4L2.2 7.5l5.4-.8z"
                  fill={filled ? "currentColor" : "none"}
                  stroke="currentColor"
                  strokeWidth="1.4"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </form>
        );
      })}
      {rating !== null && (
        <span className="ml-1.5 text-xs text-faint">{rating}/5</span>
      )}
    </div>
  );
}
