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
    const hasRobloxEnv = !!(
      process.env.ROBLOX_CLIENT_ID &&
      process.env.ROBLOX_CLIENT_SECRET &&
      process.env.ROBLOX_REDIRECT_URI
    );
    const hasDiscordEnv = !!(
      process.env.DISCORD_APPLICATION_ID &&
      process.env.DISCORD_SECRET
    );
    const hasGoogleEnv = !!(
      process.env.GOOGLE_APP_ID &&
      process.env.GOOGLE_SECRET
    );

    const envOAuthOnly = (process.env.ROBLOX_OAUTH_ONLY || process.env.OAUTH_ONLY) === "true";
    const hasEnvProvider = hasRobloxEnv || hasDiscordEnv || hasGoogleEnv;

    if (hasEnvProvider) {
      return res.json({
        available: true,
        oauthOnly: envOAuthOnly,
        usingEnvVars: true,
      });
    }

    const configs = await prisma.instanceConfig.findMany({
      where: {
        key: {
          in: [
            "robloxClientId", "robloxClientSecret", "robloxRedirectUri", "discordAppID", "discordAppSecret", "google_id", "google_secret", "oauthOnlyLogin",
          ],
        },
      },
    });

    const configMap = configs.reduce((acc, config) => {
      acc[config.key] = typeof config.value === "string" ? config.value.trim() : config.value;
      return acc;
    }, {} as Record<string, any>);

    const hasRobloxDb = !!(
      configMap.robloxClientId &&
      configMap.robloxClientSecret &&
      configMap.robloxRedirectUri
    );
    const hasDiscordDb = !!(configMap.discordAppID && configMap.discordAppSecret);
    const hasGoogleDb = !!(configMap.google_id && configMap.google_secret);

    const available = hasRobloxDb || hasDiscordDb || hasGoogleDb;
    const oauthOnly = configMap.oauthOnlyLogin || false;

    if (oauthOnly && !available) {
      console.warn("oauthOnly is enabled but no OAuth provider is configured. Falling back to password login");
      return res.json({ available: false, oauthOnly: false, usingEnvVars: false });
    }

    return res.json({ available, oauthOnly, usingEnvVars: false });
  } catch (error) {
    console.error("Failed to check OAuth configuration:", error);
    return res.json({ available: false, oauthOnly: false, usingEnvVars: false });
  }
}