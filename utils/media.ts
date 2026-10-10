import crypto from 'crypto';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';

import { fileTypeFromBuffer } from 'file-type';
import sharp from 'sharp';

import prisma from '@/utils/database';
const mediaRoot = process.env.MEDIA_ROOT || path.join(process.cwd(), 'data', 'media');
export const maxFileSize = 10485760; // 10MB
const allowedTypes = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp']);
const mimeExtenstions = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
  'image/webp': 'webp',
} as const;

export type MediaUpload = {
  filepath: string;
  originalName: string;
  size: number;
};

export type MediaInfo = {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  width: number | null;
  height: number | null;
  sha256: string;
  createdAt: Date;
  uploadedById: bigint | null;
};

function getMediaDirectory(id: string): string {
  return path.join(mediaRoot, id.slice(0, 2));
}

function getMediaPath(filename: string): string {
  return path.join(mediaRoot, filename.slice(0, 2), filename);
}

function isOriginalNameSafe(name: string): boolean {
  const norm = path.basename(name);

  if (!norm || norm === '.' || norm === '..') {
    return false;
  }

  if (norm.length > 255) {
    return false;
  }

  return true;
}

async function ensureMediaDirectory(id: string) {
  await fs.mkdir(getMediaDirectory(id), {
    recursive: true,
    mode: 0o750,
  });
}

export async function inspectMediaFile(file: MediaUpload) {
  if (!file.filepath) {
    throw new Error('Missing uploaded file');
  }

  if (!Number.isSafeInteger(file.size) || file.size <= 0) {
    throw new Error('Invalid file size');
  }

  if (file.size > maxFileSize) {
    throw new Error('File is too large');
  }

  if (!isOriginalNameSafe(file.originalName)) {
    throw new Error('Invalid filename');
  }

  const buffer = await fs.readFile(file.filepath);

  if (buffer.length === 0) {
    throw new Error('Empty file');
  }

  if (buffer.length > maxFileSize) {
    throw new Error('File is too large');
  }

  const detected = await fileTypeFromBuffer(buffer);

  if (!detected || !allowedTypes.has(detected.mime)) {
    throw new Error('Unsupported file type');
  }

  let image;

  try {
    image = sharp(buffer, {
      failOn: 'error',
      limitInputPixels: 40_000_000,
    });

    const metadata = await image.metadata();

    if (!metadata.width || !metadata.height) {
      throw new Error('Invalid image dimensions');
    }

    if (metadata.width > 10000 || metadata.height > 10000) {
      throw new Error('Image dimensions are too large');
    }

    return {
      buffer,
      detectedMime: detected.mime,
      width: metadata.width,
      height: metadata.height,
    };
  } catch {
    throw new Error('Invalid image');
  }
}

async function encodeImage(
  buffer: Buffer,
  mime: string,
): Promise<{
  buffer: Buffer;
  mimeType: string;
  width: number;
  height: number;
}> {
  try {
    const image = sharp(buffer, {
      failOn: 'error',
      limitInputPixels: 40_000_000,
    });

    const metadata = await image.metadata();

    if (!metadata.width || !metadata.height) {
      throw new Error('Invalid image');
    }

    // everything becomes webp, this also removes EXIF/XMP/IPTC metadata
    const output = await image.rotate().webp({ quality: 86, effort: 4 }).toBuffer();

    return {
      buffer: output,
      mimeType: 'image/webp',
      width: metadata.width,
      height: metadata.height,
    };
  } catch {
    throw new Error('Unable to process ' + mime);
  }
}

export async function saveMedia(file: MediaUpload, uploadedById: bigint): Promise<MediaInfo> {
  const inspected = await inspectMediaFile(file);
  const encoded = await encodeImage(inspected.buffer, inspected.detectedMime);

  const id = crypto.randomUUID();
  const filename = `${id}.webp`;

  await ensureMediaDirectory(id);

  const finalPath = getMediaPath(filename);
  const sha256 = crypto.createHash('sha256').update(encoded.buffer).digest('hex');

  try {
    await fs.writeFile(finalPath, encoded.buffer, {
      mode: 0o644,
    });

    try {
      const media = await prisma.media.create({
        data: {
          id,
          filename,
          originalName: file.originalName,
          mimeType: encoded.mimeType,
          size: encoded.buffer.length,
          width: encoded.width,
          height: encoded.height,
          sha256,
          uploadedById,
        },
      });

      return media;
    } catch (error) {
      await fs.rm(finalPath, { force: true });
      throw error;
    }
  } catch (error) {
    await fs.rm(finalPath, { force: true });
    throw error;
  }
}

export async function getMedia(id: string): Promise<MediaInfo | null> {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
    return null;
  }

  return prisma.media.findUnique({
    where: {
      id,
    },
  });
}

export function getMediaPathForFile(filename: string) {
  if (!/^[0-9a-f-]+\.webp$/i.test(filename)) {
    throw new Error('Invalid media filename');
  }

  return getMediaPath(filename);
}

export async function deleteMedia(id: string) {
  const media = await getMedia(id);

  if (!media) {
    return false;
  }

  const filePath = getMediaPathForFile(media.filename);

  await prisma.media.delete({
    where: {
      id,
    },
  });

  await fs.rm(filePath, {
    force: true,
  });

  return true;
}

export function getMediaUrl(id: string) {
  return `/api/media/${id}`;
}
