import type { NextApiResponse } from "next";
import { withInstanceAuth, AuthenticatedRequest } from "@/lib/withAuth";
import prisma from "@/utils/database";
import formidable from "formidable";
import sharp from "sharp";
import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import cache from "@/utils/cache";

export const config = {
  api: {
    bodyParser: false,
  },
};

type Data = {
  success: boolean;
  error?: string;
  media?: any;
};

function parseForm(req: any): Promise<formidable.Files> {
  const form = formidable({
    maxFileSize: 10 * 1024 * 1024,
    multiples: false,
  });

  return new Promise((resolve, reject) => {
    form.parse(req, (err, _, files) => {
      if (err) reject(err);
      else resolve(files);
    });
  });
}

export default withInstanceAuth(handler);

async function handler(req: AuthenticatedRequest, res: NextApiResponse<Data>) {
  const method = req.method;

  try {
    if (method === "POST") {
      const files = await parseForm(req);
      const uploaded = files.file;

      const file = Array.isArray(uploaded)
        ? uploaded[0]
        : uploaded;

      if (!file) {
        return res.status(400).json({
          success: false,
          error: "Missing file",
        });
      }

      const buffer = await fs.readFile(file.filepath);

      const metadata = await sharp(buffer).metadata();

      const id = crypto.randomUUID();
      const filename = `${id}.webp`;

      const directory = path.join(process.cwd(), "public", "media");
      const filepath = path.join(directory, filename);

      await fs.mkdir(directory, {
        recursive: true,
      });

      const output = await sharp(buffer)
        .webp({
          quality: 80,
          effort: 6,
        })
        .toBuffer();

      await fs.writeFile(filepath, output);

      const media = await prisma.media.create({
        data: {
          filename,
          url: `/media/${filename}`,
          mimeType: "image/webp",
          size: output.length,
          width: metadata.width,
          height: metadata.height,
          uploadedBy: req.auth.userId,
        },
      });

      await cache.set(`media:${media.id}`, media, 60 * 60 * 24 * 30);

      return res.status(200).json({
        success: true,
        media: {
          id: media.id,
          url: media.url,
          width: media.width,
          height: media.height,
        },
      });
    }

    return res.status(405).json({
      success: false,
      error: "Method not allowed",
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      error: "Request failed",
    });
  }
}
