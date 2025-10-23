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
  if (dbInstance) return dbInstance;
  
  // Check if DATABASE_URL is set
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is not set! Please configure it in your Vercel project settings.');
  }

  // Determine if we're using Neon (cloud) or local PostgreSQL
  const isNeon = process.env.DATABASE_URL.includes('neon.tech') || 
                 process.env.DATABASE_URL.includes('neon.xyz') ||
                 process.env.DATABASE_URL.includes('neon');

  if (isNeon) {
    // Use Neon serverless connection
    console.log('🔗 Using Neon serverless connection');
    try {
      const sql = neon(process.env.DATABASE_URL);
      dbInstance = drizzleNeon(sql);
    } catch (error) {
      console.error('❌ Neon connection failed:', error instanceof Error ? error.message : 'Unknown error');
      console.log('🔄 Falling back to traditional PostgreSQL connection...');
      const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
      });
      dbInstance = drizzle(pool);
    }
  } else {
    // Use traditional PostgreSQL connection
    console.log('🔗 Using traditional PostgreSQL connection');
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });
    dbInstance = drizzle(pool);
  }
  
  return dbInstance;
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
