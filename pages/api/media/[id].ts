import type { NextApiResponse } from "next";
import { withInstanceAuth, AuthenticatedRequest } from "@/lib/withAuth";
import prisma from "@/utils/database";
import fs from "fs/promises";
import path from "path";
import cache from "@/utils/cache";

type Data = {
  success: boolean;
  error?: string;
  media?: any;
};

export default withInstanceAuth(handler);

async function handler(
  req: AuthenticatedRequest,
  res: NextApiResponse<Data>,
) {
  const { id } = req.query;

  if (!id || Array.isArray(id)) {
    return res.status(400).json({
      success: false,
      error: "Invalid media id",
    });
  }

  try {
    if (req.method === "GET") {
      const key = `media:${id}`;

      const cached = await cache.get(key);

      if (cached) {
        return res.status(200).json({
          success: true,
          media: cached,
        });
      }

      const media = await prisma.media.findUnique({
        where: {
          id,
        },
      });

      if (!media) {
        return res.status(404).json({
          success: false,
          error: "Media not found",
        });
      }

      await cache.set(key, media, 60 * 60 * 24 * 30);

      return res.status(200).json({
        success: true,
        media,
      });
    }

    if (req.method === "DELETE") {
      const media = await prisma.media.findUnique({
        where: {
          id,
        },
      });

      if (!media) {
        return res.status(404).json({
          success: false,
          error: "Media not found",
        });
      }

      if (media.uploadedBy !== req.auth.userId) {
        return res.status(403).json({
          success: false,
          error: "You cannot delete this media",
        });
      }

      await Promise.all([
        fs
          .unlink(path.join(process.cwd(), "public", media.url))
          .catch(() => {}),
        prisma.media.delete({
          where: {
            id,
          },
        }),
        cache.del(`media:${id}`),
      ]);

      return res.status(200).json({
        success: true,
      });
    }

    return res.status(405).json({
      success: false,
      error: "Method not allowed",
    });
  } catch (error) {
    console.error("Media API error:", error);

    return res.status(500).json({
      success: false,
      error: "Request failed",
    });
  }
}
