import type { NextApiRequest, NextApiResponse } from "next";
import { withSessionRoute } from "@/lib/withSession";
import prisma from "@/utils/database";
import * as noblox from "noblox.js";
import { getRobloxThumbnail, getRobloxDisplayName } from "@/utils/roblox";

export default withSessionRoute(async (req: NextApiRequest, res: NextApiResponse) => {
	if (req.method !== "POST") return res.status(405).json({ success: false, error: "Method not allowed" });
	if (req.session.userid) return res.status(400).json({ success: false, error: "Already logged in" });

	const { username } = req.body;
	if (!username) return res.status(400).json({ success: false, error: "Missing username" });

	const userid = await noblox.getIdFromUsername(username).catch(() => null) as number | undefined;
	if (!userid) return res.status(404).json({ success: false, error: "Username not found" });

	const existingUser = await prisma.user.findUnique({
		where: { userid: BigInt(userid) },
		select: { registered: true, info: { select: { passwordhash: true } } },
	});
	if (existingUser?.registered || existingUser?.info?.passwordhash) {
		return res.status(400).json({
			success: false,
			error: "This account is already registered. Please use the login form instead.",
		});
	}

	const [thumbnail, displayName] = await Promise.all([
		getRobloxThumbnail(userid).catch(() => ""),
		getRobloxDisplayName(userid).catch(() => username),
	]);

	res.status(200).json({
		success: true,
		thumbnail: thumbnail || undefined,
		displayName: displayName || username,
	});
});
