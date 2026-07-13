import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import pg from 'pg';

export const prisma = new PrismaClient({ log: ['error'] });

// Raw pool used specifically for: the Phase-9 transaction logic (needs explicit BEGIN/COMMIT/ROLLBACK
// and row locking that Prisma's high-level API can't express cleanly), views, and EXPLAIN ANALYZE.
export const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
