import 'dotenv/config';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { drizzle as drizzleNeon } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';

// Check if DATABASE_URL is set
if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable is not set!');
  console.error('Please create a .env file with your database connection string.');
  console.error('Example: DATABASE_URL=postgresql://user:password@host/database');
  process.exit(1);
}

// Determine if we're using Neon (cloud) or local PostgreSQL
const isNeon = process.env.DATABASE_URL.includes('neon.tech') || 
               process.env.DATABASE_URL.includes('neon.xyz') ||
               process.env.DATABASE_URL.includes('neon');

let db: any;

if (isNeon) {
  // Use Neon serverless connection
  console.log('🔗 Using Neon serverless connection');
  try {
    const sql = neon(process.env.DATABASE_URL);
    db = drizzleNeon(sql);
  } catch (error: any) {
    console.error('❌ Neon connection failed:', error.message);
    console.log('🔄 Falling back to traditional PostgreSQL connection...');
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });
    db = drizzle(pool);
  }
} else {
  // Use traditional PostgreSQL connection
  console.log('🔗 Using traditional PostgreSQL connection');
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });
  db = drizzle(pool);
}

export { db };
export type DB = typeof db;
