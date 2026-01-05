// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/utils/database";
import { withPermissionCheck } from "@/utils/permissionsManager";
import { generateSessionTimeMessage } from "@/utils/sessionMessage";
import moment from "moment";
type Data = {
  success: boolean;
  error?: string;
};

export default withPermissionCheck(handler, "activity_adjustments");

export async function handler(req: NextApiRequest, res: NextApiResponse<Data>) {
  if (req.method !== "POST")
    return res
      .status(405)
      .json({ success: false, error: "Method not allowed" });
  if (!req.session.userid)
    return res.status(401).json({ success: false, error: "Not logged in" });
  if (!req.body.userId || !req.body.minutes)
    return res.status(400).json({ success: false, error: "Missing data" });

  try {
    const date = new Date();
    const sessionMessage = generateSessionTimeMessage("Manual Session", date);

    await prisma.activitySession.create({
      data: {
        userId: BigInt(req.body.userId as unknown as number),
        active: false,
        startTime: date,
        endTime: moment(date).add(parseInt(req.body.minutes), "m").toDate(),
        sessionMessage: sessionMessage,
        workspaceGroupId: parseInt(req.query.id as string),
      },
    });

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ success: false, error: "Something went wrong" });
  }
}
