-- DropIndex
DROP INDEX "AuditLog_createdAt_idx";

-- CreateIndex
CREATE INDEX "AuditLog_workspaceGroupId_createdAt_idx" ON "AuditLog"("workspaceGroupId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "AuditLog_workspaceGroupId_action_createdAt_idx" ON "AuditLog"("workspaceGroupId", "action", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "AuditLog_workspaceGroupId_userId_createdAt_idx" ON "AuditLog"("workspaceGroupId", "userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "AuditLog_workspaceGroupId_entity_createdAt_idx" ON "AuditLog"("workspaceGroupId", "entity", "createdAt" DESC);
