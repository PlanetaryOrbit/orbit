import { NextApiRequest, NextApiResponse } from "next";
import { withSessionRoute } from "@/lib/withSession";
import prisma from "@/utils/database";

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "DELETE") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  const userId = req.session.userid;
  const groupId = parseInt(req.query.id as string);
  const postId = parseInt(req.query.postId as string);

  if (!userId || isNaN(groupId) || isNaN(postId)) {
    return res.status(400).json({ success: false, error: "Invalid request" });
  }

  const post = await prisma.wallPost.findUnique({ where: { id: postId } });

  if (!post || post.workspaceGroupId !== groupId) {
    return res.status(404).json({ success: false, error: "Post not found" });
  }

  const user = await prisma.user.findUnique({
    where: { userid: userId },
    include: {
      roles: { where: { workspaceGroupId: groupId } },
    },
  });
  const isOwner = post.authorId === BigInt(userId);
  const hasPermission = user?.roles[0]?.permissions.includes("manage_wall");
  const isInstanceOwner = user?.isOwner === true;

  if (!isOwner && !hasPermission && !isInstanceOwner) {
    return res.status(403).json({ success: false, error: "Not authorized" });
  }

  await prisma.wallPost.delete({ where: { id: postId } });
  console.log(`[Wall] Post ${postId} deleted by user ${userId} in workspace ${groupId}`);
  return res.status(200).json({ success: true });
}

export default withSessionRoute(handler);
