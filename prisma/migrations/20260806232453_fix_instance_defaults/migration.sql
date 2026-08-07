/*
  Warnings:

  - You are about to drop the column `faviconUrl` on the `InstanceSettings` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "InstanceSettings" DROP COLUMN "faviconUrl",
ALTER COLUMN "primaryColor" SET DEFAULT '#fb019c',
ALTER COLUMN "lightBackground" SET DEFAULT '/orbitbackground-light.svg';
