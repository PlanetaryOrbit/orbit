import prisma from "@/utils/database";

export async function runOAuthCron() {
  const result = await prisma.oAuthState.deleteMany({
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