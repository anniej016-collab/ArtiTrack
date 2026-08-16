-- CreateTable
CREATE TABLE "Discovery" (
    "id" TEXT NOT NULL,
    "artistName" TEXT NOT NULL,
    "title" TEXT,
    "note" TEXT,
    "heard" BOOLEAN NOT NULL DEFAULT false,
    "heardAt" TIMESTAMP(3),
    "source" TEXT NOT NULL DEFAULT 'manual',
    "externalId" TEXT,
    "url" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Discovery_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Discovery_heard_idx" ON "Discovery"("heard");

-- CreateIndex
CREATE UNIQUE INDEX "Discovery_source_externalId_key" ON "Discovery"("source", "externalId");
