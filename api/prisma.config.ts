import { defineConfig, env } from 'prisma/config';

// DATABASE_URL is injected by the platform (Vercel) in production.
// For local development, set it in your shell or a .env file loaded
// externally (e.g. `export DATABASE_URL=...` before running prisma commands).
export default defineConfig({
  schema: '../db/schema.prisma',
  migrations: {
    path: '../db/migrations',
  },
  datasource: {
    url: env('DATABASE_URL'),
  },
});
