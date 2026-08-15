import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Hosted Postgres providers name the connection string differently, and Vercel's
// database integrations set several of these at once. Prefer a pooled URL here:
// serverless functions open a lot of short-lived connections.
const RUNTIME_URL_VARS = [
  "DATABASE_URL",
  "POSTGRES_PRISMA_URL",
  "POSTGRES_URL",
  "DATABASE_URL_UNPOOLED",
  "POSTGRES_URL_NON_POOLING",
] as const;

function createPrismaClient() {
  const connectionString = RUNTIME_URL_VARS.map((name) => process.env[name]).find(
    (value) => value,
  );

  if (!connectionString) {
    throw new Error(
      `No Postgres connection string found. Set one of: ${RUNTIME_URL_VARS.join(", ")}. ` +
        "Locally that means .env; on Vercel, the project's Environment Variables.",
    );
  }

  return new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
