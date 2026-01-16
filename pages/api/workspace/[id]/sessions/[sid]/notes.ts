import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/utils/database";
import { withSessionRoute } from "@/lib/withSession";
import { validateCsrf } from "@/utils/csrf";

// Simple in-memory rate limiting for notes creation
const notesCreationLimits: { [key: string]: { count: number; resetTime: number } } = {};

function checkNotesCreationRateLimit(req: NextApiRequest, res: NextApiResponse): boolean {
  const workspaceId = req.query?.id || 'unknown';
  const sessionId = req.query?.sid || 'unknown';
  const userId = (req as any).session?.userid || 'anonymous';
  const key = `workspace:${workspaceId}:session:${sessionId}:user:${userId}`;
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute
  const maxRequests = 15;

  let entry = notesCreationLimits[key];
  if (!entry || now >= entry.resetTime) {
    entry = { count: 0, resetTime: now + windowMs };
    notesCreationLimits[key] = entry;
  }

  entry.count++;
  if (entry.count > maxRequests) {
    res.status(429).json({
      success: false,
      error: 'Too many notes created. Please wait a moment before adding more notes.'
    });
    return false;
  }
  return true;
}

type Data = {
  success: boolean;
  error?: string;
  notes?: any[];
  note?: any;
};

export default withSessionRoute(handler);

export async function handler(req: NextApiRequest, res: NextApiResponse<Data>) {
  if (req.method === "POST") {
    if (!checkNotesCreationRateLimit(req, res)) return;
  }
  const { id, sid } = req.query;
  if (!id || !sid)
    return res
      .status(400)
      .json({ success: false, error: "Missing required fields" });

  const session = await prisma.session.findFirst({
    where: {
      id: sid as string,
      sessionType: {
        workspaceGroupId: parseInt(id as string),
      },
    },
  });

  if (!session) {
    return res.status(404).json({ success: false, error: "Session not found" });
  }

  if (req.method === "POST") {
    if (!validateCsrf(req, res)) {
      return res.status(403).json({
        success: false,
        error: "CSRF validation failed. Invalid origin or referer.",
      });
    }

    const userId = req.session?.userid;
    if (!userId) {
      return res.status(401).json({ success: false, error: "Not authenticated" });
    }

    const user = await prisma.user.findFirst({
      where: { userid: BigInt(userId) },
      include: {
        roles: {
          where: { workspaceGroupId: parseInt(id as string) },
        },
        workspaceMemberships: {
          where: { workspaceGroupId: parseInt(id as string) },
        },
      },
    });

    const membership = user?.workspaceMemberships[0];
    const isAdmin = membership?.isAdmin || false;
    const userPermissions = user?.roles[0]?.permissions || [];
    const sessionCategory = session.type?.toLowerCase() || 'other';
    const validTypes = ['shift', 'training', 'event', 'other'];
    const type = validTypes.includes(sessionCategory) ? sessionCategory : 'other';
    const hasNotesPermission = isAdmin || 
      userPermissions.includes(`sessions_${type}_notes`) || 
      userPermissions.includes('admin');

    if (!hasNotesPermission) {
      return res.status(403).json({ 
        success: false, 
        error: "You do not have permission to add notes to this session" 
      });
    }
  }

  if (req.method === "GET") {
    try {
      const notes = await prisma.sessionNote.findMany({
        where: {
          sessionId: sid as string,
        },
        include: {
          author: {
            select: {
              userid: true,
              username: true,
              picture: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      return res.status(200).json({
        success: true,
        notes: JSON.parse(
          JSON.stringify(notes, (key, value) =>
            typeof value === "bigint" ? value.toString() : value
          )
        ),
      });
    } catch (error) {
      console.error("Failed to fetch notes:", error);
      return res
        .status(500)
        .json({ success: false, error: "Failed to fetch notes" });
    }
  }

  if (req.method === "POST") {
    const { content } = req.body;
    if (!content || !content.trim()) {
      return res
        .status(400)
        .json({ success: false, error: "Note content is required" });
    }

    try {
      const note = await prisma.sessionNote.create({
        data: {
          sessionId: sid as string,
          authorId: BigInt(req.session.userid),
          content: content.trim(),
        },
        include: {
          author: {
            select: {
              userid: true,
              username: true,
              picture: true,
            },
          },
        },
      });

      return res.status(200).json({
        success: true,
        note: JSON.parse(
          JSON.stringify(note, (key, value) =>
            typeof value === "bigint" ? value.toString() : value
          )
        ),
      });
    } catch (error) {
      console.error("Failed to create note:", error);
      return res
        .status(500)
        .json({ success: false, error: "Failed to create note" });
    }
  }

  return res.status(405).json({ success: false, error: "Method not allowed" });
}
