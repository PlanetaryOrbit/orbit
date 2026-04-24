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
  const AppId = process.env.GOOGLE_APP_ID;
  const clientSecret = process.env.GOOGLE_SECRET;
  const envOAuthOnly = process.env.ROBLOX_OAUTH_ONLY === 'true';
  const hasEnvCredentials = !!(AppId && clientSecret);

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
      in: ["google_id", "google_secret"],
    },
    },
  });

  const configMap = configs.reduce((acc:any, config:any) => {
    acc[config.key] = typeof config.value === 'string' ? config.value.trim() : config.value;
    return acc;
  }, {} as Record<string, any>);
  
  const clientId = configMap.google_id
  const available = !!clientId;
  const oauthOnly = configMap.oauthOnlyLogin || false;

  return res.json({
    available,
    oauthOnly,
    configured: {
    applicationId: !!clientId,
    applicationSecret: !!configMap.google_secret
    },
    usingEnvVars: false,
  });
  } catch (error) {
  console.error("Failed to check OAuth configuration:", error);
  return res.json({ available: false, usingEnvVars: false });
  }
}
