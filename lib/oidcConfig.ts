import { NextApiRequest } from "next";
import { discovery } from "openid-client";
import { TLSSocket } from "tls";

export default async function oidcConfig() {
  if (!process.env.RBX_CLIENT_ID || !process.env.RBX_CLIENT_SECRET) return null;
  return await discovery(
    new URL("https://apis.roblox.com/oauth/"),
    process.env.RBX_CLIENT_ID,
    process.env.RBX_CLIENT_SECRET
  );
}

export function getHostUrl(req: NextApiRequest) {
  return new URL(
    process.env.VERCEL_URL
      ? "https://" + process.env.VERCEL_URL
      : process.env.HOST_URL ||
        (req.headers.host || (req.rawHeaders.find(h => h === "X-Forwarded-Host") && req.rawHeaders[req.rawHeaders.findIndex(h => h === "X-Forwarded-Host")+1])
          ? `${
              (req.headers["x-forwarded-proto"] === "https" || (req.socket as TLSSocket).encrypted)
                ? "https"
                : "http"
            }://${req.rawHeaders.find(h => h === "X-Forwarded-Host") ? req.rawHeaders[req.rawHeaders.findIndex(h => h === "X-Forwarded-Host")+1] : req.headers.host}`
          : "")
  );
}
