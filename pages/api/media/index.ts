import fs from 'fs/promises';

import formidable from 'formidable';
import type { NextApiResponse } from 'next';

import { AuthenticatedRequest, withInstanceAuth } from '@/lib/withAuth';
import cache from '@/utils/cache';
import { saveMedia, maxFileSize } from '@/utils/media';

export const config = {
  api: {
    bodyParser: false,
  },
};

type Data = {
  success: boolean;
  error?: string;
  media?: {
    id: string;
    url: string;
    filename: string;
    originalName: string;
    mimeType: string;
    size: number;
    width: number | null;
    height: number | null;
  };
};

function checkOrigin(req: AuthenticatedRequest) {
  const origin = req.headers.origin;
  if (!origin) {
    return true;
  }
  const expected = `${req.headers['x-forwarded-proto'] || 'https'}://${req.headers.host}`;
  return origin === expected;
}

export default withInstanceAuth(async function handler(
  req: AuthenticatedRequest,
  res: NextApiResponse<Data>,
) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed',
    });
  }

  if (!checkOrigin(req)) {
    return res.status(403).json({
      success: false,
      error: 'Invalid origin',
    });
  }

  const rateKey = `media-upload:${req.auth.userId}`;

  const uploads = await cache.increment(rateKey, 60);

  if (uploads > 20) {
    return res.status(429).json({
      success: false,
      error: 'Too many uploads. Try again later.',
    });
  }

  const form = formidable({
    maxFileSize: MAX_FILE_SIZE,
    maxFiles: 1,
    allowEmptyFiles: false,
    multiples: false,
    keepExtensions: false,
    filter: ({ name }) => name === 'file',
  });

  let temporaryFile: string | undefined;

  try {
    const [, files] = await form.parse(req);

    const file = Array.isArray(files.file) ? files.file[0] : files.file;

    if (!file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded',
      });
    }

    temporaryFile = file.filepath;

    const media = await saveMedia(
      {
        filepath: file.filepath,
        originalName: file.originalFilename || 'upload',
        size: file.size,
      },
      req.auth.userId,
    );

    return res.status(201).json({
      success: true,
      media: {
        id: media.id,
        url: `/api/media/${media.id}`,
        filename: media.filename,
        originalName: media.originalName,
        mimeType: media.mimeType,
        size: media.size,
        width: media.width,
        height: media.height,
      },
    });
  } catch (error) {
    console.error('[MEDIA] Upload failed:', error);

    return res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unable to upload media',
    });
  } finally {
    if (temporaryFile) {
      await fs.rm(temporaryFile, {
        force: true,
      });
    }
  }
});
