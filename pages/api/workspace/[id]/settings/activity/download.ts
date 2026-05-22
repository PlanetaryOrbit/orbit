// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
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
    return res
      .status(405)
      .json({ success: false, error: "Method not allowed" });
  }

  const workspaceId = parseInt(req.query.id as string);
  if (isNaN(workspaceId)) {
    return res
      .status(400)
      .json({ success: false, error: "Invalid workspace ID" });
  }

  let activityconfig = await getConfig("activity", workspaceId);
  if (!activityconfig?.key) {
    activityconfig = {
      key: crypto.randomBytes(16).toString("hex"),
    };
    await setConfig("activity", activityconfig, workspaceId);
  }

  let xml_string: string;

  const isVercel = !!process.env.VERCEL_URL;
  
  if (isVercel) {
    try {
      const response = await axios.get('https://raw.githubusercontent.com/PlanetaryOrbit/orbit/refs/heads/main/Orbit-activity.rbxmx', {
        headers: {
          'User-Agent': `Orbit/${packageInfo.version}`
        }
      });
      xml_string = response.data;
    } catch (error) {
      console.error("Failed to fetch XML file from GitHub:", error);
      return res.status(500).json({ 
        success: false, 
        error: "Failed to fetch activity template. Please try again later." 
      });
    }
  } else {
    try {
      const filePath = path.join(process.cwd(), "Orbit-activity.rbxmx");
      xml_string = fs.readFileSync(filePath, "utf8");
    } catch (error) {
      console.error("Failed to read local XML file:", error);
      return res.status(500).json({ 
        success: false, 
        error: "Activity template file not found. Please ensure Orbit-activity.rbxmx exists." 
      });
    }
  }

  let protocol =
    req.headers["x-forwarded-proto"] ||
    req.headers.referer?.split("://")[0] ||
    "http";

  if (typeof protocol === "string") {
    protocol = protocol.split(",")[0];
  } else if (Array.isArray(protocol)) {
    protocol = protocol[0].split(",")[0];
  }

  const planetaryCloudUrl = process.env.PLANETARY_CLOUD_URL;
  const vercelUrl = process.env.VERCEL_URL;
  const host = planetaryCloudUrl || vercelUrl || req.headers.host;

  if (!host) {
    console.error("No host available to construct URL");
    return res.status(500).json({ 
      success: false, 
      error: "Unable to determine server URL" 
    });
  }

  let currentUrl = new URL(`${protocol}://${host}`);
  
  let result = xml_string
    .replace(/<apikey>/g, activityconfig.key)
    .replace(/<url>/g, currentUrl.origin);

  res.setHeader(
    "Content-Disposition",
    "attachment; filename=Orbit-activity.rbxmx"
  );
  res.setHeader("Content-Type", "application/rbxmx");
  res.status(200).send(result);
}