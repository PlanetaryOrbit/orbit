import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/utils/database";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
	return res.status(405).json({ error: "Method not allowed" });
  }

  try {
	const envDiscordAppID = process.env.DISCORD_APPLICATION_ID;
	const clientSecret = process.env.DISCORD_SECRET;
	const envOAuthOnly = process.env.ROBLOX_OAUTH_ONLY === 'true';
	const hasEnvCredentials = !!(envDiscordAppID && clientSecret);

	if (hasEnvCredentials) {
	  return res.json({
		available: true,
		oauthOnly: envOAuthOnly,
		configured: {
		  applicationId: true,
		  applicationSecret: false
		},
		usingEnvVars: true,
	  });
	}

	const configs = await prisma.instanceConfig.findMany({
	  where: {
		key: {
		  in: ["discordAppID", "discordAppSecret"],
		},
	  },
	});

	const configMap = configs.reduce((acc, config) => {
	  acc[config.key] = typeof config.value === 'string' ? config.value.trim() : config.value;
	  return acc;
	}, {} as Record<string, any>);
	
	const clientId = configMap.discordAppID
	const available = !!clientId;
	const oauthOnly = configMap.oauthOnlyLogin || false;

	return res.json({
	  available,
	  oauthOnly,
	  configured: {
		applicationId: !!clientId,
		applicationSecret: !!configMap.discordAppSecret
	  },
	  usingEnvVars: false,
	});
  } catch (error) {
	console.error("Failed to check OAuth configuration:", error);
	return res.json({ available: false, usingEnvVars: false });
  }
}
