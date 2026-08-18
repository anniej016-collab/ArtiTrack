// Resolving the Postgres connection string is messier than reading one variable.
// Hosted providers each pick their own name, Vercel's integration sets a whole
// family at once, and attaching a database with a custom prefix renames all of
// them. So: check the well-known names first, then fall back to scanning for any
// variable that actually holds a Postgres URL.

const POOLED_NAMES = [
  "DATABASE_URL",
  "POSTGRES_PRISMA_URL",
  "POSTGRES_URL",
] as const;

const DIRECT_NAMES = [
  "DIRECT_DATABASE_URL",
  "DATABASE_URL_UNPOOLED",
  "POSTGRES_URL_NON_POOLING",
] as const;

const POSTGRES_URL_PATTERN = /^postgres(ql)?:\/\//i;

/** Loose on purpose: any bag of variables, including one built in a test. */
type Env = Record<string, string | undefined>;

/** Names of every env var whose value looks like a Postgres connection string. */
export function discoverPostgresUrlVars(
  env: Env = process.env,
): string[] {
  return Object.keys(env)
    .filter((name) => POSTGRES_URL_PATTERN.test(env[name] ?? ""))
    .sort();
}

function firstMatch(
  names: readonly string[],
  env: Env,
): string | undefined {
  for (const name of names) {
    const value = env[name];
    if (value && POSTGRES_URL_PATTERN.test(value)) return name;
  }
  return undefined;
}

function suffixMatch(
  suffixes: readonly string[],
  env: Env,
): string | undefined {
  // Catches custom-prefixed variables such as MYAPP_POSTGRES_URL_NON_POOLING.
  return discoverPostgresUrlVars(env).find((name) =>
    suffixes.some((suffix) => name.endsWith(suffix)),
  );
}

/**
 * Name of the variable to use for queries. Prefers a pooled connection, which
 * matters on serverless hosts that open many short-lived connections.
 */
export function resolveRuntimeUrlVar(
  env: Env = process.env,
): string | undefined {
  return (
    firstMatch(POOLED_NAMES, env) ??
    firstMatch(DIRECT_NAMES, env) ??
    suffixMatch(POOLED_NAMES, env) ??
    discoverPostgresUrlVars(env)[0]
  );
}

/**
 * Name of the variable to use for migrations. Prefers a direct (non-pooled)
 * connection, which migrations require.
 */
export function resolveMigrationUrlVar(
  env: Env = process.env,
): string | undefined {
  return (
    firstMatch(DIRECT_NAMES, env) ??
    firstMatch(POOLED_NAMES, env) ??
    suffixMatch(DIRECT_NAMES, env) ??
    suffixMatch(POOLED_NAMES, env) ??
    discoverPostgresUrlVars(env)[0]
  );
}

export function resolveRuntimeUrl(
  env: Env = process.env,
): string | undefined {
  const name = resolveRuntimeUrlVar(env);
  return name ? env[name] : undefined;
}

export function resolveMigrationUrl(
  env: Env = process.env,
): string | undefined {
  const name = resolveMigrationUrlVar(env);
  return name ? env[name] : undefined;
}

/**
 * The identifying part of a connection string, with the credentials removed.
 *
 * Enough to tell two databases apart and to recognise two names for the same
 * one, without ever handing back the password. A pooled endpoint and a direct
 * endpoint of the same database differ only by a `-pooler` suffix on the host,
 * so that is stripped for the comparison but kept for display — otherwise two
 * names for one database read as two databases.
 */
export type PostgresTarget = {
  /** Host as written, pooler suffix and all. */
  host: string;
  /** Database name, without the leading slash. */
  database: string;
  /** Equal for two variables that point at the same database. */
  identity: string;
};

export function describePostgresUrl(value: string): PostgresTarget | null {
  if (!POSTGRES_URL_PATTERN.test(value)) return null;

  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return null;
  }

  const host = parsed.host;
  const database = parsed.pathname.replace(/^\//, "");
  const direct = host.replace(/-pooler(?=\.|:|$)/, "");

  return { host, database, identity: `${direct}/${database}` };
}
