import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/utils/database";
import { withKey } from "@/lib/withAuth";

export default withKey(handler);

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET")
    return res
      .status(405)
      .json({ success: false, error: "Method not allowed" });

  const workspaceId = Number.parseInt(req.query.id as string);
  if (!workspaceId)
    return res
      .status(400)
      .json({ success: false, error: "Missing workspace ID" });

  const { endDate, category, startDate, status, limit, page, hideClaimed } =
    req.query;
  const start = startDate 
    ? new Date(startDate as string) 
    : (() => {
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        return now;
      })();

  const end = endDate
    ? new Date(endDate as string)
    : (() => {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(23, 59, 59, 999);
        return tomorrow;
      })();

  if (isNaN(start.getTime()) || isNaN(end.getTime()))
    return res
      .status(400)
      .json({ success: false, error: "Invalid date format" });

  if (start >= end)
    return res
      .status(400)
      .json({ success: false, error: "startDate must be before endDate" });

  const take = Math.min(Number(limit) || 50, 100);
  const skip = (Math.max(Number(page) || 1, 1) - 1) * take;

  try {
    const where: any = {
      sessionType: { workspaceGroupId: workspaceId },
      date: { gte: start, lte: end },
    };

    if (category) where.type = category as string;

    if (hideClaimed === "true") {
      where.users = { none: {} };
    }

    if (status) {
      switch (status) {
        case "scheduled":
          where.ended = false;
          where.startedAt = null;
          where.date = { ...where.date, gte: new Date() };
          break;
        case "in-progress":
          where.ended = false;
          where.startedAt = { not: null };
          break;
        case "ended":
          where.ended = true;
          break;
        case "missed":
          where.ended = false;
          where.startedAt = null;
          where.date = { ...where.date, lte: new Date() };
          break;
        default:
          return res
            .status(400)
            .json({
              success: false,
              error: `Invalid status filter: ${status}`,
            });
      }
    }

    const [sessions, total] = await Promise.all([
      prisma.session.findMany({
        where,
        include: {
          owner: { select: { userid: true, username: true, picture: true } },
          sessionType: {
            select: {
              id: true,
              name: true,
              description: true,
              gameId: true,
              slots: true,
            },
          },
          users: {
            include: {
              user: { select: { userid: true, username: true, picture: true } },
            },
          },
          notes: true,
        },
        orderBy: { date: "asc" },
        take,
        skip,
      }),
      prisma.session.count({ where }),
    ]);

    const formattedSessions = sessions.map((session) => ({
      id: session.id,
      name: session.name,
      date: session.date,
      startedAt: session.startedAt,
      ended: session.ended,
      cancelled: session.cancelled,
      cancellationReason: session.cancellationReason,
      type: {
        id: session.sessionType.id,
        name: session.sessionType.name,
        description: session.sessionType.description,
        category: session.type,
        gameId: session.sessionType.gameId
          ? Number(session.sessionType.gameId)
          : null,
        slots: session.sessionType.slots,
      },
      host: session.owner
        ? {
            userId: Number(session.owner.userid),
            username: session.owner.username,
            thumbnail: session.owner.picture,
          }
        : null,
      participants: session.users.map((u) => ({
        userId: Number(u.user.userid),
        username: u.user.username,
        thumbnail: u.user.picture,
        slot: u.slot,
        role: u.roleID,
      })),
      status: session.ended
        ? "ended"
        : session.startedAt
          ? "in-progress"
          : session.date < new Date()
            ? "missed"
            : "scheduled",
      notes: session.notes.map((note) => ({
        id: note.id,
        authorId: note.authorId,
        content: note.content,
        createdAt: note.createdAt,
        updatedAt: note.updatedAt,
      })),
    }));

    const sessionsByDate = formattedSessions.reduce<
      Record<string, typeof formattedSessions>
    >((acc, session) => {
      const key = session.date.toISOString().split("T")[0];
      (acc[key] ??= []).push(session);
      return acc;
    }, {});

    return res.status(200).json({
      success: true,
      sessions: formattedSessions,
      sessionsByDate,
      dateRange: { startDate: start.toISOString(), endDate: end.toISOString() },
      pagination: {
        total,
        page: Math.max(Number(page) || 1, 1),
        pageSize: take,
        totalPages: Math.ceil(total / take),
      },
    });
  } catch (error) {
    console.error("Error fetching sessions:", error);
    return res
      .status(500)
      .json({ success: false, error: "Internal server error" });
  }
}