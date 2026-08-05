-- AlterTable
ALTER TABLE "InstanceSettings" ADD COLUMN     "allowRobloxAuth" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "robloxAuthConfig" JSONB,
ALTER COLUMN "logoUrl" SET DEFAULT '/favicon.png',
ALTER COLUMN "faviconUrl" SET DEFAULT '/favicon.png',
ALTER COLUMN "lightBackground" SET DEFAULT '/orbitbackground-dark.svg';
