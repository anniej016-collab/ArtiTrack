import { cookies } from "next/headers";

export type ViewMode = "cards" | "list";

export const VIEW_MODE_COOKIE = "artitrack_view";

/**
 * Kept in a cookie rather than component state so the server render already
 * knows the layout — no flash of the wrong view — and the choice survives
 * closing the tab.
 */
export async function getViewMode(): Promise<ViewMode> {
  const store = await cookies();
  return store.get(VIEW_MODE_COOKIE)?.value === "list" ? "list" : "cards";
}
