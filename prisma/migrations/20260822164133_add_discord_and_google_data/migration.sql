-- DropIndex
DROP INDEX "User_robloxId_idx";

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "discordData" JSONB,
ADD COLUMN     "googleData" JSONB;

-- CreateIndex
CREATE INDEX "User_discordData_idx" ON "User"("discordData");

-- CreateIndex
CREATE INDEX "User_googleData_idx" ON "User"("googleData");
