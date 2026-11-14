-- CreateTable
CREATE TABLE "DataRequest" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "details" TEXT,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "doneAt" TIMESTAMP(3),

    CONSTRAINT "DataRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DataRequest_reference_key" ON "DataRequest"("reference");

-- CreateIndex
CREATE INDEX "DataRequest_status_createdAt_idx" ON "DataRequest"("status", "createdAt");

-- Same lock-down as every other table: only the server (Prisma) may touch it, never the public API roles.
ALTER TABLE "DataRequest" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON "DataRequest" FROM anon, authenticated;
