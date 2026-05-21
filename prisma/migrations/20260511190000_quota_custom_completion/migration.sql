-- AlterTable
ALTER TABLE "Quota" ALTER COLUMN "value" DROP NOT NULL;

-- CreateTable
CREATE TABLE "QuotaCustomCompletion" (
    "id" UUID NOT NULL,
    "quotaId" UUID NOT NULL,
    "userId" BIGINT NOT NULL,
    "status" TEXT NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),
    "reviewedByUserId" BIGINT,

    CONSTRAINT "QuotaCustomCompletion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "QuotaCustomCompletion_quotaId_userId_key" ON "QuotaCustomCompletion"("quotaId", "userId");

-- CreateIndex
CREATE INDEX "QuotaCustomCompletion_quotaId_status_idx" ON "QuotaCustomCompletion"("quotaId", "status");

-- AddForeignKey
ALTER TABLE "QuotaCustomCompletion" ADD CONSTRAINT "QuotaCustomCompletion_quotaId_fkey" FOREIGN KEY ("quotaId") REFERENCES "Quota"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuotaCustomCompletion" ADD CONSTRAINT "QuotaCustomCompletion_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("userid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuotaCustomCompletion" ADD CONSTRAINT "QuotaCustomCompletion_reviewedByUserId_fkey" FOREIGN KEY ("reviewedByUserId") REFERENCES "user"("userid") ON DELETE SET NULL ON UPDATE CASCADE;
