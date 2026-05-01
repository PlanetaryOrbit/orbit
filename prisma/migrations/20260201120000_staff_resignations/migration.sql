-- CreateTable
CREATE TABLE "staffResignation" (
    "id" UUID NOT NULL,
    "userId" BIGINT NOT NULL,
    "workspaceGroupId" INTEGER NOT NULL,
    "lastWorkingDay" TIMESTAMP(3) NOT NULL,
    "reason" TEXT NOT NULL,
    "approved" BOOLEAN DEFAULT false,
    "reviewed" BOOLEAN DEFAULT false,
    "reviewComment" TEXT,
    "reviewerId" BIGINT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "staffResignation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "staffResignation_id_key" ON "staffResignation"("id");

-- CreateIndex
CREATE INDEX "staffResignation_workspaceGroupId_idx" ON "staffResignation"("workspaceGroupId");

-- CreateIndex
CREATE INDEX "staffResignation_userId_idx" ON "staffResignation"("userId");

-- AddForeignKey
ALTER TABLE "staffResignation" ADD CONSTRAINT "staffResignation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("userid") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staffResignation" ADD CONSTRAINT "staffResignation_workspaceGroupId_fkey" FOREIGN KEY ("workspaceGroupId") REFERENCES "workspace"("groupId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staffResignation" ADD CONSTRAINT "staffResignation_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "user"("userid") ON DELETE SET NULL ON UPDATE CASCADE;
