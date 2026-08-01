/**
 * Orbit API
 *
 * Tests a Roblox Open Cloud API key.
 *
 * @module pages/api/v2/setup/opencloudtest
 * @since 2.1.10beta21
 * @author BuddyWinte
 */

import type { NextApiRequest, NextApiResponse } from "next";
import type { RequestResponse } from "../types";
import { enforceRateLimit } from "../ratelimit";
import cache from "@/utils/v2/cache";
import { authenticate } from "@/lib/v2/withAuth";

interface OpenCloudKeyResponse {
  name: string;
  authorizedUserId: number;
  scopes: {
    name: string;
    operations: string[] | null;
  }[];
  enabled: boolean;
  expired: boolean;
}

type OpenCloudTestResponse = {
  valid: boolean;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<RequestResponse<OpenCloudTestResponse>>,
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

  const allowed = await enforceRateLimit(req, res, {
    cost: 2,
  });

  if (!allowed) {
    return;
  }

  const auth = await authenticate(req);

  console.log(auth);
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

  const cachedResult = await cache.get(`opencloudtest:${req.body.key}`);
  if (cachedResult) {
    return res.status(200).json({
      success: true,
      data: {
        valid: true,
      },
    });
  }

  const { key } = req.body as {
    key?: string;
  };

  if (!key?.trim()) {
    return res.status(400).json({
      success: false,
      error: {
        code: "MISSING_API_KEY",
        message: "Open Cloud Key is required.",
      },
    });
  }

  try {
    const response = await fetch(
      "https://apis.roblox.com/api-keys/v1/introspect",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ apiKey: key.trim() }),
      },
    );

    if (response.status === 401) {
      return res.status(401).json({
        success: false,
        error: {
          code: "INVALID_API_KEY",
          message: "Open Cloud Key is invalid.",
        },
      });
    }

    if (!response.ok) {
      const robloxError = await response.json().catch(() => null);

      return res.status(400).json({
        success: false,
        error: {
          code: "INVALID_API_KEY",
          message: robloxError?.message ?? "Open Cloud Key is invalid.",
          details: {
            robloxCode: robloxError?.code,
          },
        },
      });
    }

    const data = (await response.json()) as OpenCloudKeyResponse;

    if (data.expired) {
      return res.status(400).json({
        success: false,
        error: {
          code: "API_KEY_EXPIRED",
          message: "Open Cloud Key has expired.",
        },
      });
    }

    if (!data.enabled) {
      return res.status(400).json({
        success: false,
        error: {
          code: "API_KEY_DISABLED",
          message: "Open Cloud Key is disabled.",
        },
      });
    }

    const groupScope = data.scopes.find((scope) => scope.name === "group");

    if (!groupScope) {
      return res.status(400).json({
        success: false,
        error: {
          code: "GROUP_SCOPE_NOT_FOUND",
          message: "Open Cloud Key is missing a `group` scope.",
        },
      });
    }

    const operations = groupScope.operations ?? [];

    if (!operations.includes("read") || !operations.includes("write")) {
      return res.status(400).json({
        success: false,
        error: {
          code: "INSUFFICIENT_SCOPE_PERMISSIONS",
          message:
            "Open Cloud Key is missing read or write permissions in `group` scope.",
        },
      });
    }

    await cache.set(`opencloudtest:${req.body.key}`, { valid: true });
    return res.status(200).json({
      success: true,
      data: {
        valid: true,
      },
    });
  } catch (err) {
    console.error("Open Cloud Key validation failed:", err);
    return res.status(500).json({
      success: false,
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "Internal server error.",
      },
    });
  }
}
