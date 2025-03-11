import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';
import dotenv from 'dotenv';

dotenv.config();

const isProduction = process.env.NODE_ENV === 'production';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: isProduction ? {
    // In production, we need these specific SSL settings for Supabase's connection pooler
    rejectUnauthorized: false,
    servername: new URL(process.env.DATABASE_URL || '').hostname
  } : undefined
});

export const db = drizzle(pool, { schema });

// For queries that don't use Drizzle
export const queryPool = {
  query: (text: string, params?: any[]) => pool.query(text, params),
};

export default db;
