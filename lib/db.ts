import 'dotenv/config';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { drizzle as drizzleNeon } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type { NeonHttpDatabase } from 'drizzle-orm/neon-http';

// Lazy database connection - only initialize when accessed
let dbInstance: NodePgDatabase | NeonHttpDatabase | null = null;

function getDatabase() {
  if (dbInstance) return dbInstance

  // Check if DATABASE_URL is set
  if (!process.env.DATABASE_URL) {
    throw new Error(
      'DATABASE_URL environment variable is not set! Please configure it in your Vercel project settings.'
    )
  }

  // Determine if DATABASE_URL looks like Neon. However, the Neon HTTP driver
  // (used via @neondatabase/serverless) behaves differently from a standard
  // pg Pool and can cause issues for some scripts (for example inserting
  // DEFAULT values). We'll use the neon HTTP driver only when explicitly
  // requested (USE_NEON_HTTP=true) or when running on Vercel (process.env.VERCEL).
  const isNeonUrl =
    process.env.DATABASE_URL.includes('neon.tech') ||
    process.env.DATABASE_URL.includes('neon.xyz') ||
    process.env.DATABASE_URL.includes('neon')

  const forceNeonHttp = process.env.USE_NEON_HTTP === 'true' || process.env.VERCEL === '1'

  if (isNeonUrl && forceNeonHttp) {
    // Use Neon serverless HTTP driver (for edge/serverless environments)
    console.log('🔗 Using Neon serverless HTTP connection (neon-http)')
    try {
      const sql = neon(process.env.DATABASE_URL)
      dbInstance = drizzleNeon(sql)
    } catch (error) {
      console.error(
        '❌ Neon HTTP connection failed:',
        error instanceof Error ? error.message : 'Unknown error'
      )
      console.log('🔄 Falling back to traditional PostgreSQL connection (pg Pool)...')
      const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      })
      dbInstance = drizzle(pool)
    }
  } else {
    // Use traditional PostgreSQL Pool for server-side scripts and local dev.
    console.log('🔗 Using traditional PostgreSQL connection (pg Pool)')
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    })
    dbInstance = drizzle(pool)
  }

  return dbInstance
}

// Create a proxy to make it work like before
const db = new Proxy({} as NodePgDatabase | NeonHttpDatabase, {
  get(target, prop) {
    const database = getDatabase();
    return database[prop as keyof (NodePgDatabase | NeonHttpDatabase)];
  }
});

export { db };
export type DB = typeof db;
