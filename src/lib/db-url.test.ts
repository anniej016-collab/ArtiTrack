import { describe, expect, it } from "vitest";
import {
  describePostgresUrl,
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

describe("describePostgresUrl", () => {
  it("keeps the password out of what it hands back", () => {
    const target = describePostgresUrl(
      "postgres://user:sup3rsecret@ep-cool-name.eu-west-2.aws.neon.tech/neondb",
    );
    expect(JSON.stringify(target)).not.toContain("sup3rsecret");
    expect(target?.host).toBe("ep-cool-name.eu-west-2.aws.neon.tech");
    expect(target?.database).toBe("neondb");
  });

  it("recognises a pooled and a direct endpoint as one database", () => {
    const pooled = describePostgresUrl(
      "postgres://u:p@ep-cool-name-pooler.eu-west-2.aws.neon.tech/neondb",
    );
    const direct = describePostgresUrl(
      "postgres://u:p@ep-cool-name.eu-west-2.aws.neon.tech/neondb",
    );
    expect(pooled?.identity).toBe(direct?.identity);
    // Still shown as written, so the two rows aren't confusingly identical.
    expect(pooled?.host).not.toBe(direct?.host);
  });

  it("tells genuinely different databases apart", () => {
    const one = describePostgresUrl("postgres://u:p@ep-one.neon.tech/neondb");
    const two = describePostgresUrl("postgres://u:p@ep-two.neon.tech/neondb");
    expect(one?.identity).not.toBe(two?.identity);
  });

  it("separates two databases on the same server", () => {
    const one = describePostgresUrl("postgres://u:p@host/alpha");
    const two = describePostgresUrl("postgres://u:p@host/beta");
    expect(one?.identity).not.toBe(two?.identity);
  });

  it("ignores anything that isn't a Postgres URL", () => {
    expect(describePostgresUrl("prisma+postgres://accelerate.prisma-data.net/?api_key=x")).toBeNull();
    expect(describePostgresUrl("not a url")).toBeNull();
  });
});
