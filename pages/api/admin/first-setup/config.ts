import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '@/lib/prisma'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const workspaceCount = await prisma.workspace.count()
  const userCount = await prisma.user.count()
  const isSetup = workspaceCount > 0 || userCount > 0

  res.setHeader('Set-Cookie', `app_setup=${isSetup}; Path=/; HttpOnly; SameSite=Strict`)

  return res.status(200).json({ workspaceCount, userCount })
}