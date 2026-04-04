// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/utils/database";
import { withSessionRoute } from "@/lib/withSession";
import * as noblox from "noblox.js";
import { getUsername, getThumbnail } from "@/utils/userinfoEngine";
import { checkSpecificUser } from "@/utils/permissionsManager";
import { generateSessionTimeMessage } from "@/utils/sessionMessage";

(BigInt.prototype as any).toJSON = function () {
	return this.toString();
};

type Data = {
	success: boolean;
	error?: string;
	data?: any,
};

export default withSessionRoute(handler);

export async function handler(req: NextApiRequest, res: NextApiResponse<Data>) {
	if (req.method != "POST" && req.method != "GET") {
		return res
			.status(405)
			.json({ success: false, error: "Method not allowed" });
	}
	const { authorization } = req.headers;
	let config;
	let groupId;
	try {
		if (authorization) {
			config = await prisma.config.findFirst({
				where: {
					value: {
						path: ["key"],
						equals: authorization,
					},
				},
			});

			if (!config) {
				return res.status(401).json({ success: false, error: "Invalid authorization key" });
			}


		}
	} catch (err) {
		console.error("Unexpected error in /api/activity:", err);
		return res
			.status(500)
			.json({ success: false, error: "Internal server error" });
	}

	if (req.method == "POST") {
		const { userid, placeid, idleTime, messages } = req.body;
		const { type } = req.query;

		if (!userid || isNaN(userid))
			return res
				.status(400)
				.json({ success: false, error: "Invalid or missing userid" });
		if (!type || typeof type !== "string")
			return res
				.status(400)
				.json({ success: false, error: "Missing query type (create or end)" });

		try {
			if (req.session?.userId) {
				const workspaceId = req.body.workspaceId;

				if (!workspaceId) {
					return res.status(400).json({ success: false, error: "Workspace ID required for session-based auth" });
				}

				config = await prisma.config.findFirst({
					where: {
						workspaceGroupId: Number(workspaceId),
					},
				});

				if (!config) {
					return res.status(404).json({ success: false, error: "Workspace not found" });
				}
				groupId = config.workspaceGroupId;
			} else if (config) {
				groupId = config.workspaceGroupId;
			} else {
				console.log("error falls here")
				return res.status(401).json({ success: false, error: "Authorization required" });
			}

			const parsedConfig = JSON.parse(JSON.stringify(config.value));

			const userRank = await noblox
				.getRankInGroup(groupId, userid)
				.catch(() => null);

			if (parsedConfig.role && (!userRank || userRank <= parsedConfig.role)) {
				return res
					.status(200)
					.json({ success: true, error: "User is not the right rank" });
			}

			const username = await getUsername(userid);
			const picture = await getThumbnail(userid);

			try {
				await prisma.user.upsert({
					where: { userid: BigInt(userid) },
					update: { username, picture },
					create: { userid: BigInt(userid), username, picture },
				});
			} catch (error) {
				console.error(`[ERROR] Failed to upsert user ${userid}:`, error);
				return res
					.status(500)
					.json({ success: false, error: "Failed to create/update user" });
			}

			await checkSpecificUser(userid);

			if (type === "create") {
				const existing = await prisma.activitySession.findFirst({
					where: {
						userId: BigInt(userid),
						active: true,
						workspaceGroupId: groupId,
					},
				});

				if (existing) {
					return res
						.status(400)
						.json({ success: false, error: "Session already initialized" });
				}

				let gameName = null;
				if (placeid) {
					try {
						const universeInfo: any = await noblox.getUniverseInfo(
							Number(placeid)
						);
						if (universeInfo && universeInfo[0] && universeInfo[0].name) {
							gameName = universeInfo[0].name;
						}
					} catch (error) {
						console.log(
							`[WARNING] Could not fetch universe info for place ${placeid}`
						);
					}
				}

				const sessionStartTime = new Date();
				const sessionMessage = generateSessionTimeMessage(
					gameName,
					sessionStartTime
				);

				await prisma.activitySession.create({
					data: {
						id: crypto.randomUUID(),
						userId: BigInt(userid),
						active: true,
						startTime: sessionStartTime,
						universeId: placeid ? BigInt(placeid) : null,
						sessionMessage: sessionMessage,
						workspaceGroupId: groupId,
					},
				});

				console.log(
					`[SESSION STARTED] User ${userid} for group ${groupId} - ${sessionMessage}`
				);
				return res.status(200).json({ success: true });
			} else if (type === "end") {
				const session = await prisma.activitySession.findFirst({
					where: {
						userId: BigInt(userid),
						active: true,
						workspaceGroupId: groupId,
					},
				});

				if (!session) {
					return res
						.status(400)
						.json({ success: false, error: "Session not found" });
				}

				await prisma.activitySession.update({
					where: { id: session.id },
					data: {
						endTime: new Date(),
						active: false,
						idleTime: idleTime ? Number(idleTime) : 0,
						messages: messages ? Number(messages) : 0,
					},
				});

				console.log(`[SESSION ENDED] User ${userid} (ID: ${session.id})`);
				return res.status(200).json({ success: true });
			} else {
				return res
					.status(400)
					.json({ success: false, error: "Invalid query type" });
			}
		} catch (error: any) {
			console.error("Unexpected error in /api/activity:", error);
			return res
				.status(500)
				.json({ success: false, error: "Internal server error" });
		}
	} else if (req.method == "GET") {
		const { id } = req.query;

		if (!id) {
			return res.status(401).json({ success: false, error: "Session ID required." });
		}

		try {
			if (req.session?.userId) {
				const workspaceId = req.body.workspaceId;

				if (!workspaceId) {
					return res.status(400).json({ success: false, error: "Workspace ID required for session-based auth" });
				}

				config = await prisma.config.findFirst({
					where: {
						workspaceGroupId: Number(workspaceId),
					},
				});

				if (!config) {
					return res.status(404).json({ success: false, error: "Workspace not found" });
				}
				groupId = config.workspaceGroupId;
			} else if (config) {
				groupId = config.workspaceGroupId;
			} else {
				console.log("error falls here")
				return res.status(401).json({ success: false, error: "Authorization required" });
			}
			console.log(id)
			const session = await prisma.activitySession.findFirst({
				where: {
					userId: BigInt(id.toString()),
					workspaceGroupId: groupId,
					active: true
				}
			})

			if (!session) {
				return res.status(404).json({
					success: false,
					error: "No active session found."
				})
			}

			return res.status(200).json({
				success: true,
				data: session
			})
		} catch (err) {
			console.error("Unexpected error in /api/activity:", err);
			return res
				.status(500)
				.json({ success: false, error: "Internal server error" });
		}
	}
}