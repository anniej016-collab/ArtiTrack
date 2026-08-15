import { cookies } from "next/headers";
import type { GroupMode } from "@/lib/grouping";

export type ViewMode = "cards" | "list";

export const SECTION_KEYS = [
  "to-listen",
  "recently-listened",
  "following",
  "paused",
] as const;

export type SectionKey = (typeof SECTION_KEYS)[number];
export type ViewModes = Record<SectionKey, ViewMode>;

export const VIEW_MODE_COOKIE = "artitrack_views";
export const GROUP_MODE_COOKIE = "artitrack_group";

const DEFAULT_VIEW: ViewMode = "cards";

function isSectionKey(value: string): value is SectionKey {
  return (SECTION_KEYS as readonly string[]).includes(value);
}

/**
 * Each section keeps its own layout, so the queue can be a list while artists
 * stay as cards. Stored as "section:mode,section:mode" — compact, and readable
 * if anyone ever looks at the cookie.
 */
export function parseViewModes(raw: string | undefined): ViewModes {
  const modes = Object.fromEntries(
    SECTION_KEYS.map((key) => [key, DEFAULT_VIEW]),
  ) as ViewModes;

  for (const pair of (raw ?? "").split(",")) {
    const [section, mode] = pair.split(":");
    if (section && isSectionKey(section) && (mode === "list" || mode === "cards")) {
      modes[section] = mode;
    }
  }

  return modes;
}

export function serialiseViewModes(modes: ViewModes): string {
  return SECTION_KEYS.map((key) => `${key}:${modes[key]}`).join(",");
}

export async function getViewModes(): Promise<ViewModes> {
  const store = await cookies();
  return parseViewModes(store.get(VIEW_MODE_COOKIE)?.value);
}

export async function getGroupMode(): Promise<GroupMode> {
  const store = await cookies();
  const value = store.get(GROUP_MODE_COOKIE)?.value;
  return value === "artist" || value === "date" ? value : "none";
}
