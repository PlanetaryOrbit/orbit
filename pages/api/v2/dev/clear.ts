/**
 * Orbit API
 *
 * Development cache clear endpoint.
 *
 * @module pages/api/v2/dev/clear
 * @since 2.1.10beta21
 * @author BuddyWinte
 */
import type { NextApiRequest, NextApiResponse } from "next";
import cache from "@/utils/v2/cache";
import { authenticate } from "@/lib/v2/withAuth";
import type { RequestResponse } from "../types"

type ClearResponse = {
  cleared: boolean;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<RequestResponse<ClearResponse>>,
) {
  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      error: {
        code: "METHOD_NOT_ALLOWED",
        message: "Method not allowed.",
      },
    });
  }

  const auth = await authenticate(req);

  if (!auth) {
    return res.status(401).json({
      success: false,
      error: {
        code: "UNAUTHORIZED",
        message: "Unauthorized.",
      },
    });
  }

  if (!auth.user.isOwner) {
    return res.status(403).json({
      success: false,
      error: {
        code: "FORBIDDEN",
        message: "You must be owner to perform this action.",
      },
    });
  }

  await cache.clear();

  return res.status(200).json({
    success: true,
    data: {
      cleared: true,
    },
  });
}
