-- CreateTable
CREATE TABLE "WallPost" (
    "id" UUID NOT NULL,
    "content" TEXT NOT NULL,
    "authorId" BIGINT NOT NULL,
    "workspaceGroupId" INTEGER NOT NULL,
    "mediaId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "pinned" BOOLEAN NOT NULL DEFAULT false,
    "pinnedAt" TIMESTAMP(3),

    CONSTRAINT "WallPost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WallReaction" (
    "id" UUID NOT NULL,
    "postId" UUID NOT NULL,
    "userId" BIGINT NOT NULL,
    "emoji" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "workspaceGroupId" INTEGER,

    CONSTRAINT "WallReaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WallPost_workspaceGroupId_createdAt_idx" ON "WallPost"("workspaceGroupId", "createdAt");

-- CreateIndex
CREATE INDEX "WallPost_authorId_idx" ON "WallPost"("authorId");

-- CreateIndex
CREATE INDEX "WallPost_mediaId_idx" ON "WallPost"("mediaId");

-- CreateIndex
CREATE INDEX "WallReaction_postId_idx" ON "WallReaction"("postId");

-- CreateIndex
CREATE INDEX "WallReaction_userId_idx" ON "WallReaction"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "WallReaction_postId_userId_emoji_key" ON "WallReaction"("postId", "userId", "emoji");

-- AddForeignKey
ALTER TABLE "WallPost" ADD CONSTRAINT "WallPost_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "user"("userid") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WallPost" ADD CONSTRAINT "WallPost_workspaceGroupId_fkey" FOREIGN KEY ("workspaceGroupId") REFERENCES "workspace"("groupId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WallPost" ADD CONSTRAINT "WallPost_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "media"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WallReaction" ADD CONSTRAINT "WallReaction_postId_fkey" FOREIGN KEY ("postId") REFERENCES "WallPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WallReaction" ADD CONSTRAINT "WallReaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("userid") ON DELETE RESTRICT ON UPDATE CASCADE;
