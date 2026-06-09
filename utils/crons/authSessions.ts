import prisma from "@/utils/database";

export async function runSessionCron() {
  const result = await prisma.authSession.deleteMany({
    where: {
      expiresAt: {
        lte: new Date(),
      },
    },
  });

  return {
    success: true,
    deleted: result.count,
  };
}