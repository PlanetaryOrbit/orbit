import { PrismaClient, role, workspace, user, Session, SessionType, schedule, ActivitySession, document, wallPost, inactivityNotice, sessionUser, Quota, Ally, allyVisit, RoleMember } from "@prisma/client";
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

declare global {
    var prisma: PrismaClient;
    var pgPool: Pool;
}

const pool = globalThis.pgPool || new Pool({
    connectionString: process.env.DATABASE_URL,
});

if (process.env.NODE_ENV === 'development') globalThis.pgPool = pool;

const adapter = new PrismaPg(pool);
const prisma = globalThis.prisma || new PrismaClient({ adapter });

if (process.env.NODE_ENV === 'development') globalThis.prisma = prisma

export type { role, workspace, user, Session, SessionType, schedule, ActivitySession, document, wallPost, inactivityNotice, sessionUser, Quota, Ally, allyVisit, RoleMember };
export default prisma;