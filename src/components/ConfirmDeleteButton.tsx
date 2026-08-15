"use client";

export function ConfirmDeleteButton({ artistName }: { artistName: string }) {
  return (
    <button
      type="submit"
      onClick={(e) => {
        if (
          !confirm(
            `Remove ${artistName} and every release logged for them? This can't be undone.`,
          )
        ) {
          e.preventDefault();
        }
      }}
      className="text-xs font-medium text-faint transition-colors hover:text-red-400"
    >
      Remove artist entirely
    </button>
  );
}
