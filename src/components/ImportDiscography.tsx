"use client";

import { useActionState } from "react";
import { importDiscographyAction, type ImportDiscographyState } from "@/lib/actions";
import { CheckIcon } from "@/components/icons";

const empty: ImportDiscographyState = { message: null, error: null, skipped: [] };

export function ImportDiscography() {
  const [state, action, pending] = useActionState(importDiscographyAction, empty);

  return (
    <form action={action} className="flex flex-col gap-3">
      <div>
        <label
          htmlFor="import-source"
          className="mb-1.5 block text-xs font-medium text-muted"
        >
          Paste the whole file
        </label>
        <textarea
          id="import-source"
          name="source"
          rows={10}
          required
          placeholder="Open the file in a text editor, select all, and paste it here."
          className="field w-full resize-y px-3 py-2 font-mono text-xs"
        />
      </div>

      <label
        className="flex w-fit cursor-pointer items-center gap-2 text-xs text-muted"
        title="Keeps a back catalogue out of the To listen queue"
      >
        <input
          type="checkbox"
          name="markListened"
          defaultChecked
          className="size-3.5 cursor-pointer accent-amber-500"
        />
        Mark everything as already heard
      </label>

      <button
        type="submit"
        disabled={pending}
        className="btn-primary w-fit px-4 py-2 text-sm"
      >
        {pending ? "Importing…" : "Import"}
      </button>

      {state.error && <p className="text-sm text-red-400">{state.error}</p>}

      {state.message && (
        <p className="flex items-center gap-1.5 text-sm font-medium text-success">
          <CheckIcon className="size-4" /> {state.message}
        </p>
      )}

      {/* Nothing is dropped quietly: anything unreadable is named. */}
      {state.skipped.length > 0 && (
        <details className="text-xs text-faint">
          <summary className="cursor-pointer">
            {state.skipped.length} row{state.skipped.length === 1 ? "" : "s"} skipped
          </summary>
          <ul className="mt-1.5 list-disc pl-4">
            {state.skipped.map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
        </details>
      )}
    </form>
  );
}
