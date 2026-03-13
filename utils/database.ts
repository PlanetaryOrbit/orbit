import { PrismaClient, role, workspace, user, Session, SessionType, schedule, ActivitySession, document, wallPost, inactivityNotice, sessionUser, Quota, Ally, allyVisit, RoleMember } from "@prisma/client";
import { PrismaPg } from '@prisma/adapter-pg';

declare global {
  var prisma: PrismaClient;
}

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = globalThis.prisma || new PrismaClient({ adapter });

if (process.env.NODE_ENV === 'development') globalThis.prisma = prisma;

export type { role, workspace, user, Session, SessionType, schedule, ActivitySession, document, wallPost, inactivityNotice, sessionUser, Quota, Ally, allyVisit, RoleMember };
export default prisma;