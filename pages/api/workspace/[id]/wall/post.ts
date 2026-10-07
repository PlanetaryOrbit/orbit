import fs from 'fs/promises';

import formidable from 'formidable';
import type { NextApiResponse } from 'next';
import sanitizeHtml from 'sanitize-html';

import { AuthenticatedRequest } from '@/lib/withAuth';
import prisma from '@/utils/database';
import { saveMedia, maxFileSize } from '@/utils/media';
import { withPermissionCheck } from '@/utils/permissionsManager';

type Data = {
  success: boolean;
  error?: string;
  post?: any;
};

export const config = {
  api: {
    bodyParser: false,
  },
};

export default withPermissionCheck(handler, 'post_on_wall');

export async function handler(req: AuthenticatedRequest, res: NextApiResponse<Data>) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed',
    });
  }

  if (!req.auth.userId) {
    return res.status(401).json({
      success: false,
      error: 'Not logged in',
    });
  }

  try {
    const form = formidable({
      maxFileSize,
      maxFiles: 1,
      allowEmptyFiles: false,
      keepExtensions: true,
    });

    const [fields, files] = await form.parse(req);

    let content = sanitizeHtml(String(fields.content?.[0] || '').trim(), {
      allowedTags: [],
      allowedAttributes: {},
    });

    content = content.slice(0, 10000);

    if (!content) {
      return res.status(400).json({
        success: false,
        error: 'Missing content',
      });
    }

    const file = files.file?.[0];
    let mediaId: string | undefined;

    if (file) {
      const workspaceId = parseInt(req.query.id as string);

      const user = await prisma.user.findFirst({
        where: {
          userid: BigInt(req.auth.userId),
        },
        include: {
          roles: {
            where: {
              workspaceGroupId: workspaceId,
            },
          },
          workspaceMemberships: {
            where: {
              workspaceGroupId: workspaceId,
            },
          },
        },
      });

      const isAdmin = user?.workspaceMemberships?.[0]?.isAdmin || false;

      const hasPhotoPermission =
        isAdmin || user?.roles?.some((role) => role.permissions?.includes('add_wall_photos'));

      if (!hasPhotoPermission) {
        return res.status(403).json({
          success: false,
          error: "You don't have permission to add photos to wall posts",
        });
      }

      const media = await saveMedia(
        {
          filepath: file.filepath,
          originalName: file.originalFilename || 'image',
          size: file.size,
        },
        BigInt(req.auth.userId),
      );

      mediaId = media.id;

      await fs.rm(file.filepath, { force: true });
    }

    const post = await prisma.wallPost.create({
      data: {
        content,
        authorId: BigInt(req.auth.userId),
        workspaceGroupId: parseInt(req.query.id as string),
        mediaId,
      },

      include: {
        author: {
          select: {
            username: true,
            picture: true,
          },
        },

        media: {
          select: {
            id: true,
            mimeType: true,
            width: true,
            height: true,
            size: true,
          },
        },
      },
    });

    return res.status(200).json({
      success: true,
      post: JSON.parse(
        JSON.stringify(post, (key, value) =>
          typeof value === 'bigint' ? value.toString() : value,
        ),
      ),
    });
  } catch (error) {
    console.error(error);

    return res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Something went wrong',
    });
  }
}
