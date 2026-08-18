import { describe, expect, it } from "vitest";
import { byRating } from "@/lib/release-order";

const release = (title: string, rating: number | null, year: number) => ({
  title,
  rating,
  releaseDate: new Date(Date.UTC(year, 0, 1)),
});

describe("byRating", () => {
  it("puts the highest rating first", () => {
    const sorted = byRating([
      release("Two stars", 2, 2020),
      release("Five stars", 5, 2020),
      release("Four stars", 4, 2020),
    ]);
    expect(sorted.map((r) => r.title)).toEqual(["Five stars", "Four stars", "Two stars"]);
  });

  it("puts unrated releases last rather than treating them as nought", () => {
    const sorted = byRating([
      release("Unrated", null, 2024),
      release("One star", 1, 2020),
    ]);
    expect(sorted.map((r) => r.title)).toEqual(["One star", "Unrated"]);
  });

  it("breaks ties on the release date, newest first", () => {
    const sorted = byRating([
      release("Older", 4, 2015),
      release("Newer", 4, 2022),
    ]);
    expect(sorted.map((r) => r.title)).toEqual(["Newer", "Older"]);
  });

  it("leaves the input alone", () => {
    const input = [release("Low", 1, 2020), release("High", 5, 2020)];
    byRating(input);
    expect(input.map((r) => r.title)).toEqual(["Low", "High"]);
  });
});
