import type { NextApiRequest, NextApiResponse } from "next";
import { getConfig, setConfig } from "@/utils/configEngine";
import { withPermissionCheck } from "@/utils/permissionsManager";
import * as crypto from "crypto";
import * as fs from "fs";
import * as path from "path";
import axios from "axios";
import packageInfo from "@/package.json";

export default withPermissionCheck(handler, "admin");

export async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  if (!req.query.event || !req.query.gFormat || !req.query.lightMode || !req.query.sClaimed) {
    return res.status(400).json({ success: false, error: "Missing params" });
  }

  const workspaceId = parseInt(req.query.id as string);
  if (isNaN(workspaceId)) {
    return res.status(400).json({ success: false, error: "Invalid workspace ID" });
  }

  let boardConfig = await getConfig("board_key", workspaceId);
  if (!boardConfig?.key) {
    boardConfig = { key: crypto.randomBytes(16).toString("hex") };
    await setConfig("board_key", boardConfig, workspaceId);
  }

  let xml_string: string;
  const isVercel = !!process.env.VERCEL_URL;

  if (isVercel) {
    try {
      const response = await axios.get(
        "https://raw.githubusercontent.com/PlanetaryOrbit/orbit/refs/heads/main/planetaryboard.rbxmx",
        {
          headers: { "User-Agent": `Orbit/${packageInfo.version}` },
          responseType: "text",
          transformResponse: [(data) => data],
        }
      );
      xml_string = response.data;
    } catch (error) {
      console.error("Failed to fetch XML file from GitHub:", error);
      return res.status(500).json({
        success: false,
        error: "Failed to fetch planetary board template. Please try again later.",
      });
    }
  } else {
    try {
      const filePath = path.join(process.cwd(), "planetaryboard.rbxmx");
      xml_string = fs.readFileSync(filePath, { encoding: "utf8" });
    } catch (error) {
      console.error("Failed to read local XML file:", error);
      return res.status(500).json({
        success: false,
        error: "Planetary board template file not found. Please ensure planetaryboard.rbxmx exists.",
      });
    }
  }

  let protocol =
    req.headers["x-forwarded-proto"] ||
    req.headers.referer?.split("://")[0] ||
    "http";

  if (Array.isArray(protocol)) {
    protocol = protocol[0].split(",")[0];
  } else {
    protocol = protocol.split(",")[0];
  }

  const host =
    process.env.PLANETARY_CLOUD_URL || process.env.NEXTAUTH_URL ||
    process.env.VERCEL_URL ||
    req.headers.host;

  if (!host) {
    console.error("No host available to construct URL");
    return res.status(500).json({ success: false, error: "Unable to determine server URL" });
  }

  const currentUrl = new URL(`${protocol}://${host}`);

  const result = xml_string
    .replace(/<apikey>/g, boardConfig.key)
    .replace(/INSTANCE_URL_PLACEHOLDER/g, `${currentUrl.origin}/`)
    .replace(/<wid>/g, req.query.id?.toString() ?? "0")
    .replace(/<type>/g, req.query.event.toString())
    .replace(/<oclaimed>/g, req.query.sClaimed.toString())
    .replace(/<mode>/g, req.query.lightMode.toString() === "true" ? "light" : "dark")
    .replace(/<cformat>/g, req.query.gFormat.toString() === "true" ? "24h" : "12h");

  res.setHeader("Content-Disposition", "attachment; filename=planetaryboard.rbxmx")
  res.status(200).send(result)
}
