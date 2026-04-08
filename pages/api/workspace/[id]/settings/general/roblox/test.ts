import { NextApiRequest, NextApiResponse } from "next";
import { withSessionRoute } from "@/lib/withSession";
import prisma from "@/utils/database";
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

  const workspaceId = parseInt(req.query.id as string);
  const userId = req.session.userid;

  if (!userId || isNaN(workspaceId)) {
    return res.status(400).json({ success: false, error: "Invalid request" });
  }

  const user = await prisma.user.findFirst({
    where: { userid: userId },
    include: {
      roles: { where: { workspaceGroupId: workspaceId } },
      workspaceMemberships: { where: { workspaceGroupId: workspaceId } },
    },
  });

  const membership = user?.workspaceMemberships?.[0];
  const isAdmin = membership?.isAdmin || false;
  const userRole = user?.roles?.[0];
  const hasAdminPermission = userRole?.permissions?.includes("admin") || isAdmin;

  if (!hasAdminPermission) {
    return res.status(403).json({ success: false, error: "Forbidden" });
  }

  const { key } = req.body;
  if (!key || typeof key !== "string") {
    return res.status(400).json({ success: false, error: "OpenCloud key is required" });
  }

  try {
    const ocres = await axios.post<OpenCloudKeyRes>(
      "https://apis.roblox.com/api-keys/v1/introspect",
      { apiKey: key },
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
    console.error("Error testing Open Cloud Key:", error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Internal server error",
    });
  }
}

export default withSessionRoute(handler);