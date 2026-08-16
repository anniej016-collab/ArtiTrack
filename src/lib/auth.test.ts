import { describe, expect, it } from "vitest";
import {
  isPasswordSet,
  isRequestAllowed,
  safeEqual,
  sessionTokenFor,
} from "@/lib/auth";

const allow = (over: Partial<Parameters<typeof isRequestAllowed>[0]> = {}) =>
  isRequestAllowed({
    pathname: "/",
    cookieValue: undefined,
    expectedToken: "token",
    passwordSet: true,
    ...over,
  });

describe("password gate", () => {
  it("is off when no password is configured", () => {
    expect(isPasswordSet(undefined)).toBe(false);
    expect(isPasswordSet("")).toBe(false);
    expect(isPasswordSet("hunter2")).toBe(true);
    expect(allow({ passwordSet: false })).toBe(true);
  });

  it("blocks a request with no session", () => {
    expect(allow()).toBe(false);
  });

  it("blocks a request whose session doesn't match", () => {
    expect(allow({ cookieValue: "wrong" })).toBe(false);
  });

  it("admits a request with the right session", () => {
    expect(allow({ cookieValue: "token" })).toBe(true);
  });

  it("leaves the login page reachable, or nobody could ever sign in", () => {
    expect(allow({ pathname: "/login" })).toBe(true);
  });

  it("leaves scheduled-job routes alone, since they carry their own secret", () => {
    expect(allow({ pathname: "/api/cron/sync" })).toBe(true);
  });

  it("does not gate the assets the login page itself needs", () => {
    for (const path of ["/_next/static/x.js", "/favicon.ico", "/manifest.webmanifest"]) {
      expect(allow({ pathname: path })).toBe(true);
    }
  });

  it("still gates ordinary pages", () => {
    for (const path of ["/", "/artists/abc", "/releases/abc", "/api/export"]) {
      expect(allow({ pathname: path })).toBe(false);
    }
  });
});

describe("session token", () => {
  it("is stable for a password and different for another", async () => {
    const a = await sessionTokenFor("hunter2");
    expect(await sessionTokenFor("hunter2")).toBe(a);
    expect(await sessionTokenFor("hunter3")).not.toBe(a);
  });

  it("never contains the password itself", async () => {
    expect(await sessionTokenFor("hunter2")).not.toContain("hunter2");
  });
});

describe("safeEqual", () => {
  it("matches only identical strings", () => {
    expect(safeEqual("abc", "abc")).toBe(true);
    expect(safeEqual("abc", "abd")).toBe(false);
    expect(safeEqual("abc", "ab")).toBe(false);
    expect(safeEqual("", "")).toBe(true);
  });
});
