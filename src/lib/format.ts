export function formatDate(date: Date) {
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export const releaseTypeLabels: Record<string, string> = {
  ALBUM: "Album",
  EP: "EP",
  SINGLE: "Single",
  OTHER: "Release",
};
