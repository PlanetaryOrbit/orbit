import type { NextApiRequest, NextApiResponse } from "next";
import { withSessionRoute } from "@/lib/withSession";
import prisma from "@/utils/database";
import bcryptjs from "bcryptjs";
import * as noblox from "noblox.js";

export default withSessionRoute(async (req: NextApiRequest, res: NextApiResponse) => {
	if (req.method !== "POST") return res.status(405).json({ success: false, error: "Method not allowed" });

	const { username } = req.body;
	if (!username) return res.status(400).json({ success: false, error: "Missing username" });

	const existingUser = await prisma.user.findFirst({ where: { username } });
	if (!existingUser) return res.status(400).json({ success: false, error: "User is not registered" });

	const authid = await noblox.getIdFromUsername(username).catch(() => null) as number | undefined;
	if (!authid) return res.status(404).json({ success: false, error: "Roblox user not found" });

	const array = ["📋", "🎉", "🎂", "📆", "✔️", "📃", "👍", "➕", "📢", "🐒", "🐴", "🐑", "🐘", "🐼", "🐧", "🐦", "🐤", "🐥", "🐣", "🐔", "🐍", "🐢", "🐛", "🐝", "🐜"];
	const verificationCode = `🤖${Array.from({ length: 11 }, () => array[Math.floor(Math.random() * array.length)]).join("")}`;

	req.session.verification = {
		userid: authid,
		verificationCode,
		isReset: true as boolean,
	};
	await req.session.save();
	res.status(200).json({ success: true, code: verificationCode });
});
