import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/utils/database";
import { withSessionRoute } from "@/lib/withSession";
import { withPermissionCheck } from "@/utils/permissionsManager";

async function editHandler(req: NextApiRequest, res: NextApiResponse) {
  const workspaceId = Number(req.query.id as string);
  const userId = String(req.query.uid as string);

  if (!workspaceId || !userId) {
    return res.status(400).json({ success: false, error: "Missing workspace ID or user ID" });
  }

  if (req.method === "PATCH") {
    try {
      const { departmentIds, lineManagerId, timezone, birthdayDay, birthdayMonth, discordId } = req.body;
      const existingMember = await prisma.workspaceMember.findUnique({
        where: {
          workspaceGroupId_userId: {
            workspaceGroupId: workspaceId,
            userId: BigInt(userId),
          },
        },
        include: {
          departmentMembers: {
            include: {
              department: true,
            },
          },
        },
      });

      if (existingMember) {
        await prisma.workspaceMember.update({
          where: {
            workspaceGroupId_userId: {
              workspaceGroupId: workspaceId,
              userId: BigInt(userId),
            },
          },
          data: {
            lineManagerId: lineManagerId ? BigInt(lineManagerId) : null,
            timezone,
            discordId,
          },
        });

        if (departmentIds !== undefined) {
          await prisma.departmentMember.deleteMany({
            where: {
              workspaceGroupId: workspaceId,
              userId: BigInt(userId),
            },
          });

          if (departmentIds.length > 0) {
            await prisma.departmentMember.createMany({
              data: departmentIds.map((departmentId: string) => ({
                departmentId,
                workspaceGroupId: workspaceId,
                userId: BigInt(userId),
              })),
            });
          }
        }
      } else {
        await prisma.workspaceMember.create({
          data: {
            workspaceGroupId: workspaceId,
            userId: BigInt(userId),
            lineManagerId: lineManagerId ? BigInt(lineManagerId) : null,
            timezone,
            discordId,
          },
        });

        if (departmentIds && departmentIds.length > 0) {
          await prisma.departmentMember.createMany({
            data: departmentIds.map((departmentId: string) => ({
              departmentId,
              workspaceGroupId: workspaceId,
              userId: BigInt(userId),
            })),
          });
        }
      }

      await prisma.user.update({
        where: {
          userid: BigInt(userId),
        },
        data: {
          birthdayDay: birthdayDay !== undefined ? birthdayDay : undefined,
          birthdayMonth: birthdayMonth !== undefined ? birthdayMonth : undefined,
        },
      });

      return res.status(200).json({ 
        success: true
      });
    } catch (e) {
      console.error("Update member info error:", e);
      return res.status(500).json({ success: false, error: "Internal server error" });
    }
  }

  return res.status(405).json({ success: false, error: "Method not allowed" });
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "PATCH") {
    return withPermissionCheck(editHandler, 'edit_member_details')(req, res);
  }
  return editHandler(req, res);
}

export default withSessionRoute(handler);
