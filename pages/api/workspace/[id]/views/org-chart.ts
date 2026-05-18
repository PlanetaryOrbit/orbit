import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/utils/database";
import { withPermissionCheck } from "@/utils/permissionsManager";
import { getThumbnail } from "@/utils/userinfoEngine";
import noblox from "noblox.js";

type OrgNode = {
  userId: string;
  username: string | null;
  picture: string;
  rankName: string;
};

type OrgEdge = { subordinateId: string; managerId: string };

export default withPermissionCheck(
  async (req: NextApiRequest, res: NextApiResponse) => {
    if (req.method !== "GET") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const workspaceGroupId = parseInt(req.query.id as string);

    try {
      const members = await prisma.workspaceMember.findMany({
        where: { workspaceGroupId },
        select: {
          userId: true,
          lineManagerId: true,
          user: {
            select: {
              userid: true,
              username: true,
              ranks: {
                where: { workspaceGroupId },
                select: { rankId: true },
              },
              roles: {
                where: { workspaceGroupId },
                select: { id: true },
              },
            },
          },
        },
      });

      const withRole = members.filter((m) => m.user.roles.length > 0);
      const uidNum = (id: bigint) => Number(id);

      const managerOf = new Set<number>();
      for (const m of withRole) {
        if (m.lineManagerId != null) {
          managerOf.add(uidNum(m.lineManagerId));
        }
      }

      const inChain = withRole.filter((m) => {
        const id = uidNum(m.userId);
        const reportsToSomeone = m.lineManagerId != null;
        const someoneReportsToThem = managerOf.has(id);
        return reportsToSomeone || someoneReportsToThem;
      });

      const idSet = new Set(inChain.map((m) => uidNum(m.userId)));

      const edges: OrgEdge[] = [];
      for (const m of inChain) {
        if (m.lineManagerId == null) continue;
        const sub = uidNum(m.userId);
        const mgr = uidNum(m.lineManagerId);
        if (idSet.has(mgr)) {
          edges.push({
            subordinateId: String(sub),
            managerId: String(mgr),
          });
        }
      }

      const robloxRoles = await noblox.getRoles(workspaceGroupId).catch(() => []);
      const roleIdToInfoMap = new Map<number, { rank: number; name: string }>();
      robloxRoles.forEach((role: { id: number; rank: number; name: string }) => {
        roleIdToInfoMap.set(role.id, { rank: role.rank, name: role.name });
      });

      const rankNameForUser = (user: (typeof inChain)[0]["user"]) => {
        if (!user.ranks[0]?.rankId) return "Guest";
        const storedValue = Number(user.ranks[0].rankId);
        if (storedValue > 255) {
          return roleIdToInfoMap.get(storedValue)?.name || "Guest";
        }
        const role = robloxRoles.find((r: { rank: number }) => r.rank === storedValue);
        return role?.name || "Guest";
      };

      const nodes: OrgNode[] = inChain.map((m) => ({
        userId: m.userId.toString(),
        username: m.user.username,
        picture: getThumbnail(m.user.userid),
        rankName: rankNameForUser(m.user),
      }));

      return res.status(200).json({ nodes, edges });
    } catch (error) {
      console.error("Error building org chart:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  },
  "view_members"
);
