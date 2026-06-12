import prisma from "@/utils/database";

export async function runPendingVerificationCron() {
  const result = await prisma.pendingVerification.deleteMany({
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