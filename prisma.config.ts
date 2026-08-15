import "dotenv/config";
import { defineConfig } from "prisma/config";
import { resolveMigrationUrl } from "./src/lib/db-url";

const url = resolveMigrationUrl();

if (!url) {
  // Prisma would otherwise fail with a bare "Connection url is empty", which says
  // nothing about what the environment actually contains. Report the names of any
  // database-ish variables that are set — names only, never values, since
  // connection strings carry credentials and build logs are not private.
  const suspects = Object.keys(process.env)
    .filter((name) => /DATABASE|POSTGRES|\bPG/i.test(name))
    .sort();

  console.error(
    [
      "",
      "No Postgres connection string is available.",
      "",
      "Nothing in the environment holds a value starting with postgres:// or postgresql://.",
      suspects.length
        ? `Database-related variables that are set (names only): ${suspects.join(", ")}`
        : "No database-related variables are set at all.",
      "",
      "On Vercel: open the project's Storage tab and attach a Postgres database,",
      "leaving the environment-variable prefix blank. If the variable does exist but",
      "is scoped to another environment, enable it for the one being built.",
      "",
    ].join("\n"),
  );
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url,
  },
});
