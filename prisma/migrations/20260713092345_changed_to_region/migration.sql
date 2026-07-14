/*
  Warnings:

  - You are about to drop the column `city` on the `AuthSession` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "AuthSession" DROP COLUMN "city",
ADD COLUMN     "region" TEXT;
