/*
  Warnings:

  - You are about to drop the `WallPost` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `WallReaction` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `media` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "WallPost" DROP CONSTRAINT "WallPost_authorId_fkey";

-- DropForeignKey
ALTER TABLE "WallPost" DROP CONSTRAINT "WallPost_mediaId_fkey";

-- DropForeignKey
ALTER TABLE "WallPost" DROP CONSTRAINT "WallPost_workspaceGroupId_fkey";

-- DropForeignKey
ALTER TABLE "WallReaction" DROP CONSTRAINT "WallReaction_postId_fkey";

-- DropForeignKey
ALTER TABLE "WallReaction" DROP CONSTRAINT "WallReaction_userId_fkey";

-- DropForeignKey
ALTER TABLE "media" DROP CONSTRAINT "media_uploadedBy_fkey";

-- DropTable
DROP TABLE "WallPost";

-- DropTable
DROP TABLE "WallReaction";

-- DropTable
DROP TABLE "media";

-- CreateTable
CREATE TABLE "wallPost" (
    "id" SERIAL NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "workspaceGroupId" INTEGER NOT NULL,
    "authorId" BIGINT NOT NULL,
    "image" TEXT,

    CONSTRAINT "wallPost_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "wallPost" ADD CONSTRAINT "wallPost_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "user"("userid") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallPost" ADD CONSTRAINT "wallPost_workspaceGroupId_fkey" FOREIGN KEY ("workspaceGroupId") REFERENCES "workspace"("groupId") ON DELETE RESTRICT ON UPDATE CASCADE;
