// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/utils/database";
import { AuthenticatedRequest, withAuth } from "@/lib/withAuth";
type Data = {
  success: boolean;
  error?: string;
};

export default withAuth(handler);

export async function handler(req: AuthenticatedRequest, res: NextApiResponse<Data>) {
  if (req.method !== "DELETE")
    return res
      .status(405)
      .json({ success: false, error: "Method not allowed" });
  const { id, sid } = req.query;
  if (!id || !sid)
    return res
      .status(400)
      .json({ success: false, error: "Missing required fields" });
  const user = await prisma.user.findUnique({
    where: {
      userid: BigInt(req.auth.userId),
    },
    include: {
      roles: {
        where: {
          workspaceGroupId: parseInt(req.query.id as string),
        },
      },
      workspaceMemberships: {
        where: {
          workspaceGroupId: parseInt(req.query.id as string),
        },
      },
    },
  });

  const membership = user?.workspaceMemberships[0];
  const isAdmin = membership?.isAdmin || false;

  const session = await prisma.session.findFirst({
    where: {
      id: sid as string,
      ownerId: req.auth.userId,
    },
    include: {
      sessionType: {
        include: {
          hostingRoles: true,
        },
      },
    },
  });
  if (!session)
    return res.status(400).json({ success: false, error: "Invalid session" });
  if (
    !session?.sessionType.hostingRoles.find(
      (r) => r.id === user?.roles[0].id
    ) &&
    !isAdmin &&
    !user?.roles[0].permissions.includes("admin")
  )
    return res
      .status(403)
      .json({
        success: false,
        error: "You do not have permission to claim this session",
      });

  await prisma.session.update({
    where: {
      id: session.id,
    },
    data: {
      ended: new Date(),
    },
  });
  res.status(200).json({ success: true });
}
