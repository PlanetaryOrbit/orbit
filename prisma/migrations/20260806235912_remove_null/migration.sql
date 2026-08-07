/*
  Warnings:

  - Made the column `logoUrl` on table `InstanceSettings` required. This step will fail if there are existing NULL values in that column.
  - Made the column `lightBackground` on table `InstanceSettings` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "InstanceSettings" ALTER COLUMN "logoUrl" SET NOT NULL,
ALTER COLUMN "lightBackground" SET NOT NULL;
