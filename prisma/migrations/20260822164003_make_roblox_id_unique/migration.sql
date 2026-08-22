/*
  Warnings:

  - A unique constraint covering the columns `[robloxId]` on the table `User` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "User" ADD COLUMN     "banned" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "bannedAt" TIMESTAMP(3),
ADD COLUMN     "bannedFor" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "User_robloxId_key" ON "User"("robloxId");

-- CreateIndex
CREATE INDEX "User_banned_idx" ON "User"("banned");

-- CreateIndex
CREATE INDEX "User_bannedAt_idx" ON "User"("bannedAt");

-- CreateIndex
CREATE INDEX "User_bannedFor_idx" ON "User"("bannedFor");
