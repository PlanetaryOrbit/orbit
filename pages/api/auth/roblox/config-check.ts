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
    const envClientId = process.env.ROBLOX_CLIENT_ID;
    const envClientSecret = process.env.ROBLOX_CLIENT_SECRET;
    const envRedirectUri = process.env.ROBLOX_REDIRECT_URI;
    const envOAuthOnly = process.env.ROBLOX_OAUTH_ONLY === 'true';
    const hasEnvCredentials = !!(envClientId && envClientSecret && envRedirectUri);

    if (hasEnvCredentials) {
      return res.json({
        available: true,
        oauthOnly: envOAuthOnly,
        configured: {
          clientId: true,
          clientSecret: true,
          redirectUri: true,
        },
        usingEnvVars: true,
      });
    }

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
    
    const clientId = configMap.robloxClientId;
    const clientSecret = configMap.robloxClientSecret;
    const redirectUri = configMap.robloxRedirectUri;
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
      usingEnvVars: false,
    });
  } catch (error) {
    console.error("Failed to check OAuth configuration:", error);
    return res.json({ available: false, usingEnvVars: false });
  }
}
