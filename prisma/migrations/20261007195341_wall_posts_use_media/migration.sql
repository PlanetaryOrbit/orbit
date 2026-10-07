/*
  Warnings:

  - You are about to drop the column `image` on the `wallPost` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "wallPost" DROP COLUMN "image",
ADD COLUMN     "mediaId" UUID;

-- CreateIndex
CREATE INDEX "wallPost_workspaceGroupId_createdAt_idx" ON "wallPost"("workspaceGroupId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "wallPost_authorId_idx" ON "wallPost"("authorId");

-- CreateIndex
CREATE INDEX "wallPost_mediaId_idx" ON "wallPost"("mediaId");

-- AddForeignKey
ALTER TABLE "wallPost" ADD CONSTRAINT "wallPost_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "media"("id") ON DELETE SET NULL ON UPDATE CASCADE;
