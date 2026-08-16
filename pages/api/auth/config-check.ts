import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/utils/database";
import cache from "@/utils/cache";

const CACHE_KEY = "orbit:auth:config-check";
const CACHE_TTL = 60 * 60 * 24 * 30;

type OAuthProvider = {
  available: boolean;
  oauthOnly: boolean;
  configured: {
    applicationId: boolean;
    applicationSecret: boolean;
  };
  usingEnvVars: boolean;
};

type ConfigCheckResponse = {
  google: OAuthProvider;
  discord: OAuthProvider;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ConfigCheckResponse | { error: string }>,
) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const cached = await cache.get<ConfigCheckResponse>(CACHE_KEY);

    if (cached) {
      return res.status(200).json(cached);
    }

    const envGoogleAppId = process.env.GOOGLE_APP_ID;
    const envGoogleSecret = process.env.GOOGLE_SECRET;
    const envDiscordAppId = process.env.DISCORD_APPLICATION_ID;
    const envDiscordSecret = process.env.DISCORD_SECRET;
    const envOAuthOnly = process.env.ROBLOX_OAUTH_ONLY === "true";

    const hasGoogleEnvCredentials =
      !!envGoogleAppId && !!envGoogleSecret;

    const hasDiscordEnvCredentials =
      !!envDiscordAppId && !!envDiscordSecret;

    const needsDatabaseConfig =
      !hasGoogleEnvCredentials || !hasDiscordEnvCredentials;

    let configMap: Record<string, unknown> = {};

    if (needsDatabaseConfig) {
      const configs = await prisma.instanceConfig.findMany({
        where: {
          key: {
            in: [
              "google_id",
              "google_secret",
              "discordAppID",
              "discordAppSecret",
              "oauthOnlyLogin",
            ],
          },
        },
      });

      configMap = configs.reduce<Record<string, unknown>>(
        (acc, config) => {
          acc[config.key] =
            typeof config.value === "string"
              ? config.value.trim()
              : config.value;

          return acc;
        },
        {},
      );
    }

    const googleClientId = hasGoogleEnvCredentials
      ? envGoogleAppId
      : typeof configMap.google_id === "string"
        ? configMap.google_id
        : undefined;

    const googleSecret = hasGoogleEnvCredentials
      ? envGoogleSecret
      : typeof configMap.google_secret === "string"
        ? configMap.google_secret
        : undefined;

    const googleUsingEnvVars = hasGoogleEnvCredentials;

    const google: OAuthProvider = {
      available: !!googleClientId,
      oauthOnly: googleUsingEnvVars
        ? envOAuthOnly
        : configMap.oauthOnlyLogin === true ||
          configMap.oauthOnlyLogin === "true",
      configured: {
        applicationId: !!googleClientId,
        applicationSecret: !!googleSecret,
      },
      usingEnvVars: googleUsingEnvVars,
    };

    const discordClientId = hasDiscordEnvCredentials
      ? envDiscordAppId
      : typeof configMap.discordAppID === "string"
        ? configMap.discordAppID
        : undefined;

    const discordSecret = hasDiscordEnvCredentials
      ? envDiscordSecret
      : typeof configMap.discordAppSecret === "string"
        ? configMap.discordAppSecret
        : undefined;

    const discordUsingEnvVars = hasDiscordEnvCredentials;

    const discord: OAuthProvider = {
      available: !!discordClientId,
      oauthOnly: discordUsingEnvVars
        ? envOAuthOnly
        : configMap.oauthOnlyLogin === true ||
          configMap.oauthOnlyLogin === "true",
      configured: {
        applicationId: !!discordClientId,
        applicationSecret: !!discordSecret,
      },
      usingEnvVars: discordUsingEnvVars,
    };

    const result: ConfigCheckResponse = {
      google,
      discord,
    };

    await cache.set(CACHE_KEY, result, CACHE_TTL);

    return res.status(200).json(result);
  } catch (error) {
    console.error("[AUTH CONFIG] Failed to check OAuth configuration:", error);

    return res.status(500).json({
      error: "Failed to check OAuth configuration",
    });
  }
}
