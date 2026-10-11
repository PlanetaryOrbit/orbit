import prisma from '@/utils/database';
import { withPermissionCheck } from '@/utils/permissionsManager';
import type { NextApiRequest, NextApiResponse } from 'next';

export default withPermissionCheck(async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const workspaceGroupId = Number(req.query.id);
  const userId = (req as any).auth?.userId;

  if (!Number.isSafeInteger(workspaceGroupId) || workspaceGroupId <= 0) {
    return res.status(400).json({ success: false, error: 'Invalid workspace ID' });
  }

  if (!userId) {
    return res.status(401).json({ success: false, error: 'Not logged in' });
  }

  try {
    const requester = await prisma.user.findFirst({
      where: { userid: BigInt(userId) },
      select: {
        roles: {
          where: { workspaceGroupId },
          select: { permissions: true },
        },
        workspaceMemberships: {
          where: { workspaceGroupId },
          select: { isAdmin: true },
        },
      },
    });

    const isAdmin = requester?.workspaceMemberships.some((membership) => membership.isAdmin);
    const canManageQuotas =
      isAdmin ||
      requester?.roles.some((role) =>
        role.permissions.some((permission) =>
          ['create_quotas', 'delete_quotas'].includes(permission),
        ),
      );

    if (!canManageQuotas) {
      return res.status(403).json({ success: false, error: 'Missing quota-management permission' });
    }

    const now = new Date();

    const [lastReset, activityConfig, quotas, users, activeLoas] = await Promise.all([
      prisma.activityReset.findFirst({
        where: { workspaceGroupId },
        orderBy: { resetAt: 'desc' },
        select: { resetAt: true },
      }),
      prisma.config.findFirst({
        where: { workspaceGroupId, key: 'activity' },
        select: { value: true },
      }),
      prisma.quota.findMany({
        where: { workspaceGroupId },
        include: {
          quotaRoles: { select: { roleId: true } },
          quotaDepartments: { select: { departmentId: true } },
          quotaUsers: { select: { userId: true } },
        },
      }),
      prisma.user.findMany({
        where: {
          workspaceMemberships: {
            some: { workspaceGroupId },
          },
        },
        select: {
          userid: true,
          username: true,
          picture: true,
          roles: {
            where: { workspaceGroupId },
            select: { id: true },
          },
          workspaceMemberships: {
            where: { workspaceGroupId },
            select: {
              departmentMembers: {
                select: { departmentId: true },
              },
            },
          },
        },
        orderBy: { username: 'asc' },
      }),
      prisma.inactivityNotice.findMany({
        where: {
          workspaceGroupId,
          approved: true,
          reviewed: true,
          revoked: { not: true },
          startTime: { lte: now },
          endTime: { gt: now },
        },
        select: { userId: true },
      }),
    ]);

    const startDate = lastReset?.resetAt ?? new Date('2025-01-01T00:00:00Z');
    const userIds = users.map((user) => user.userid);
    const customQuotaIds = quotas
      .filter((quota) => quota.type === 'custom')
      .map((quota) => quota.id);

    const [
      activitySessions,
      adjustments,
      ownedSessions,
      participations,
      allianceVisits,
      customCompletions,
    ] = await Promise.all([
      prisma.activitySession.findMany({
        where: {
          workspaceGroupId,
          userId: { in: userIds },
          startTime: { gte: startDate, lte: now },
          archived: { not: true },
        },
        select: {
          userId: true,
          startTime: true,
          endTime: true,
          idleTime: true,
        },
      }),
      prisma.activityAdjustment.findMany({
        where: {
          workspaceGroupId,
          userId: { in: userIds },
          createdAt: { gte: startDate, lte: now },
          archived: { not: true },
        },
        select: { userId: true, minutes: true },
      }),
      prisma.session.findMany({
        where: {
          ownerId: { in: userIds },
          sessionType: { workspaceGroupId },
          date: { gte: startDate, lte: now },
          archived: { not: true },
          cancelled: { not: true },
        },
        select: { id: true, ownerId: true, type: true },
      }),
      prisma.sessionUser.findMany({
        where: {
          userid: { in: userIds },
          archived: { not: true },
          session: {
            sessionType: { workspaceGroupId },
            date: { gte: startDate, lte: now },
            archived: { not: true },
            cancelled: { not: true },
          },
        },
        select: {
          userid: true,
          roleID: true,
          slot: true,
          session: {
            select: {
              id: true,
              ownerId: true,
              type: true,
              sessionType: { select: { slots: true } },
            },
          },
        },
      }),
      prisma.allyVisit.findMany({
        where: {
          ally: { workspaceGroupId },
          time: { gte: startDate, lte: now },
        },
        select: { hostId: true, participants: true },
      }),
      customQuotaIds.length
        ? (prisma as any).quotaCustomCompletion.findMany({
            where: {
              quotaId: { in: customQuotaIds },
              userId: { in: userIds },
            },
            select: { userId: true, quotaId: true, status: true },
          })
        : Promise.resolve([]),
    ]);

    let idleTimeEnabled = true;
    if (activityConfig?.value) {
      let value: any = activityConfig.value;
      if (typeof value === 'string') {
        try {
          value = JSON.parse(value);
        } catch {
          value = {};
        }
      }
      if (typeof value === 'object' && value !== null) {
        idleTimeEnabled = value.idleTimeEnabled ?? true;
      }
    }

    const loaIds = new Set(activeLoas.map((loa) => String(loa.userId)));
    const completionByUserQuota = new Map<string, string>();
    for (const completion of customCompletions) {
      completionByUserQuota.set(`${completion.userId}:${completion.quotaId}`, completion.status);
    }

    const members = users.map((user) => {
      const uid = String(user.userid);
      const roleIds = new Set(user.roles.map((role) => role.id));
      const departmentIds = new Set(
        user.workspaceMemberships.flatMap((membership) =>
          membership.departmentMembers.map((department) => department.departmentId),
        ),
      );

      const assignedQuotas = quotas.filter(
        (quota) =>
          quota.quotaUsers.some((assignment) => String(assignment.userId) === uid) ||
          quota.quotaRoles.some((assignment) => roleIds.has(assignment.roleId)) ||
          quota.quotaDepartments.some((assignment) => departmentIds.has(assignment.departmentId)),
      );

      let minutes = 0;
      for (const session of activitySessions) {
        if (String(session.userId) !== uid || !session.endTime) continue;

        const duration = Math.max(
          0,
          Math.round((session.endTime.getTime() - session.startTime.getTime()) / 60000),
        );
        const idle = Number(session.idleTime ?? 0);
        minutes += idleTimeEnabled ? Math.max(0, duration - idle) : duration;
      }

      for (const adjustment of adjustments) {
        if (String(adjustment.userId) === uid) minutes += adjustment.minutes;
      }

      const owned = ownedSessions.filter((session) => String(session.ownerId) === uid);
      const ownedIds = new Set(owned.map((session) => session.id));

      const hostedByType: Record<string, number> = {};
      const attendedByType: Record<string, number> = {};
      const loggedByType: Record<string, number> = {};

      const increment = (target: Record<string, number>, type: string) => {
        target[type] = (target[type] ?? 0) + 1;
      };

      for (const session of owned) {
        increment(hostedByType, session.type || 'other');
        increment(loggedByType, session.type || 'other');
      }

      const loggedIds = new Set(owned.map((session) => session.id));
      let coHosted = 0;
      let attended = 0;

      for (const participation of participations) {
        if (String(participation.userid) !== uid) continue;

        const session = participation.session;
        const slots = session.sessionType.slots as any[];
        const slotName = slots?.[participation.slot]?.name ?? '';
        const isCoHost =
          participation.roleID.toLowerCase().includes('co-host') ||
          slotName.toLowerCase().includes('co-host');

        const type = session.type || 'other';

        if (isCoHost) {
          coHosted++;
          increment(hostedByType, type);
        } else if (!ownedIds.has(session.id)) {
          attended++;
          increment(attendedByType, type);
        }

        if (!loggedIds.has(session.id)) {
          loggedIds.add(session.id);
          increment(loggedByType, type);
        }
      }

      const visits = allianceVisits.filter(
        (visit) =>
          String(visit.hostId) === uid ||
          visit.participants.some((participant) => String(participant) === uid),
      ).length;

      const progress = assignedQuotas.map((quota) => {
        if (quota.type === 'custom') {
          const customStatus = completionByUserQuota.get(`${uid}:${quota.id}`);
          const complete = customStatus === 'approved';

          return {
            id: quota.id,
            name: quota.name,
            type: quota.type,
            current: complete ? 1 : 0,
            goal: 1,
            percentage: complete ? 100 : 0,
            complete,
            customStatus: customStatus ?? 'not_submitted',
          };
        }

        let current = 0;
        switch (quota.type) {
          case 'mins':
            current = minutes;
            break;
          case 'sessions_hosted':
            current =
              quota.sessionType && quota.sessionType !== 'all'
                ? (hostedByType[quota.sessionType] ?? 0)
                : owned.length + coHosted;
            break;
          case 'sessions_attended':
            current =
              quota.sessionType && quota.sessionType !== 'all'
                ? (attendedByType[quota.sessionType] ?? 0)
                : attended;
            break;
          case 'sessions_logged':
            current =
              quota.sessionType && quota.sessionType !== 'all'
                ? (loggedByType[quota.sessionType] ?? 0)
                : loggedIds.size;
            break;
          case 'alliance_visits':
            current = visits;
            break;
        }

        const goal = Math.max(0, quota.value ?? 0);
        const percentage = goal > 0 ? (current / goal) * 100 : 0;

        return {
          id: quota.id,
          name: quota.name,
          type: quota.type,
          current,
          goal,
          percentage,
          complete: goal > 0 && current >= goal,
          customStatus: null,
        };
      });

      const completedCount = progress.filter((quota) => quota.complete).length;
      const completionStatus =
        progress.length === 0
          ? 'no_quotas'
          : completedCount === progress.length
            ? 'complete'
            : 'incomplete';

      return {
        userId: uid,
        username: user.username ?? `User ${uid}`,
        picture: user.picture,
        onLoa: loaIds.has(uid),
        quotaCount: progress.length,
        completedCount,
        completionStatus,
        quotas: progress,
      };
    });

    return res.status(200).json({
      success: true,
      periodStart: startDate.toISOString(),
      members,
    });
  } catch (error) {
    console.error('Failed to load quota review:', error);
    return res.status(500).json({ success: false, error: 'Could not load quota review' });
  }
});
