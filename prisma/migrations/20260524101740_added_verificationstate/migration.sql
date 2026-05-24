-- AlterTable
ALTER TABLE "ActivitySession" ADD COLUMN     "chatLog" JSONB;

-- AlterTable
ALTER TABLE "Ally" ADD COLUMN     "strikes" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "terminationEffectiveDate" TIMESTAMP(3),
ADD COLUMN     "terminationReason" TEXT;

-- AlterTable
ALTER TABLE "Session" ADD COLUMN     "cancellationReason" TEXT,
ADD COLUMN     "cancelled" BOOLEAN DEFAULT false;

-- AlterTable
ALTER TABLE "role" ALTER COLUMN "groupRoles" SET DATA TYPE BIGINT[];

-- AlterTable
ALTER TABLE "user" ADD COLUMN     "isFirstLogin" BOOLEAN DEFAULT true;

-- AlterTable
ALTER TABLE "workspace" ADD COLUMN     "customName" TEXT,
ADD COLUMN     "lastSyncedSuccessful" BOOLEAN DEFAULT false,
ADD COLUMN     "memberCount" INTEGER;

-- AlterTable
ALTER TABLE "workspaceExternalServices" ADD COLUMN     "rankingMaxRank" INTEGER;

-- AlterTable
ALTER TABLE "workspaceMember" ADD COLUMN     "introNote" TEXT,
ADD COLUMN     "introSong" TEXT;

-- CreateTable
CREATE TABLE "AuthSession" (
    "id" UUID NOT NULL,
    "userId" BIGINT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "browser" TEXT,
    "os" TEXT,
    "device" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AuthSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OAuthState" (
    "id" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "userId" BIGINT,
    "provider" TEXT NOT NULL DEFAULT 'roblox',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OAuthState_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ValidationState" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "userId" BIGINT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ValidationState_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationState" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "userId" BIGINT NOT NULL,
    "isReset" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VerificationState_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pendingVerification" (
    "token" UUID NOT NULL,
    "userid" INTEGER NOT NULL,
    "verificationCode" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pendingVerification_pkey" PRIMARY KEY ("token")
);

-- CreateTable
CREATE TABLE "DiscordUser" (
    "discordUserId" BIGINT NOT NULL,
    "robloxUserId" BIGINT,
    "username" TEXT NOT NULL,
    "avatar" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DiscordUser_pkey" PRIMARY KEY ("discordUserId")
);

-- CreateTable
CREATE TABLE "GoogleUser" (
    "googleUserId" TEXT NOT NULL,
    "robloxUserId" BIGINT,
    "username" TEXT NOT NULL,
    "avatar" TEXT,
    "email" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GoogleUser_pkey" PRIMARY KEY ("googleUserId")
);

-- CreateIndex
CREATE UNIQUE INDEX "AuthSession_id_key" ON "AuthSession"("id");

-- CreateIndex
CREATE UNIQUE INDEX "AuthSession_token_key" ON "AuthSession"("token");

-- CreateIndex
CREATE UNIQUE INDEX "OAuthState_state_key" ON "OAuthState"("state");

-- CreateIndex
CREATE INDEX "OAuthState_state_idx" ON "OAuthState"("state");

-- CreateIndex
CREATE INDEX "OAuthState_expiresAt_idx" ON "OAuthState"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "ValidationState_code_key" ON "ValidationState"("code");

-- CreateIndex
CREATE INDEX "ValidationState_code_idx" ON "ValidationState"("code");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationState_code_key" ON "VerificationState"("code");

-- CreateIndex
CREATE INDEX "VerificationState_code_idx" ON "VerificationState"("code");

-- CreateIndex
CREATE UNIQUE INDEX "pendingVerification_token_key" ON "pendingVerification"("token");

-- CreateIndex
CREATE INDEX "pendingVerification_expiresAt_idx" ON "pendingVerification"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "DiscordUser_robloxUserId_key" ON "DiscordUser"("robloxUserId");

-- CreateIndex
CREATE UNIQUE INDEX "GoogleUser_robloxUserId_key" ON "GoogleUser"("robloxUserId");

-- AddForeignKey
ALTER TABLE "AuthSession" ADD CONSTRAINT "AuthSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("userid") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiscordUser" ADD CONSTRAINT "DiscordUser_robloxUserId_fkey" FOREIGN KEY ("robloxUserId") REFERENCES "user"("userid") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoogleUser" ADD CONSTRAINT "GoogleUser_robloxUserId_fkey" FOREIGN KEY ("robloxUserId") REFERENCES "user"("userid") ON DELETE SET NULL ON UPDATE CASCADE;
