import { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/utils/database";
import { withSessionRoute } from "@/lib/withSession";

export default withSessionRoute(async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const { day, month, targetUserId } = req.body;
  if (!req.session.userid) return res.status(401).json({ error: "Not logged in" });

  const isSelf = req.session.userid === Number(targetUserId);
  let canEdit = isSelf;

  if (!isSelf) {
	const currentUser = await prisma.user.findUnique({
	  where: { userid: BigInt(req.session.userid) },
	  include: {
		roles: {
		  select: { permissions: true }
		}
	  }
	});
	const hasPermission = currentUser?.roles?.some(role =>
	  role.permissions.includes("manage_activity")
	);
	if (hasPermission) {
	  canEdit = true;
	}
  }

  if (!canEdit) {
	return res.status(403).json({ error: "Not authorized" });
  }

  if (
	(day !== 0 && (typeof day !== "number" || day < 1 || day > 31)) ||
	(month !== 0 && (typeof month !== "number" || month < 1 || month > 12))
  ) {
	return res.status(400).json({ error: "Invalid day or month" });
  }

  await prisma.user.update({
	where: { userid: BigInt(targetUserId) },
	data: {
	  birthdayDay: day,
	  birthdayMonth: month,
	},
  });

  res.json({ success: true });
});