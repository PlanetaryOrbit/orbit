-- AlterTable
ALTER TABLE "documentFolder" ADD COLUMN IF NOT EXISTS "icon" TEXT NOT NULL DEFAULT 'folder';
