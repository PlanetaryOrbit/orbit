import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/utils/database";
import { withAuth } from "@/lib/withAuth";

export default withAuth(handler);

async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {

  const workspaceId = Number.parseInt(req.query.id as string);
  const sessionId = req.query.sid as string;

  if (!workspaceId)
    return res
      .status(400)
      .json({ success: false, error: "Missing workspace ID" });
  if (!sessionId)
    return res
      .status(400)
      .json({ success: false, error: "Missing session ID" });

  try {
    const session = await prisma.session.findFirst({
      where: {
        id: sessionId,
        sessionType: {
          workspaceGroupId: workspaceId,
        },
      },
      include: {
        sessionType: true,
      },
    });

    if (!session) {
      return res
        .status(404)
        .json({ success: false, error: "Session not found" });
    }

    if (req.method === "GET") {
      const sessionWithDetails = await prisma.session.findUnique({
        where: { id: sessionId },
        include: {
          owner: {
            select: {
              userid: true,
              username: true,
              picture: true,
            },
          },
          notes: true,
          sessionType: {
            select: {
              id: true,
              name: true,
              gameId: true,
              slots: true,
            },
          },
          users: {
            include: {
              user: {
                select: {
                  userid: true,
                  username: true,
                  picture: true,
                },
              },
            },
          },
        },
      });

      const formattedSession = {
        id: sessionWithDetails!.id,
        date: sessionWithDetails!.date,
        startedAt: sessionWithDetails!.startedAt,
        ended: sessionWithDetails!.ended,
        cancelled: sessionWithDetails!.cancelled,
        cancellationReason: sessionWithDetails!.cancellationReason,
        type: {
          id: sessionWithDetails!.sessionType.id,
          name: sessionWithDetails!.sessionType.name,
          gameId: sessionWithDetails!.sessionType.gameId
            ? Number(sessionWithDetails!.sessionType.gameId)
            : null,
          slots: sessionWithDetails!.sessionType.slots,
        },
        host: sessionWithDetails!.owner
          ? {
              userId: Number(sessionWithDetails!.owner.userid),
              username: sessionWithDetails!.owner.username,
              thumbnail: sessionWithDetails!.owner.picture,
            }
          : null,
        participants: sessionWithDetails!.users.map((user) => ({
          userId: Number(user.user.userid),
          username: user.user.username,
          thumbnail: user.user.picture,
          slot: user.slot,
          role: user.roleID,
        })),
        status: sessionWithDetails!.ended
          ? "ended"
          : sessionWithDetails!.startedAt
          ? "in-progress"
          : sessionWithDetails!.date < new Date()
          ? "missed"
          : "scheduled",
        notes: sessionWithDetails!.notes.map((note) => ({
          id: note.id,
          authorId: note.authorId,
          content: note.content,
          createdAt: note.createdAt,
          updatedAt: note.updatedAt,
        })),
      };

      return res.status(200).json({
        success: true,
        session: formattedSession,
      });
    } else if (req.method === "PUT") {
      const { date, hostUserId, participants } = req.body;

      if (!date && hostUserId === undefined && !participants) {
        return res
          .status(400)
          .json({ success: false, error: "No update data provided" });
      }

      const updateData: any = {};

      if (date) {
        updateData.date = new Date(date);
      }

      if (hostUserId !== undefined) {
        if (hostUserId === null) {
          updateData.ownerId = null;
        } else {
          const workspaceMember = await prisma.workspaceMember.findFirst({
            where: {
              workspaceGroupId: workspaceId,
              userId: BigInt(hostUserId),
            },
          });

          if (!workspaceMember) {
            return res
              .status(400)
              .json({ success: false, error: "Host not found in workspace" });
          }

          updateData.ownerId = BigInt(hostUserId);
        }
      }

      await prisma.session.update({
        where: { id: sessionId },
        data: updateData,
      });

      if (participants && Array.isArray(participants)) {
        await prisma.sessionUser.deleteMany({
          where: { sessionid: sessionId },
        });

        for (const participant of participants) {
          const { userId, roleId, slot } = participant;

          if (!userId || !roleId || slot === undefined) {
            continue;
          }

          const workspaceMember = await prisma.workspaceMember.findFirst({
            where: {
              workspaceGroupId: workspaceId,
              userId: BigInt(userId),
            },
          });

          if (!workspaceMember) {
            continue;
          }

          await prisma.sessionUser.create({
            data: {
              userid: BigInt(userId),
              sessionid: sessionId,
              roleID: roleId,
              slot: parseInt(slot),
            },
          });
        }
      }

      const updatedSession = await prisma.session.findUnique({
        where: { id: sessionId },
        include: {
          owner: {
            select: {
              userid: true,
              username: true,
              picture: true,
            },
          },
          sessionType: {
            select: {
              id: true,
              name: true,
              gameId: true,
              slots: true,
            },
          },
          users: {
            include: {
              user: {
                select: {
                  userid: true,
                  username: true,
                  picture: true,
                },
              },
            },
          },
        },
      });

      const formattedSession = {
        id: updatedSession!.id,
        date: updatedSession!.date,
        startedAt: updatedSession!.startedAt,
        ended: updatedSession!.ended,
        type: {
          id: updatedSession!.sessionType.id,
          name: updatedSession!.sessionType.name,
          gameId: updatedSession!.sessionType.gameId
            ? Number(updatedSession!.sessionType.gameId)
            : null,
          slots: updatedSession!.sessionType.slots,
        },
        host: updatedSession!.owner
          ? {
              userId: Number(updatedSession!.owner.userid),
              username: updatedSession!.owner.username,
              thumbnail: updatedSession!.owner.picture,
            }
          : null,
        participants: updatedSession!.users.map((user) => ({
          userId: Number(user.user.userid),
          username: user.user.username,
          thumbnail: user.user.picture,
          slot: user.slot,
          role: user.roleID,
        })),
        status: updatedSession!.ended
          ? "ended"
          : updatedSession!.startedAt
          ? "in-progress"
          : updatedSession!.date < new Date()
          ? "missed"
          : "scheduled",
      };

      return res.status(200).json({
        success: true,
        session: formattedSession,
      });
    } else if (req.method === "DELETE") {
      await prisma.sessionUser.deleteMany({
        where: { sessionid: sessionId },
      });

      await prisma.session.delete({
        where: { id: sessionId },
      });

      return res.status(200).json({
        success: true,
        message: "Session deleted successfully",
      });
    } else {
      return res
        .status(405)
        .json({ success: false, error: "Method not allowed" });
    }
  } catch (error) {
    console.error("Error in public API:", error);
    return res
      .status(500)
      .json({ success: false, error: "Internal server error" });
  }
}
