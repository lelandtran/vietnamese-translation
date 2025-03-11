import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
    servername: 'aws-0-us-west-1.pooler.supabase.com'
  }
});

export const db = drizzle(pool, { schema });

// For queries that don't use Drizzle
export const queryPool = {
  query: (text: string, params?: any[]) => pool.query(text, params),
};

export default db;
