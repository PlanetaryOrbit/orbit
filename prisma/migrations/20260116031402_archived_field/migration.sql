-- AlterTable
ALTER TABLE "ActivityAdjustment" ADD COLUMN     "archiveEndDate" TIMESTAMP(3),
ADD COLUMN     "archiveStartDate" TIMESTAMP(3),
ADD COLUMN     "archived" BOOLEAN DEFAULT false;

-- AlterTable
ALTER TABLE "ActivitySession" ADD COLUMN     "archiveEndDate" TIMESTAMP(3),
ADD COLUMN     "archiveStartDate" TIMESTAMP(3),
ADD COLUMN     "archived" BOOLEAN DEFAULT false;

-- AlterTable
ALTER TABLE "Session" ADD COLUMN     "archiveEndDate" TIMESTAMP(3),
ADD COLUMN     "archiveStartDate" TIMESTAMP(3),
ADD COLUMN     "archived" BOOLEAN DEFAULT false;

-- AlterTable
ALTER TABLE "sessionUser" ADD COLUMN     "archiveEndDate" TIMESTAMP(3),
ADD COLUMN     "archiveStartDate" TIMESTAMP(3),
ADD COLUMN     "archived" BOOLEAN DEFAULT false;
