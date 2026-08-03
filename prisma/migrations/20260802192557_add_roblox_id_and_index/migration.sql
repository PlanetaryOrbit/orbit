/*
  Warnings:

  - Added the required column `robloxId` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "User" ADD COLUMN     "isOwner" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "robloxId" BIGINT NOT NULL;

-- CreateIndex
CREATE INDEX "User_robloxId_idx" ON "User"("robloxId");
