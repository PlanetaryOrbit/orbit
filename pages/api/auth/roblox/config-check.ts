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
    const configs = await prisma.instanceConfig.findMany({
      where: {
        key: {
          in: ["robloxClientId", "robloxClientSecret", "robloxRedirectUri", "oauthOnlyLogin"],
        },
      },
    });

    const configMap = configs.reduce((acc, config) => {
      acc[config.key] = typeof config.value === 'string' ? config.value.trim() : config.value;
      return acc;
    }, {} as Record<string, any>);
    const clientId =
      process.env.PLANETARY_CLOUD_ROBLOX_CLIENT_ID || configMap.robloxClientId;
    const clientSecret =
      process.env.PLANETARY_CLOUD_ROBLOX_CLIENT_SECRET ||
      configMap.robloxClientSecret;
    const redirectUri =
      process.env.PLANETARY_CLOUD_ROBLOX_REDIRECT_URI ||
      configMap.robloxRedirectUri;
    const available = !!(clientId && clientSecret && redirectUri);
    const oauthOnly = configMap.oauthOnlyLogin || false;

    return res.json({
      available,
      oauthOnly,
      configured: {
        clientId: !!clientId,
        clientSecret: !!clientSecret,
        redirectUri: !!redirectUri,
      },
    });
  } catch (error) {
    console.error("Failed to check OAuth configuration:", error);
    return res.json({ available: false });
  }
}
