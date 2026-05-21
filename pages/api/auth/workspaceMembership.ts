import { NextApiResponse } from "next";
import { AuthenticatedRequest, withAuth } from "@/lib/withAuth";
import prisma from "@/utils/database";

export default withAuth(handler);

export async function handler(
  req: AuthenticatedRequest, 
  res: NextApiResponse
) {
  if (req.method !== "GET")
    return res
      .status(405)
      .json({ success: false, error: "Method not allowed" });

  const workspaces = await prisma.workspace.findMany({
    where: {
      members: {
        some: {
          userId: req.auth.userId,
        },
      },
    },
  });

  res.status(200).json({ success: true, data: workspaces });
}
