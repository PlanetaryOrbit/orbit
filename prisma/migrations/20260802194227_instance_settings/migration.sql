-- CreateTable
CREATE TABLE "InstanceSettings" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT 'Orbit',
    "logoUrl" TEXT,
    "faviconUrl" TEXT,
    "allowPasswordAuth" BOOLEAN NOT NULL DEFAULT true,
    "enableRegistration" BOOLEAN NOT NULL DEFAULT true,
    "primaryColor" TEXT NOT NULL DEFAULT '#ea76cb',
    "darkBackground" TEXT NOT NULL DEFAULT '/orbitbackground-dark.svg',
    "lightBackground" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InstanceSettings_pkey" PRIMARY KEY ("id")
);
