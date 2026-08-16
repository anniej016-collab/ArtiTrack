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

/**
 * How much of a section is on screen.
 *
 * "preview" is the default because every section grows without bound as the
 * library does: two rows is enough to see what's new without the first section
 * burying the rest.
 */
export type SectionState = "collapsed" | "preview" | "expanded";
export type SectionStates = Record<SectionKey, SectionState>;

export const VIEW_MODE_COOKIE = "artitrack_views";
export const GROUP_MODE_COOKIE = "artitrack_group";
export const SECTION_STATE_COOKIE = "artitrack_sections";

const DEFAULT_VIEW: ViewMode = "cards";
const DEFAULT_SECTION_STATE: SectionState = "preview";

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

export function parseSectionStates(raw: string | undefined): SectionStates {
  const states = Object.fromEntries(
    SECTION_KEYS.map((key) => [key, DEFAULT_SECTION_STATE]),
  ) as SectionStates;

  for (const pair of (raw ?? "").split(",")) {
    const [section, state] = pair.split(":");
    if (
      section &&
      isSectionKey(section) &&
      (state === "collapsed" || state === "preview" || state === "expanded")
    ) {
      states[section] = state;
    }
  }

  return states;
}

export function serialiseSectionStates(states: SectionStates): string {
  return SECTION_KEYS.map((key) => `${key}:${states[key]}`).join(",");
}

export async function getSectionStates(): Promise<SectionStates> {
  const store = await cookies();
  return parseSectionStates(store.get(SECTION_STATE_COOKIE)?.value);
}

export async function getGroupMode(): Promise<GroupMode> {
  const store = await cookies();
  const value = store.get(GROUP_MODE_COOKIE)?.value;
  return value === "artist" || value === "date" ? value : "none";
}
