import { NextApiRequest, NextApiResponse } from "next";
import { withSessionRoute } from "@/lib/withSession";
import axios from "axios";

interface OpenCloudKeyRes {
  name: string;
  authorizedUserId: number;
  scopes: {
    name: string;
    operations: string[] | null;
  }[];
  enabled: boolean;
  expired: boolean;
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  const { key } = req.body as { key?: string };
  if (!key || !key.trim()) {
    return res.status(400).json({ success: false, error: "OpenCloud key is required" });
  }

  try {
    const ocres = await axios.post<OpenCloudKeyRes>(
      "https://apis.roblox.com/api-keys/v1/introspect",
      { apiKey: key.trim() },
      { headers: { "Content-Type": "application/json" } }
    );

    const { enabled, expired, scopes } = ocres.data;

    if (expired) {
      return res.status(400).json({ success: false, code: 3, error: "API key has expired" });
    }

    if (!enabled) {
      return res.status(400).json({ success: false, code: 4, error: "API key is disabled" });
    }

    const groupScope = scopes.find((s) => s.name === "group");
    if (!groupScope) {
      return res.status(400).json({ success: false, code: 1, error: "API key is missing the 'group' scope" });
    }

    const ops = groupScope.operations ?? [];
    if (!ops.includes("read") || !ops.includes("write")) {
      return res.status(400).json({ success: false, code: 2, error: "API key requires both read and write operations on the 'group' scope" });
    }

    return res.status(200).json({ success: true, message: "API key is valid." });
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      return res.status(400).json({ success: false, code: 5, error: "Invalid API key" });
    }
    console.error("Error testing Open Cloud key:", error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Internal server error",
    });
  }
}

export default withSessionRoute(handler);