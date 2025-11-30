// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";
import { getConfig, setConfig } from "@/utils/configEngine";
import { withPermissionCheck } from "@/utils/permissionsManager";
import * as crypto from "crypto";
import * as fs from "fs";
import * as path from "path";
type Data = {
  success: boolean;
  error?: string;
  color?: string;
};

export default withPermissionCheck(handler, "admin");

export async function handler(req: NextApiRequest, res: NextApiResponse<Data>) {
  if (req.method !== "GET")
    return res
      .status(405)
      .json({ success: false, error: "Method not allowed" });
  let activityconfig = await getConfig(
    "activity",
    parseInt(req.query.id as string)
  );
  if (!activityconfig?.key) {
    activityconfig = {
      key: crypto.randomBytes(16).toString("hex"),
    };
    setConfig("activity", activityconfig, parseInt(req.query.id as string));
  }

  let xml_string = fs.readFileSync(
    path.join(process.cwd(), "public", "Orbit-activity.rbxmx"),
    "utf8"
  );
  
  res.setHeader(
    "Content-Disposition",
    "attachment; filename=Orbit-activity.rbxmx"
  );

  // Fix the protocol handling to ensure it's a valid protocol string
  let protocol =
    req.headers["x-forwarded-proto"] ||
    req.headers.referer?.split("://")[0] ||
    "http";

  // Clean up protocol if it contains commas (Cloud hosting)
  if (typeof protocol === "string") {
    protocol = protocol.split(",")[0];
  } else if (Array.isArray(protocol)) {
    protocol = protocol[0].split(",")[0];
  }

  // use PLANETARY_CLOUD_URL if available, else use VERCEL_URL if available, else use the host
  const planetaryCloudUrl = process.env.PLANETARY_CLOUD_URL;
  const vercelUrl = process.env.VERCEL_URL;
  const host = planetaryCloudUrl || vercelUrl || req.headers.host;

  let currentUrl = new URL(`${protocol}://${host}`);
  let xx = xml_string
    .replace("<apikey>", activityconfig.key)
    .replace("<url>", currentUrl.origin);

  //send file and set content type
  res.setHeader("Content-Type", "application/rbxmx");
  res.status(200).send(xx as any);
}
