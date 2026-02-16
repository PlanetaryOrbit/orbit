import prisma from "@/utils/database"

export async function validateApiKey(apiKey: string, workspaceId: string | number) {
  if (!apiKey || !apiKey.startsWith("orbit_")) return null

  const key = await prisma.apiKey.findUnique({ where: { key: apiKey } })
  if (!key) return null

  if (key.expiresAt && new Date(key.expiresAt) < new Date()) return null

  const numericWorkspaceId = typeof workspaceId === 'string' ? parseInt(workspaceId, 10) : workspaceId
  if (!numericWorkspaceId || key.workspaceGroupId !== numericWorkspaceId) return null

  prisma.apiKey.update({
    where: { id: key.id },
    data: { lastUsed: new Date() }
  }).catch(() => {})

  return key
}
