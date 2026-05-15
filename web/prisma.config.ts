import path from 'node:path';
import dotenv from 'dotenv';
import { defineConfig } from 'prisma/config';

// Load from .env.local (Next.js convention) instead of .env
dotenv.config({ path: path.resolve(__dirname, '.env.local') });

const datasourceUrl = process.env['DATABASE_URL'];

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: datasourceUrl
    ? {
        url: datasourceUrl,
      }
    : undefined,
});
