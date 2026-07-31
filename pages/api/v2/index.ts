/**
 * Orbit API
 *
 * Handles GET / which just returns that the API is up and running
 *
 * @module pages/api/v2
 * @since 2.1.10beta21
 * @author BuddyWinte
 */

import type { NextApiRequest, NextApiResponse } from "next";
import type { RequestResponse } from "./types";
import { enforceRateLimit } from "./ratelimit";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<RequestResponse<string>>,
) {
  res.setHeader(
    "Cache-Control",
    "no-store, no-cache, must-revalidate, proxy-revalidate",
  );

  const allowed = await enforceRateLimit(req, res, {
    cost: 1,
  });

  if (!allowed) {
    return;
  }
  res.status(200).json({
    success: true,
    data: "API is up and running",
  });
}
