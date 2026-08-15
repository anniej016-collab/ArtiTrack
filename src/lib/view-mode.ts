import { cookies } from "next/headers";
import type { GroupMode } from "@/lib/grouping";

export type ViewMode = "cards" | "list";

export const VIEW_MODE_COOKIE = "artitrack_view";
export const GROUP_MODE_COOKIE = "artitrack_group";

/**
 * Kept in a cookie rather than component state so the server render already
 * knows the layout — no flash of the wrong view — and the choice survives
 * closing the tab.
 */
export async function getViewMode(): Promise<ViewMode> {
  const store = await cookies();
  return store.get(VIEW_MODE_COOKIE)?.value === "list" ? "list" : "cards";
}

export async function getGroupMode(): Promise<GroupMode> {
  const store = await cookies();
  const value = store.get(GROUP_MODE_COOKIE)?.value;
  return value === "artist" || value === "date" ? value : "none";
}
