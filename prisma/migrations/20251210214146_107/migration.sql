-- AlterTable
ALTER TABLE "Quota" ADD COLUMN     "description" TEXT,
ADD COLUMN     "sessionType" TEXT;

-- AlterTable
ALTER TABLE "allyVisit" ADD COLUMN     "participants" BIGINT[];

-- AlterTable
ALTER TABLE "role" ADD COLUMN     "color" TEXT;

-- AlterTable
ALTER TABLE "workspaceMember" ADD COLUMN     "department" TEXT,
ADD COLUMN     "discordId" TEXT,
ADD COLUMN     "lineManagerId" BIGINT,
ADD COLUMN     "timezone" TEXT;

-- CreateIndex
CREATE INDEX "workspaceMember_lineManagerId_idx" ON "workspaceMember"("lineManagerId");

-- AddForeignKey
ALTER TABLE "workspaceMember" ADD CONSTRAINT "workspaceMember_lineManagerId_fkey" FOREIGN KEY ("lineManagerId") REFERENCES "user"("userid") ON DELETE NO ACTION ON UPDATE NO ACTION;
