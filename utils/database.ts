import {
  PrismaClient,
  role,
  workspace,
  user,
  Session,
  SessionType,
  schedule,
  ActivitySession,
  document,
  wallPost,
  inactivityNotice,
  sessionUser,
  Quota,
  Ally,
  allyVisit,
  RoleMember,
  AuthSession,
} from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

declare global {
  var prisma: PrismaClient | undefined;
}

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

const prisma =
  globalThis.prisma ??
  new PrismaClient({
    adapter,
  });

if (process.env.NODE_ENV !== "production") {
  globalThis.prisma = prisma;
}

(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};

export type {
  role,
  workspace,
  user,
  Session,
  SessionType,
  schedule,
  ActivitySession,
  document,
  wallPost,
  inactivityNotice,
  sessionUser,
  Quota,
  Ally,
  allyVisit,
  RoleMember,
  AuthSession,
};

export default prisma;
