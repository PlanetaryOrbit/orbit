// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";
import { fetchworkspace, getConfig, setConfig } from "@/utils/configEngine";
import prisma from "@/utils/database";
import { withPermissionCheck } from "@/utils/permissionsManager";
import { withSessionRoute } from "@/lib/withSession";
import {
  getUsername,
  getThumbnail,
  getDisplayName,
} from "@/utils/userinfoEngine";
import * as noblox from "noblox.js";
import sanitizeHtml from "sanitize-html";
import { fileTypeFromBuffer } from "file-type";
import isSvg from "is-svg";
import sharp from "sharp";

type Data = {
  success: boolean;
  error?: string;
  post?: any;
};

export default withPermissionCheck(handler, "post_on_wall");

// Allowed image MIME types
const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
];

// Max file size (5MB)
const MAX_FILE_SIZE = 5 * 1024 * 1024;

/**
 * Validates and sanitizes an image
 * @param dataUrl Data URL containing the image
 * @returns Sanitized data URL or throws an error
 */
async function validateAndSanitizeImage(dataUrl: string): Promise<string> {
  if (typeof dataUrl !== "string" || !dataUrl.startsWith("data:image/")) {
    throw new Error("Invalid image format");
  }

  // Extract base64 data and MIME type
  const matches = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!matches) {
    throw new Error("Invalid data URL format");
  }

  const [, mimeType, base64Data] = matches;

  // Check if MIME type is allowed
  if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
    throw new Error("Unsupported image type");
  }

  // Convert base64 to buffer
  const buffer = Buffer.from(base64Data, "base64");

  // Check file size
  if (buffer.length > MAX_FILE_SIZE) {
    throw new Error("Image too large. Maximum size is 5MB.");
  }

  // Detect actual file type using file-type package
  const fileType = await fileTypeFromBuffer(new Uint8Array(buffer));

  // If file type detection fails or doesn't match claimed type, check if it's SVG
  if (!fileType) {
    if (isSvg(buffer.toString())) {
      throw new Error("SVG images are not supported");
    }
    throw new Error("Unable to determine image type");
  }

  // Verify that detected type matches claimed type
  if (!ALLOWED_MIME_TYPES.includes(fileType.mime)) {
    throw new Error("Image type mismatch");
  }

  // Check if claimed MIME type matches actual MIME type
  if (fileType.mime !== mimeType) {
    throw new Error("Image type doesn't match claimed type");
  }

  // Process with sharp to sanitize the image by fully re-encoding it
  try {
    let processedImageBuffer: Buffer;

    if (mimeType === "image/jpeg") {
      processedImageBuffer = await sharp(buffer)
        .jpeg({ quality: 85 })
        .toBuffer();
    } else if (mimeType === "image/png") {
      processedImageBuffer = await sharp(buffer)
        .png({ compressionLevel: 9 })
        .toBuffer();
    } else if (mimeType === "image/webp") {
      processedImageBuffer = await sharp(buffer)
        .webp({ quality: 85 })
        .toBuffer();
    } else if (mimeType === "image/gif") {
      processedImageBuffer = await sharp(buffer, { animated: true })
        .toFormat("png")
        .toBuffer();
      return `data:image/png;base64,${processedImageBuffer.toString("base64")}`;
    } else {
      throw new Error("Unsupported image format");
    }

    return `data:${mimeType};base64,${processedImageBuffer.toString("base64")}`;
  } catch (error) {
    console.error("Image processing error:", error);
    throw new Error("Failed to process image");
  }
}

export async function handler(req: NextApiRequest, res: NextApiResponse<Data>) {
  if (req.method !== "POST")
    return res
      .status(405)
      .json({ success: false, error: "Method not allowed" });
  if (!req.session.userid)
    return res.status(401).json({ success: false, error: "Not logged in" });
  if (!req.body?.content)
    return res.status(400).json({ success: false, error: "Missing content" });

  try {
    let { content, image } = req.body;

    // Sanitize text content - strip all HTML tags
    content = sanitizeHtml(content.toString().trim(), {
      allowedTags: [],
      allowedAttributes: {},
    });

    // Truncate overly long content
    const MAX_CONTENT_LENGTH = 10000;
    if (content.length > MAX_CONTENT_LENGTH) {
      content = content.substring(0, MAX_CONTENT_LENGTH);
    }

    // Validate and sanitize image (if present)
    if (image) {
      const workspaceId = parseInt(req.query.id as string);
      const user = await prisma.user.findFirst({
        where: { userid: BigInt(req.session.userid) },
        include: {
          roles: {
            where: { workspaceGroupId: workspaceId },
          },
          workspaceMemberships: {
            where: { workspaceGroupId: workspaceId },
          },
        },
      });

      const isAdmin = user?.workspaceMemberships?.[0]?.isAdmin || false;
      const hasPhotoPermission = 
        isAdmin || 
        user?.roles?.[0]?.permissions?.includes("add_wall_photos");

      if (!hasPhotoPermission) {
        return res.status(403).json({
          success: false,
          error: "You don't have permission to add photos to wall posts",
        });
      }

      try {
        image = await validateAndSanitizeImage(image);
      } catch (error) {
        return res.status(400).json({
          success: false,
          error: error instanceof Error ? error.message : "Invalid image",
        });
      }
    }

    const post = await prisma.wallPost.create({
      data: {
        content,
        image: image || undefined,
        authorId: req.session.userid,
        workspaceGroupId: parseInt(req.query.id as string),
      },
      include: {
        author: {
          select: {
            username: true,
            picture: true,
          },
        },
      },
    });

    return res.status(200).json({
      success: true,
      post: JSON.parse(
        JSON.stringify(post, (key, value) =>
          typeof value === "bigint" ? value.toString() : value
        )
      ),
    });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ success: false, error: "Something went wrong" });
  }
}
