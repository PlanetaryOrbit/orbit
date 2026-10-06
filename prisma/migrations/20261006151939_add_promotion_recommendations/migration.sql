-- CreateTable
CREATE TABLE "promotionRecommendation" (
    "id" UUID NOT NULL,
    "workspaceGroupId" INTEGER NOT NULL,
    "recommenderId" BIGINT NOT NULL,
    "targetId" BIGINT NOT NULL,
    "recommenderRank" INTEGER NOT NULL,
    "targetRank" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "reviewerId" BIGINT,
    "reviewReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "reviewedAt" TIMESTAMP(3),

    CONSTRAINT "promotionRecommendation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "promotionRecommendation_id_key" ON "promotionRecommendation"("id");

-- CreateIndex
CREATE INDEX "promotionRecommendation_workspaceGroupId_status_idx" ON "promotionRecommendation"("workspaceGroupId", "status");

-- CreateIndex
CREATE INDEX "promotionRecommendation_workspaceGroupId_targetId_idx" ON "promotionRecommendation"("workspaceGroupId", "targetId");

-- CreateIndex
CREATE INDEX "promotionRecommendation_workspaceGroupId_recommenderId_idx" ON "promotionRecommendation"("workspaceGroupId", "recommenderId");

-- CreateIndex
CREATE INDEX "promotionRecommendation_recommenderId_idx" ON "promotionRecommendation"("recommenderId");

-- CreateIndex
CREATE INDEX "promotionRecommendation_targetId_idx" ON "promotionRecommendation"("targetId");

-- CreateIndex
CREATE INDEX "promotionRecommendation_reviewerId_idx" ON "promotionRecommendation"("reviewerId");

-- AddForeignKey
ALTER TABLE "promotionRecommendation" ADD CONSTRAINT "promotionRecommendation_workspaceGroupId_fkey" FOREIGN KEY ("workspaceGroupId") REFERENCES "workspace"("groupId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promotionRecommendation" ADD CONSTRAINT "promotionRecommendation_recommenderId_fkey" FOREIGN KEY ("recommenderId") REFERENCES "user"("userid") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promotionRecommendation" ADD CONSTRAINT "promotionRecommendation_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "user"("userid") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promotionRecommendation" ADD CONSTRAINT "promotionRecommendation_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "user"("userid") ON DELETE SET NULL ON UPDATE CASCADE;
