/*
  Warnings:

  - You are about to drop the column `uploaderId` on the `media` table. All the data in the column will be lost.
  - Added the required column `uploadedBy` to the `media` table without a default value. This is not possible if the table is not empty.
  - Made the column `filename` on table `media` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "media" DROP CONSTRAINT "media_uploaderId_fkey";

-- DropIndex
DROP INDEX "media_createdAt_idx";

-- DropIndex
DROP INDEX "media_uploaderId_idx";

-- AlterTable
ALTER TABLE "media" DROP COLUMN "uploaderId",
ADD COLUMN     "height" INTEGER,
ADD COLUMN     "uploadedBy" BIGINT NOT NULL,
ADD COLUMN     "width" INTEGER,
ALTER COLUMN "filename" SET NOT NULL,
ALTER COLUMN "mimeType" SET DEFAULT 'image/webp';

-- CreateIndex
CREATE INDEX "media_uploadedBy_idx" ON "media"("uploadedBy");

-- AddForeignKey
ALTER TABLE "media" ADD CONSTRAINT "media_uploadedBy_fkey" FOREIGN KEY ("uploadedBy") REFERENCES "user"("userid") ON DELETE RESTRICT ON UPDATE CASCADE;
