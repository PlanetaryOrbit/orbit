-- CreateTable
CREATE TABLE "QuotaUser" (
    "quotaId" UUID NOT NULL,
    "userId" BIGINT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "QuotaUser_quotaId_userId_key" ON "QuotaUser"("quotaId", "userId");

-- AddForeignKey
ALTER TABLE "QuotaUser" ADD CONSTRAINT "QuotaUser_quotaId_fkey" FOREIGN KEY ("quotaId") REFERENCES "Quota"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuotaUser" ADD CONSTRAINT "QuotaUser_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("userid") ON DELETE CASCADE ON UPDATE CASCADE;
