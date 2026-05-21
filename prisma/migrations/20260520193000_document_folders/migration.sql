-- AlterTable
ALTER TABLE "document" ADD COLUMN IF NOT EXISTS "folderId" UUID;

-- CreateTable
CREATE TABLE IF NOT EXISTS "documentFolder" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "workspaceGroupId" INTEGER NOT NULL,
    "parentId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "documentFolder_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "documentFolder_id_key" ON "documentFolder"("id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "document_folderId_idx" ON "document"("folderId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "documentFolder_workspaceGroupId_idx" ON "documentFolder"("workspaceGroupId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "documentFolder_parentId_idx" ON "documentFolder"("parentId");

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'document_folderId_fkey'
  ) THEN
    ALTER TABLE "document" ADD CONSTRAINT "document_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "documentFolder"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'documentFolder_workspaceGroupId_fkey'
  ) THEN
    ALTER TABLE "documentFolder" ADD CONSTRAINT "documentFolder_workspaceGroupId_fkey" FOREIGN KEY ("workspaceGroupId") REFERENCES "workspace"("groupId") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'documentFolder_parentId_fkey'
  ) THEN
    ALTER TABLE "documentFolder" ADD CONSTRAINT "documentFolder_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "documentFolder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
