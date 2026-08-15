import "dotenv/config";
import { defineConfig } from "prisma/config";

// Migrations want a direct (non-pooled) connection, so the unpooled names come
// first here. Hosted providers expose them alongside the pooled runtime URL.
const MIGRATION_URL_VARS = [
  "DIRECT_DATABASE_URL",
  "DATABASE_URL_UNPOOLED",
  "POSTGRES_URL_NON_POOLING",
  "DATABASE_URL",
  "POSTGRES_URL",
];

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: MIGRATION_URL_VARS.map((name) => process.env[name]).find((value) => value),
  },
});
