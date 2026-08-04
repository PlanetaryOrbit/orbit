import { NextApiResponse } from "next";
import { AuthenticatedRequest, withAuth } from "@/lib/withAuth";
import { checkSpecificUser } from "@/utils/permissionsManager";
import cache from "@/utils/cache";

export default withAuth(handler);

export async function handler(
  req: AuthenticatedRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      error: "Method not allowed",
    });
  }

  if (!req.auth.userId) {
    return res.status(401).json({
      success: false,
      error: "Not logged in",
    });
  }

  try {
    const cacheKey = `permissions:user:${req.auth.userId}`;

    let data = await cache.get<any>(cacheKey);

    if (data === null) {
      data = await checkSpecificUser(
        req.auth.userId
      );

      await cache.set(
        cacheKey,
        data,
        300
      );
    }

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    console.error(
      "Permission check error:",
      error
    );

    return res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
}
