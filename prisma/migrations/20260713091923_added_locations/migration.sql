-- AlterTable
ALTER TABLE "AuthSession" ADD COLUMN     "city" TEXT,
ADD COLUMN     "country" TEXT;

-- CreateTable
CREATE TABLE "form" (
    "id" UUID NOT NULL,
    "workspaceGroupId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isEnabled" BOOLEAN NOT NULL,
    "settings" JSONB NOT NULL,
    "visibility" JSONB,
    "createdById" BIGINT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "form_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "formQuestion" (
    "id" UUID NOT NULL,
    "formId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "position" INTEGER NOT NULL,
    "settings" JSONB,
    "visibilityRules" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedat" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "formQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "formSubmission" (
    "id" UUID NOT NULL,
    "formId" UUID NOT NULL,
    "workspaceGroupId" INTEGER NOT NULL,
    "userId" BIGINT,
    "robloxUserId" BIGINT,
    "discordUserId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'SUBMITTED',
    "metadata" JSONB,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "formSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "formAnswer" (
    "id" UUID NOT NULL,
    "submissionId" UUID NOT NULL,
    "questionId" UUID NOT NULL,
    "value" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "formAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "formReview" (
    "id" UUID NOT NULL,
    "submissionId" UUID NOT NULL,
    "reviewerId" BIGINT NOT NULL,
    "vote" TEXT,
    "score" INTEGER,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "formReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "formComment" (
    "id" UUID NOT NULL,
    "submissionId" UUID NOT NULL,
    "authorId" BIGINT NOT NULL,
    "content" TEXT NOT NULL,
    "internal" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "formComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "formAuditLog" (
    "id" UUID NOT NULL,
    "workspaceGroupId" INTEGER,
    "formId" UUID,
    "submissionId" UUID,
    "actorId" BIGINT,
    "action" TEXT NOT NULL,
    "details" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "formAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "form_workspaceGroupId_idx" ON "form"("workspaceGroupId");

-- CreateIndex
CREATE INDEX "formQuestion_formId_idx" ON "formQuestion"("formId");

-- CreateIndex
CREATE INDEX "formSubmission_formId_idx" ON "formSubmission"("formId");

-- CreateIndex
CREATE INDEX "formSubmission_workspaceGroupId_idx" ON "formSubmission"("workspaceGroupId");

-- CreateIndex
CREATE INDEX "formSubmission_status_idx" ON "formSubmission"("status");

-- CreateIndex
CREATE INDEX "formAnswer_submissionId_idx" ON "formAnswer"("submissionId");

-- CreateIndex
CREATE INDEX "formAnswer_questionId_idx" ON "formAnswer"("questionId");

-- CreateIndex
CREATE INDEX "formReview_submissionId_idx" ON "formReview"("submissionId");

-- CreateIndex
CREATE INDEX "formReview_reviewerId_idx" ON "formReview"("reviewerId");

-- CreateIndex
CREATE INDEX "formComment_submissionId_idx" ON "formComment"("submissionId");

-- CreateIndex
CREATE INDEX "formAuditLog_formId_idx" ON "formAuditLog"("formId");

-- CreateIndex
CREATE INDEX "formAuditLog_submissionId_idx" ON "formAuditLog"("submissionId");

-- CreateIndex
CREATE INDEX "formAuditLog_workspaceGroupId_idx" ON "formAuditLog"("workspaceGroupId");

-- AddForeignKey
ALTER TABLE "form" ADD CONSTRAINT "form_workspaceGroupId_fkey" FOREIGN KEY ("workspaceGroupId") REFERENCES "workspace"("groupId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "form" ADD CONSTRAINT "form_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "user"("userid") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "formQuestion" ADD CONSTRAINT "formQuestion_formId_fkey" FOREIGN KEY ("formId") REFERENCES "form"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "formSubmission" ADD CONSTRAINT "formSubmission_formId_fkey" FOREIGN KEY ("formId") REFERENCES "form"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "formAnswer" ADD CONSTRAINT "formAnswer_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "formSubmission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "formAnswer" ADD CONSTRAINT "formAnswer_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "formQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "formReview" ADD CONSTRAINT "formReview_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "formSubmission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "formComment" ADD CONSTRAINT "formComment_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "formSubmission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "formAuditLog" ADD CONSTRAINT "formAuditLog_formId_fkey" FOREIGN KEY ("formId") REFERENCES "form"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "formAuditLog" ADD CONSTRAINT "formAuditLog_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "formSubmission"("id") ON DELETE SET NULL ON UPDATE CASCADE;
