import { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/utils/database";
import axios from "axios";

type DiscordTokenResponse = {
	access_token: string;
	refresh_token: string;
	expires_in: number;
	token_type: string;
};

export default async function handler(
	req: NextApiRequest,
	res: NextApiResponse
) {
	if (req.method !== "POST") {
		return res.status(405).json({ error: "Method not allowed" });
	}

	const cronSecret = req.headers["x-cron-secret"] || req.headers.authorization;
	const expectedSecret = process.env.CRON_SECRET;

	if (!expectedSecret) {
		return res.status(500).json({ error: "CRON_SECRET not configured" });
	}
	if (!cronSecret || String(cronSecret) !== expectedSecret) {
		return res.status(401).json({ error: "Unauthorized" });
	}

	let clientId: string | undefined = process.env.DISCORD_APPLICATION_ID;
	let clientSecret: string | undefined = process.env.DISCORD_SECRET;

	if (!clientId || !clientSecret) {
		try {
			const configs = await prisma.instanceConfig.findMany({
				where: { key: { in: ["discordAppID", "discordAppSecret"] } },
			});

			const configMap = configs.reduce((acc, config) => {
				acc[config.key] =
					typeof config.value === "string" ? config.value.trim() : config.value;
				return acc;
			}, {} as Record<string, any>);

			clientId = clientId || configMap.discordAppID;
			clientSecret = clientSecret || configMap.discordAppSecret;
		} catch (err) {
			console.error("Failed to fetch OAuth config from database:", err);
		}
	}

	if (!clientId || !clientSecret) {
		return res.status(500).json({ error: "Discord OAuth credentials not configured" });
	}

	const in24h = new Date(Date.now() + 24 * 60 * 60 * 1000);

	const expiring = await prisma.discordUser.findMany({
		where: {
			refreshToken: { not: null },
			expireToken: { lte: in24h },
		},
	});

	console.log(`Found ${expiring.length} Discord tokens to refresh`);

	const results = {
		refreshed: 0,
		failed: 0,
		failedIds: [] as string[],
	};

	for (const entry of expiring) {
		try {
			const tokenResponse = await axios.post<DiscordTokenResponse>(
				"https://discord.com/api/v10/oauth2/token",
				new URLSearchParams({
					grant_type: "refresh_token",
					refresh_token: entry.refreshToken!,
					client_id: clientId,
					client_secret: clientSecret,
				}),
				{ headers: { "Content-Type": "application/x-www-form-urlencoded" } }
			);

			const { access_token, refresh_token, expires_in } = tokenResponse.data;

			await prisma.discordUser.update({
				where: { discordUserId: entry.discordUserId },
				data: {
					accessToken: access_token,
					refreshToken: refresh_token,
					expireToken: new Date(Date.now() + expires_in * 1000),
				},
			});

			results.refreshed++;
		} catch (err) {
			results.failed++;
			results.failedIds.push(entry.discordUserId.toString());

			if (axios.isAxiosError(err)) {
				const status = err.response?.status;
				const errorCode = err.response?.data?.error;

				console.error(
					`Failed to refresh token for Discord user ${entry.discordUserId}:`,
					{ status, errorCode }
				);

				if (status === 400 && (errorCode === "invalid_grant" || errorCode === "invalid_request")) {
					await prisma.discordUser.update({
						where: { discordUserId: entry.discordUserId },
						data: {
							accessToken: null,
							refreshToken: null,
							expireToken: null,
						},
					});
					console.warn(`Cleared invalid tokens for Discord user ${entry.discordUserId}`);
				}
			} else {
				console.error(`Unexpected error for Discord user ${entry.discordUserId}:`, err);
			}
		}
	}

	console.log(`Token refresh complete — refreshed: ${results.refreshed}, failed: ${results.failed}`);

	return res.status(200).json({
		success: true,
		total: expiring.length,
		...results,
	});
}