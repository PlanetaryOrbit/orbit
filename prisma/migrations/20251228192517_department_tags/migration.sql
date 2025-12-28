/*
  Warnings:

  - You are about to drop the column `department` on the `workspaceMember` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "workspaceMember" DROP COLUMN "department";

-- CreateTable
CREATE TABLE "department" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT,
    "workspaceGroupId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "department_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DepartmentMember" (
    "departmentId" UUID NOT NULL,
    "workspaceGroupId" INTEGER NOT NULL,
    "userId" BIGINT NOT NULL,

    CONSTRAINT "DepartmentMember_pkey" PRIMARY KEY ("departmentId","workspaceGroupId","userId")
);

-- CreateTable
CREATE TABLE "QuotaDepartment" (
    "quotaId" UUID NOT NULL,
    "departmentId" UUID NOT NULL
);

-- CreateTable
CREATE TABLE "_documentTodepartment" (
    "A" UUID NOT NULL,
    "B" UUID NOT NULL,

    CONSTRAINT "_documentTodepartment_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_SessionTypeTodepartment" (
    "A" UUID NOT NULL,
    "B" UUID NOT NULL,

    CONSTRAINT "_SessionTypeTodepartment_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "department_id_key" ON "department"("id");

-- CreateIndex
CREATE UNIQUE INDEX "QuotaDepartment_quotaId_departmentId_key" ON "QuotaDepartment"("quotaId", "departmentId");

-- CreateIndex
CREATE INDEX "_documentTodepartment_B_index" ON "_documentTodepartment"("B");

-- CreateIndex
CREATE INDEX "_SessionTypeTodepartment_B_index" ON "_SessionTypeTodepartment"("B");

-- AddForeignKey
ALTER TABLE "department" ADD CONSTRAINT "department_workspaceGroupId_fkey" FOREIGN KEY ("workspaceGroupId") REFERENCES "workspace"("groupId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DepartmentMember" ADD CONSTRAINT "DepartmentMember_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "department"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DepartmentMember" ADD CONSTRAINT "DepartmentMember_workspaceGroupId_userId_fkey" FOREIGN KEY ("workspaceGroupId", "userId") REFERENCES "workspaceMember"("workspaceGroupId", "userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuotaDepartment" ADD CONSTRAINT "QuotaDepartment_quotaId_fkey" FOREIGN KEY ("quotaId") REFERENCES "Quota"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuotaDepartment" ADD CONSTRAINT "QuotaDepartment_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "department"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_documentTodepartment" ADD CONSTRAINT "_documentTodepartment_A_fkey" FOREIGN KEY ("A") REFERENCES "department"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_documentTodepartment" ADD CONSTRAINT "_documentTodepartment_B_fkey" FOREIGN KEY ("B") REFERENCES "document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_SessionTypeTodepartment" ADD CONSTRAINT "_SessionTypeTodepartment_A_fkey" FOREIGN KEY ("A") REFERENCES "SessionType"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_SessionTypeTodepartment" ADD CONSTRAINT "_SessionTypeTodepartment_B_fkey" FOREIGN KEY ("B") REFERENCES "department"("id") ON DELETE CASCADE ON UPDATE CASCADE;
