import { describe, expect, it } from "vitest";
import {
  discoverPostgresUrlVars,
  resolveMigrationUrlVar,
  resolveRuntimeUrlVar,
} from "@/lib/db-url";

const PG = "postgresql://u:p@host:5432/db";

describe("connection string resolution", () => {
  it("prefers DATABASE_URL when present", () => {
    expect(resolveRuntimeUrlVar({ DATABASE_URL: PG, POSTGRES_URL: PG })).toBe(
      "DATABASE_URL",
    );
  });

  it("falls back to the names a host's integration sets", () => {
    expect(resolveRuntimeUrlVar({ POSTGRES_URL: PG })).toBe("POSTGRES_URL");
  });

  it("uses a pooled URL at runtime and a direct one for migrations", () => {
    const env = { POSTGRES_URL: PG, POSTGRES_URL_NON_POOLING: PG };
    expect(resolveRuntimeUrlVar(env)).toBe("POSTGRES_URL");
    expect(resolveMigrationUrlVar(env)).toBe("POSTGRES_URL_NON_POOLING");
  });

  it("finds custom-prefixed names, which is what a collision workaround produces", () => {
    const env = { ARTITRACK_DATABASE_URL: PG, ARTITRACK_DATABASE_URL_UNPOOLED: PG };
    expect(resolveRuntimeUrlVar(env)).toBe("ARTITRACK_DATABASE_URL");
    expect(resolveMigrationUrlVar(env)).toBe("ARTITRACK_DATABASE_URL_UNPOOLED");
  });

  it("ignores variables that aren't postgres URLs", () => {
    expect(discoverPostgresUrlVars({ DATABASE_URL: "", PGHOST: "localhost" })).toEqual(
      [],
    );
    expect(resolveRuntimeUrlVar({ DATABASE_URL: "mysql://x" })).toBeUndefined();
  });

  it("returns nothing when the environment has no database at all", () => {
    expect(resolveRuntimeUrlVar({})).toBeUndefined();
    expect(resolveMigrationUrlVar({})).toBeUndefined();
  });
});
