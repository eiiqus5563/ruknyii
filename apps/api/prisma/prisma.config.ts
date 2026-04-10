import dotenv from 'dotenv';
import { defineConfig } from 'prisma/config';
import path from 'path';

const baseDir = __dirname;
dotenv.config({ path: path.join(baseDir, '..', '.env') });

export default defineConfig({
  schema: path.join(baseDir, 'schema.prisma'),
  migrations: {
    path: path.join(baseDir, 'migrations'),
  },
  datasource: {
    url: process.env.DATABASE_URL!,
  },
});
