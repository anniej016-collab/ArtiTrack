"use client";

export function ConfirmDeleteButton({ artistName }: { artistName: string }) {
  return (
    <button
      type="submit"
      onClick={(e) => {
        if (!confirm(`Remove ${artistName} and all of their logged releases? This can't be undone.`)) {
          e.preventDefault();
        }
      }}
      className="text-xs font-medium text-zinc-500 hover:text-red-600"
    >
      Remove artist entirely
    </button>
  );
}
