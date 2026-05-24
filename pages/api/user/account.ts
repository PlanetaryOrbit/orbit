import type { NextApiResponse } from 'next'
import prisma from '@/utils/database'
import { AuthenticatedRequest, withAuth } from '@/lib/withAuth'

export async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  if (req.method !== 'DELETE') return res.status(405).json({ success: false, error: 'Method not allowed' })
  if (!req.auth.userId) return res.status(401).json({ success: false, error: 'Not authenticated' })

  const userId = req.auth.userId

  try {
    await prisma.$transaction(async (tx) => {
      await tx.discordUser.deleteMany({ where: { robloxUserId: userId } })
      await tx.googleUser.deleteMany({ where: { robloxUserId: userId } })

      await tx.authSession.deleteMany({ where: { userId } })
      await tx.userInfo.deleteMany({ where: { userid: userId } })

      await tx.activitySession.deleteMany({ where: { userId } })
      await tx.activityHistory.deleteMany({ where: { userId } })
      await tx.activityAdjustment.deleteMany({ where: { userId } })
      await tx.activityAdjustment.deleteMany({ where: { actorId: userId } })
      await tx.activityReset.deleteMany({ where: { resetById: userId } })

      await tx.inactivityNotice.deleteMany({ where: { userId } })
      await tx.staffResignation.deleteMany({ where: { userId } })
      await tx.staffResignation.deleteMany({ where: { reviewerId: userId } })
      await tx.userBook.deleteMany({ where: { userId } })
      await tx.userBook.deleteMany({ where: { adminId: userId } })
      await tx.rank.deleteMany({ where: { userId } })
      await tx.roleMember.deleteMany({ where: { userId } })
      await tx.quotaUser.deleteMany({ where: { userId } })
      await tx.quotaCustomCompletion.deleteMany({ where: { userId } })
      await tx.quotaCustomCompletion.deleteMany({ where: { reviewedByUserId: userId } })
      await tx.departmentMember.deleteMany({ where: { userId } })

      await tx.sessionNote.deleteMany({ where: { authorId: userId } })
      await tx.sessionLog.deleteMany({ where: { actorId: userId } })
      await tx.sessionLog.deleteMany({ where: { targetId: userId } })
      await tx.sessionUser.deleteMany({ where: { userid: userId } })

      await tx.wallPost.deleteMany({ where: { authorId: userId } })
      await tx.policyAcknowledgment.deleteMany({ where: { userId } })
      await tx.policyShareableLink.deleteMany({ where: { createdById: userId } })
      await tx.document.deleteMany({ where: { ownerId: userId } })
      await tx.allyVisit.deleteMany({ where: { hostId: userId } })
      await tx.apiKey.deleteMany({ where: { createdById: userId } })

      await tx.workspaceMember.deleteMany({ where: { userId } })

      await tx.user.delete({ where: { userid: userId } })
    })

    res.setHeader('Set-Cookie', [
      'session_token=',
      'Path=/',
      'HttpOnly',
      'SameSite=Strict',
      'Secure',
      'Max-Age=0',
    ].join('; '))

    return res.status(200).json({ success: true })
  } catch (err) {
    console.error('Account deletion error:', err)
    return res.status(500).json({ success: false, error: 'Internal server error' })
  }
}

export default withAuth(handler)