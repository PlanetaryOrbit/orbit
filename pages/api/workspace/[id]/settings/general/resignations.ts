import type { NextApiRequest, NextApiResponse } from "next";
import { getConfig, setConfig } from "@/utils/configEngine";
import { withPermissionCheck } from "@/utils/permissionsManager";
import { withAuth } from "@/lib/withAuth";

type Data = {
  success: boolean;
  error?: string;
  value?: unknown;
};

export default withAuth(handler);

async function handler(req: NextApiRequest, res: NextApiResponse<Data>) {
  const userId = (req as NextApiRequest & { session?: { userid?: number } }).session?.userid;
  if (!userId) {
    return res.status(401).json({ success: false, error: "Unauthorized" });
  }

  if (req.method === "GET") {
    const config = await getConfig(
      "resignations",
      parseInt(req.query.id as string, 10)
    );
    if (!config) {
      return res.status(404).json({ success: false, error: "Not found" });
    }
    return res.status(200).json({ success: true, value: config });
  }

  if (req.method === "PATCH") {
    return withPermissionCheck(
      async (innerReq: NextApiRequest, innerRes: NextApiResponse<Data>) => {
        await setConfig(
          "resignations",
          {
            enabled: innerReq.body.enabled,
          },
          parseInt(innerReq.query.id as string, 10)
        );
        try {
          const { logAudit } = await import("@/utils/logs");
          await logAudit(
            parseInt(innerReq.query.id as string, 10),
            userId,
            "settings.update",
            "resignations",
            { enabled: innerReq.body.enabled }
          );
        } catch {}
        return innerRes.status(200).json({ success: true });
      },
      "manage_features"
    )(req, res);
  }

  return res.status(405).json({ success: false, error: "Method not allowed" });
}
