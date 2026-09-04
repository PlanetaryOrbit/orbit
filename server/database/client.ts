import postgres from '@prisma/orm-postgres/runtime';

import type { Contract } from '../../prisma/contract.d';
import contractJson from '../../prisma/contract.json' with { type: 'json' };

const globalForPrisma = globalThis as typeof globalThis & {
  db?: ReturnType<typeof createDatabase>;
};

function createDatabase() {
  return postgres<Contract>({
    contractJson,
    url: process.env.DATABASE_URL,
  });
}

export const db = globalForPrisma.db ?? createDatabase();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.db = db;
}
