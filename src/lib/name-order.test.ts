import { describe, expect, it } from "vitest";
import { byName, compareNames } from "@/lib/name-order";

const names = (values: string[]) => byName(values, (value) => value);

describe("compareNames", () => {
  it("puts a lowercase name where its letter belongs", () => {
    // What the database did instead: Bea, NCT, Zara, aespa, twice.
    expect(names(["Bea", "aespa", "Zara", "twice", "NCT"])).toEqual([
      "aespa",
      "Bea",
      "NCT",
      "twice",
      "Zara",
    ]);
  });

  it("orders regardless of which case each name happens to use", () => {
    expect(compareNames("aespa", "Bea")).toBeLessThan(0);
    expect(compareNames("Zara", "twice")).toBeGreaterThan(0);
  });

  it("keeps accented names next to their unaccented spelling", () => {
    expect(names(["Zoe", "Émile", "Adam"])).toEqual(["Adam", "Émile", "Zoe"]);
  });

  it("reads numbers as numbers", () => {
    expect(names(["Disc 10", "Disc 2"])).toEqual(["Disc 2", "Disc 10"]);
  });

  it("is deterministic for names differing only in case", () => {
    const one = names(["AESPA", "aespa"]);
    const two = names(["aespa", "AESPA"]);
    expect(one).toEqual(two);
  });

  it("sorts a copy rather than the list it was given", () => {
    const input = ["Zara", "aespa"];
    byName(input, (value) => value);
    expect(input).toEqual(["Zara", "aespa"]);
  });
});
