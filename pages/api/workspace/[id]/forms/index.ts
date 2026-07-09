import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/utils/database";
type Data = {
  success: boolean;
  error?: string;
  forms?: unknown[];
};
import { withAuth, AuthenticatedRequest } from "@/lib/withAuth";
import { hasPerms } from "./helpers";

export default withAuth(handler);

// GET /api/workspace/[id]/forms - Returns a list of forms a specific user can see
// POST /api/workspace/[id]/forms - Create a new form
export async function handler(
  req: AuthenticatedRequest,
  res: NextApiResponse<Data>,
) {
  const user = await prisma.user.findUnique({
    where: {
      userid: req.auth.userId,
    },
    include: {
      roles: {
        select: {
          id: true,
          name: true,
          permissions: true,
        },
      },
      workspaceMemberships: {
        where: {
          workspaceGroupId: Number(req.query.id),
        },
        include: {
          workspace: true,
        },
      },
    },
  });

  if (!user) {
    return res.status(404).json({
      success: false,
      error: "User not found",
    });
  }

  if (req.method === "GET") {
    if (!hasPerms(user, "Form.View")) {
      return res.status(403).json({
        success: false,
        error: "Missing permission: Form.View",
      });
    }

    const forms = await prisma.form.findMany({
      where: {
        workspaceGroupId: workspaceId,
      },
    });

    return res.status(200).json({
      success: true,
      forms,
    });
  }

  return res.status(405).json({
    success: false,
    error: "Method Not Allowed"
  })
}
