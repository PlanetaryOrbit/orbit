-- DropForeignKey
ALTER TABLE "ActivityReset" DROP CONSTRAINT "ActivityReset_resetById_fkey";

-- AlterTable
ALTER TABLE "ActivityReset" ALTER COLUMN "resetById" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "ActivityReset" ADD CONSTRAINT "ActivityReset_resetById_fkey" FOREIGN KEY ("resetById") REFERENCES "user"("userid") ON DELETE SET NULL ON UPDATE CASCADE;
