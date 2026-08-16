import { describe, expect, it } from "vitest";
import { releaseMatchKey } from "@/lib/release-match";

const date = (iso: string) => new Date(`${iso}T00:00:00Z`);

describe("releaseMatchKey", () => {
  it("matches the same record across case, punctuation and accents", () => {
    expect(releaseMatchKey("Kick Back", date("2021-03-10"))).toBe(
      releaseMatchKey("KICK BACK", date("2021-03-10")),
    );
    expect(releaseMatchKey("Sticker", date("2021-09-17"))).toBe(
      releaseMatchKey("Sticker!", date("2021-09-17")),
    );
    expect(releaseMatchKey("Résonance", date("2020-01-01"))).toBe(
      releaseMatchKey("Resonance", date("2020-01-01")),
    );
  });

  it("tolerates a service and a file disagreeing on the day", () => {
    // Hand-kept files often record only the year, and services differ by a day
    // or two across territories.
    expect(releaseMatchKey("Cherry Bomb", date("2017-06-14"))).toBe(
      releaseMatchKey("Cherry Bomb", date("2017-01-01")),
    );
  });

  it("keeps a reissue apart from the record it reissues", () => {
    // Qualifiers are deliberately not stripped: these are different releases,
    // unlike two copies of the same song.
    expect(releaseMatchKey("Regular-Irregular", date("2018-10-12"))).not.toBe(
      releaseMatchKey("Regulate-Irregular", date("2018-11-23")),
    );
    expect(releaseMatchKey("Hot Sauce", date("2021-05-10"))).not.toBe(
      releaseMatchKey("Hot Sauce (Deluxe)", date("2021-05-10")),
    );
  });

  it("keeps a re-release in a later year apart from the original", () => {
    expect(releaseMatchKey("Empathy", date("2018-03-14"))).not.toBe(
      releaseMatchKey("Empathy", date("2022-03-14")),
    );
  });
});
