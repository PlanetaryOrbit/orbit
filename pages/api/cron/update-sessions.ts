import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/utils/database";

type Resp = {
  success: boolean;
  updatedStarted?: number;
  updatedEnded?: number;
  error?: string;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse<Resp>) {
  if (req.method !== "POST") return res.status(405).json({ success: false, error: "Method not allowed" });

  try {
    const now = new Date();
    const candidates = await prisma.session.findMany({
      where: {
        ended: null,
        date: {
          lte: now,
        },
      },
    });

    let updatedStarted = 0;
    let updatedEnded = 0;

    for (const s of candidates) {
      const duration = (s as any).duration || 30;
      const endTime = new Date(new Date(s.date).getTime() + duration * 60 * 1000);

      if (endTime <= now) {
        await prisma.session.update({ where: { id: s.id }, data: { ended: endTime } });
        updatedEnded++;
      } else {
        if (!s.startedAt) {
          await prisma.session.update({ where: { id: s.id }, data: { startedAt: s.date } });
          updatedStarted++;
        }
      }
    }

    return res.status(200).json({ success: true, updatedStarted, updatedEnded });
  } catch (e: any) {
    console.error("Cron update-sessions error:", e);
    return res.status(500).json({ success: false, error: String(e?.message || e) });
  }
}
