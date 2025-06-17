import prisma from "@/utils/database"

export async function validateApiKey(apiKey: string, workspaceId: string) {
  if (!apiKey || !apiKey.startsWith("orbit_")) {
    return null
  }

  const key = await prisma.apiKey.findUnique({
    where: {
      key: apiKey,
    },
  })

  if (!key) {
    return null
  }

  // Check if key is expired
  if (key.expiresAt && new Date(key.expiresAt) < new Date()) {
    return null
  }

  // Update last used timestamp
  await prisma.apiKey.update({
    where: { id: key.id },
    data: { lastUsed: new Date() },
  })

  return key
}
