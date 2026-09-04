import 'dotenv/config';
import { defineConfig as definePostgresConfig } from '@prisma/orm-postgres/config';
import { definePrismaConfig } from 'prisma/config';

export default definePrismaConfig({
  orm: definePostgresConfig({
    contract: './prisma/contract.ts',
    db: {
      connection: process.env.DATABASE_URL!,
    },
  }),
});
