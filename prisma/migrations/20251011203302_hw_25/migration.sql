/*
  Warnings:

  - The primary key for the `QuotaRole` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the `_QuotaTorole` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[id]` on the table `apiKey` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "_QuotaTorole" DROP CONSTRAINT "_QuotaTorole_A_fkey";

-- DropForeignKey
ALTER TABLE "_QuotaTorole" DROP CONSTRAINT "_QuotaTorole_B_fkey";

-- DropIndex
DROP INDEX "Quota_id_key";

-- AlterTable
ALTER TABLE "QuotaRole" DROP CONSTRAINT "QuotaRole_pkey";

-- AlterTable
ALTER TABLE "_AllyTouser" ADD CONSTRAINT "_AllyTouser_AB_pkey" PRIMARY KEY ("A", "B");

-- DropIndex
DROP INDEX "_AllyTouser_AB_unique";

-- AlterTable
ALTER TABLE "_SessionTypeTorole" ADD CONSTRAINT "_SessionTypeTorole_AB_pkey" PRIMARY KEY ("A", "B");

-- DropIndex
DROP INDEX "_SessionTypeTorole_AB_unique";

-- AlterTable
ALTER TABLE "_documentTorole" ADD CONSTRAINT "_documentTorole_AB_pkey" PRIMARY KEY ("A", "B");

-- DropIndex
DROP INDEX "_documentTorole_AB_unique";

-- AlterTable
ALTER TABLE "_roleTouser" ADD CONSTRAINT "_roleTouser_AB_pkey" PRIMARY KEY ("A", "B");

-- DropIndex
DROP INDEX "_roleTouser_AB_unique";

-- DropTable
DROP TABLE "_QuotaTorole";

-- CreateTable
CREATE TABLE "workspaceMember" (
    "workspaceGroupId" INTEGER NOT NULL,
    "userId" BIGINT NOT NULL,
    "joinDate" TIMESTAMP(3),
    "birthdayDay" INTEGER,
    "birthdayMonth" INTEGER,

    CONSTRAINT "workspaceMember_pkey" PRIMARY KEY ("workspaceGroupId","userId")
);

-- CreateTable
CREATE TABLE "ActivityAdjustment" (
    "id" UUID NOT NULL,
    "userId" BIGINT NOT NULL,
    "actorId" BIGINT NOT NULL,
    "workspaceGroupId" INTEGER NOT NULL,
    "minutes" INTEGER NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActivityAdjustment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "workspaceMember_userId_idx" ON "workspaceMember"("userId");

-- CreateIndex
CREATE INDEX "ActivityAdjustment_userId_idx" ON "ActivityAdjustment"("userId");

-- CreateIndex
CREATE INDEX "ActivityAdjustment_actorId_idx" ON "ActivityAdjustment"("actorId");

-- CreateIndex
CREATE INDEX "ActivityAdjustment_workspaceGroupId_idx" ON "ActivityAdjustment"("workspaceGroupId");

-- CreateIndex
CREATE UNIQUE INDEX "apiKey_id_key" ON "apiKey"("id");

-- AddForeignKey
ALTER TABLE "workspaceMember" ADD CONSTRAINT "workspaceMember_workspaceGroupId_fkey" FOREIGN KEY ("workspaceGroupId") REFERENCES "workspace"("groupId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspaceMember" ADD CONSTRAINT "workspaceMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("userid") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityAdjustment" ADD CONSTRAINT "ActivityAdjustment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("userid") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityAdjustment" ADD CONSTRAINT "ActivityAdjustment_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "user"("userid") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityAdjustment" ADD CONSTRAINT "ActivityAdjustment_workspaceGroupId_fkey" FOREIGN KEY ("workspaceGroupId") REFERENCES "workspace"("groupId") ON DELETE RESTRICT ON UPDATE CASCADE;
