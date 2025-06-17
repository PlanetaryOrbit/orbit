-- CreateTable
CREATE TABLE "apiKey" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "lastUsed" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "workspaceGroupId" INTEGER NOT NULL,
    "createdById" BIGINT NOT NULL,

    CONSTRAINT "apiKey_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "apiKey_key_key" ON "apiKey"("key");

-- AddForeignKey
ALTER TABLE "apiKey" ADD CONSTRAINT "apiKey_workspaceGroupId_fkey" FOREIGN KEY ("workspaceGroupId") REFERENCES "workspace"("groupId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "apiKey" ADD CONSTRAINT "apiKey_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "user"("userid") ON DELETE RESTRICT ON UPDATE CASCADE;
