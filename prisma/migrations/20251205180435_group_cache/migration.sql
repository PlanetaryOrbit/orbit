-- AlterTable
ALTER TABLE "workspace" ADD COLUMN     "groupLogo" TEXT,
ADD COLUMN     "groupName" TEXT,
ADD COLUMN     "lastSynced" TIMESTAMP(3);
