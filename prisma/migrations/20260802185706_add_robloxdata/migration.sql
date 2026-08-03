/*
  Warnings:

  - You are about to drop the `RobloxIdentity` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "RobloxIdentity" DROP CONSTRAINT "RobloxIdentity_userId_fkey";

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "robloxData" JSONB;

-- DropTable
DROP TABLE "RobloxIdentity";

-- CreateIndex
CREATE INDEX "User_robloxData_idx" ON "User"("robloxData");
