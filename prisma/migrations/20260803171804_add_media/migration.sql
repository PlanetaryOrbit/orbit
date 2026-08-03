/*
  Warnings:

  - You are about to drop the `form` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `formAnswer` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `formAuditLog` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `formComment` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `formQuestion` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `formReview` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `formSubmission` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `wallPost` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "form" DROP CONSTRAINT "form_createdById_fkey";

-- DropForeignKey
ALTER TABLE "form" DROP CONSTRAINT "form_workspaceGroupId_fkey";

-- DropForeignKey
ALTER TABLE "formAnswer" DROP CONSTRAINT "formAnswer_questionId_fkey";

-- DropForeignKey
ALTER TABLE "formAnswer" DROP CONSTRAINT "formAnswer_submissionId_fkey";

-- DropForeignKey
ALTER TABLE "formAuditLog" DROP CONSTRAINT "formAuditLog_formId_fkey";

-- DropForeignKey
ALTER TABLE "formAuditLog" DROP CONSTRAINT "formAuditLog_submissionId_fkey";

-- DropForeignKey
ALTER TABLE "formComment" DROP CONSTRAINT "formComment_submissionId_fkey";

-- DropForeignKey
ALTER TABLE "formQuestion" DROP CONSTRAINT "formQuestion_formId_fkey";

-- DropForeignKey
ALTER TABLE "formReview" DROP CONSTRAINT "formReview_submissionId_fkey";

-- DropForeignKey
ALTER TABLE "formSubmission" DROP CONSTRAINT "formSubmission_formId_fkey";

-- DropForeignKey
ALTER TABLE "wallPost" DROP CONSTRAINT "wallPost_authorId_fkey";

-- DropForeignKey
ALTER TABLE "wallPost" DROP CONSTRAINT "wallPost_workspaceGroupId_fkey";

-- DropTable
DROP TABLE "form";

-- DropTable
DROP TABLE "formAnswer";

-- DropTable
DROP TABLE "formAuditLog";

-- DropTable
DROP TABLE "formComment";

-- DropTable
DROP TABLE "formQuestion";

-- DropTable
DROP TABLE "formReview";

-- DropTable
DROP TABLE "formSubmission";

-- DropTable
DROP TABLE "wallPost";

-- CreateTable
CREATE TABLE "media" (
    "id" UUID NOT NULL,
    "url" TEXT NOT NULL,
    "filename" TEXT,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "uploaderId" BIGINT,

    CONSTRAINT "media_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "media_createdAt_idx" ON "media"("createdAt");

-- CreateIndex
CREATE INDEX "media_uploaderId_idx" ON "media"("uploaderId");

-- AddForeignKey
ALTER TABLE "media" ADD CONSTRAINT "media_uploaderId_fkey" FOREIGN KEY ("uploaderId") REFERENCES "user"("userid") ON DELETE SET NULL ON UPDATE CASCADE;
