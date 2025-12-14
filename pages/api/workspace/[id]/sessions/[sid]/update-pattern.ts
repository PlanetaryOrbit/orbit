import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/utils/database";
import { withPermissionCheck } from "@/utils/permissionsManager";

type Data = {
  success: boolean;
  error?: string;
  updatedCount?: number;
};

export default withPermissionCheck(handler, "manage_sessions");

export async function handler(req: NextApiRequest, res: NextApiResponse<Data>) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  const { sid } = req.query;
  const { updateScope, newDate, newTime, newDuration, newName } = req.body;

  if (!updateScope || !["single", "future", "all"].includes(updateScope)) {
    return res.status(400).json({ 
      success: false, 
      error: "Invalid or missing updateScope. Must be 'single', 'future', or 'all'" 
    });
  }

  try {
    const originalSession = await prisma.session.findUnique({
      where: { id: sid as string },
      include: { schedule: true },
    });

    if (!originalSession) {
      return res.status(404).json({ success: false, error: "Session not found" });
    }

    let updatedCount = 0;

    if (updateScope === "single") {
      const updateData: any = {};
      if (newDate) updateData.date = new Date(newDate);
      if (newTime) {
        const [hours, minutes] = newTime.split(":").map(Number);
        const date = updateData.date || new Date(originalSession.date);
        date.setHours(hours, minutes, 0, 0);
        updateData.date = date;
      }
      if (newDuration !== undefined) updateData.duration = newDuration;
      if (newName !== undefined) updateData.name = newName;

      await prisma.session.update({
        where: { id: sid as string },
        data: updateData,
      });
      updatedCount = 1;

      await prisma.sessionLog.create({
        data: {
          sessionId: sid as string,
          actorId: BigInt(req.session.userid),
          action: "session_updated",
          metadata: {
            updateScope: "single",
            changes: updateData,
          },
        },
      });
    } else if (updateScope === "future") {
      if (!originalSession.scheduleId) {
        return res.status(400).json({ 
          success: false, 
          error: "This session is not part of a recurring pattern" 
        });
      }

      const originalDate = new Date(originalSession.date);
      const dayOfWeek = originalDate.getDay();
      const sessionsToUpdate = await prisma.session.findMany({
        where: {
          scheduleId: originalSession.scheduleId,
          date: {
            gte: originalDate,
          },
        },
      });

      const filteredSessions = sessionsToUpdate.filter(s => new Date(s.date).getDay() === dayOfWeek);

      if (filteredSessions.length > 0) {
        if (newTime) {
          const [hours, minutes] = newTime.split(":").map(Number);
          
          for (const session of filteredSessions) {
            const sessionDate = new Date(session.date);
            sessionDate.setHours(hours, minutes, 0, 0);
            
            const updateData: any = { date: sessionDate };
            if (newDuration !== undefined) updateData.duration = newDuration;
            if (newName !== undefined) updateData.name = newName;
            
            await prisma.session.update({
              where: { id: session.id },
              data: updateData,
            });
          }
          updatedCount = filteredSessions.length;
        } else {
          const updateData: any = {};
          if (newDuration !== undefined) updateData.duration = newDuration;
          if (newName !== undefined) updateData.name = newName;
          
          const result = await prisma.session.updateMany({
            where: { id: { in: filteredSessions.map(s => s.id) } },
            data: updateData,
          });
          updatedCount = result.count;
        }
      }

      await prisma.sessionLog.create({
        data: {
          sessionId: sid as string,
          actorId: BigInt(req.session.userid),
          action: "session_pattern_updated",
          metadata: {
            updateScope: "future",
            patternId: originalSession.scheduleId,
            dayOfWeek: dayOfWeek,
            affectedCount: updatedCount,
            newTime: newTime,
            newDuration: newDuration,
            newName: newName,
          },
        },
      });
    } else if (updateScope === "all") {
      if (!originalSession.scheduleId) {
        return res.status(400).json({ 
          success: false, 
          error: "This session is not part of a recurring pattern" 
        });
      }

      if (newTime) {
        const [hours, minutes] = newTime.split(":").map(Number);
        const allSessions = await prisma.session.findMany({
          where: { scheduleId: originalSession.scheduleId },
        });

        for (const session of allSessions) {
          const sessionDate = new Date(session.date);
          sessionDate.setHours(hours, minutes, 0, 0);
          
          const updateData: any = { date: sessionDate };
          if (newDuration !== undefined) updateData.duration = newDuration;
          if (newName !== undefined) updateData.name = newName;
          
          await prisma.session.update({
            where: { id: session.id },
            data: updateData,
          });
        }
        updatedCount = allSessions.length;
      } else {
        const updateData: any = {};
        if (newDuration !== undefined) updateData.duration = newDuration;
        if (newName !== undefined) updateData.name = newName;
        
        const result = await prisma.session.updateMany({
          where: { scheduleId: originalSession.scheduleId },
          data: updateData,
        });
        updatedCount = result.count;
      }

      await prisma.sessionLog.create({
        data: {
          sessionId: sid as string,
          actorId: BigInt(req.session.userid),
          action: "session_pattern_updated",
          metadata: {
            updateScope: "all",
            patternId: originalSession.scheduleId,
            affectedCount: updatedCount,
            newTime: newTime,
            newDuration: newDuration,
            newName: newName,
          },
        },
      });
    }

    res.status(200).json({ 
      success: true, 
      updatedCount 
    });
  } catch (error) {
    console.error("Error updating session pattern:", error);
    res.status(500).json({ 
      success: false, 
      error: "Failed to update session pattern" 
    });
  }
}
