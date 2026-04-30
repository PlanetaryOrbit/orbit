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
  if (!req.query.event || !req.query.gFormat || !req.query.lightMode || !req.query.sClaimed) {
    return res
      .status(400)
      .json({ success: false, error: "Missing params" });
  }
  
  let boardConfig = await getConfig(
    "board_key",
    parseInt(req.query.id as string)
  );
  if (!boardConfig?.key) {
    boardConfig = {
      key: crypto.randomBytes(16).toString("hex"),
    };
    await setConfig("board_key", boardConfig, parseInt(req.query.id as string));
  }

  let xml_string = fs.readFileSync(path.join("planetaryboard.rbxmx"), "utf8");
  res.setHeader(
    "Content-Disposition",
    "attachment; filename=planetaryboard.rbxmx"
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
    .replace("<apikey>", boardConfig.key)
    .replace("<url>", `${currentUrl.origin}/`)
    .replace("<wid>", req.query.id ? req.query.id.toString() : "0")
    .replace("<type>", req.query.event ? req.query.event.toString() : "0")
    .replace("<oclaimed>", req.query.sClaimed ?req.query.sClaimed.toString() : "true")
    .replace("<mode>", req.query.lightMode ? req.query.lightMode.toString() == "true" ? "light" : "dark" : "dark")
    .replace("<cformat>", req.query.gFormat ? req.query.gFormat.toString() == "true" ? "24h" : "12h" : "12h")

  //send file and set content type
  res.setHeader("Content-Type", "application/rbxmx");
  res.status(200).send(xx as any);
}
