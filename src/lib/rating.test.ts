import { describe, expect, it } from "vitest";
import { formatRating, isValidRating, starFill } from "@/lib/rating";

describe("isValidRating", () => {
  it("accepts every half step", () => {
    for (let value = 1; value <= 10; value += 1) expect(isValidRating(value)).toBe(true);
  });

  it("rejects nought, over ten, and anything between the steps", () => {
    expect(isValidRating(0)).toBe(false);
    expect(isValidRating(11)).toBe(false);
    expect(isValidRating(4.5)).toBe(false);
  });
});

describe("formatRating", () => {
  it("writes whole stars without a decimal", () => {
    expect(formatRating(8)).toBe("4");
  });

  it("writes halves with one", () => {
    expect(formatRating(7)).toBe("3.5");
    expect(formatRating(1)).toBe("0.5");
  });
});

describe("starFill", () => {
  it("fills the stars below the rating and empties the ones above", () => {
    // Three and a half out of five.
    expect([1, 2, 3, 4, 5].map((star) => starFill(star, 7))).toEqual([
      "full",
      "full",
      "full",
      "half",
      "empty",
    ]);
  });

  it("has no half when the rating is whole", () => {
    expect([1, 2, 3, 4, 5].map((star) => starFill(star, 8))).toEqual([
      "full",
      "full",
      "full",
      "full",
      "empty",
    ]);
  });

  it("draws nothing for unrated", () => {
    expect([1, 2, 3, 4, 5].map((star) => starFill(star, null))).toEqual([
      "empty",
      "empty",
      "empty",
      "empty",
      "empty",
    ]);
  });

  it("handles the smallest rating there is", () => {
    expect(starFill(1, 1)).toBe("half");
  });
});
