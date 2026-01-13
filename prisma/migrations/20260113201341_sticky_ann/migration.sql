-- CreateTable
CREATE TABLE "StickyAnnouncement" (
    "id" SERIAL NOT NULL,
    "workspaceGroupId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "subtitle" TEXT,
    "sections" JSONB NOT NULL,
    "editorId" BIGINT,
    "editorUsername" TEXT,
    "editorPicture" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StickyAnnouncement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StickyAnnouncement_workspaceGroupId_key" ON "StickyAnnouncement"("workspaceGroupId");

-- AddForeignKey
ALTER TABLE "StickyAnnouncement" ADD CONSTRAINT "StickyAnnouncement_workspaceGroupId_fkey" FOREIGN KEY ("workspaceGroupId") REFERENCES "workspace"("groupId") ON DELETE RESTRICT ON UPDATE CASCADE;
