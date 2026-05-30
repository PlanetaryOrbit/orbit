import { NextApiResponse } from "next"
import { AuthenticatedRequest, withAuth } from "@/lib/withAuth"
import { forceDeleteSession } from "@/utils/session"
import prisma from "@/utils/database"

export default withAuth(async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ success: false, error: 'Method not allowed' })
  }

  const { id } = req.query as { id: string }

  const session = await prisma.authSession.findUnique({
    where: { id },
  })

  if (!session) {
    return res.status(404).json({ success: false, error: 'Session not found' })
  }

  if (session.userId !== req.auth.userId) {
    return res.status(403).json({ success: false, error: 'Forbidden' })
  }

  if (session.id === req.auth.session?.id) {
    return res.status(400).json({ success: false, error: 'Cannot revoke your current session — use sign out instead' })
  }

  console.log(session)

  await forceDeleteSession(session.id)
  return res.status(200).json({ success: true })
})