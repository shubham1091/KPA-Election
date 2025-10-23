#!/usr/bin/env node

/**
 * Migration script to add prefilled_url column to existing voters table
 * Run this script to update existing databases with the new column
 */

import { Pool } from 'pg';
import 'dotenv/config';

const parseDatabaseUrl = (url) => {
  const parsed = new URL(url);
  
  // Determine if SSL is needed (for cloud databases like Neon, Supabase, etc.)
  const needsSSL = parsed.hostname !== 'localhost' && parsed.hostname !== '127.0.0.1';
  
  return {
    host: parsed.hostname,
    port: parseInt(parsed.port) || 5432,
    database: parsed.pathname.slice(1),
    user: parsed.username,
    password: parsed.password || '',
    ssl: needsSSL ? { rejectUnauthorized: false } : false,
    connectionTimeoutMillis: 5000,
  };
};

async function addPrefilledUrlColumn() {
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL environment variable is required');
    process.exit(1);
  }

  const pool = new Pool(parseDatabaseUrl(process.env.DATABASE_URL));
  
  try {
    console.log('🔄 Adding prefilled_url column to voters table...');
    
    // Add the prefilled_url column if it doesn't exist
    await pool.query(`
      ALTER TABLE voters 
      ADD COLUMN IF NOT EXISTS prefilled_url TEXT;
    `);
    
    console.log('✅ prefilled_url column added successfully');
    
    // Generate prefilled URLs for existing voters
    console.log('🔄 Generating prefilled URLs for existing voters...');
    
    const baseUrl = process.env.CLIENT_URL || 'http://localhost:3000';
    
    // First, get all voters that need URLs
    const votersResult = await pool.query(`
      SELECT id, election_id, real_token 
      FROM voters 
      WHERE prefilled_url IS NULL;
    `);
    
    if (votersResult.rows.length === 0) {
      console.log('✅ No voters need prefilled URLs generated');
    } else {
      // Update each voter individually to avoid parameter type issues
      let updatedCount = 0;
      for (const voter of votersResult.rows) {
        const prefilledUrl = `${baseUrl}/direct/${voter.election_id}/${voter.real_token}`;
        await pool.query(`
          UPDATE voters 
          SET prefilled_url = $1
          WHERE id = $2;
        `, [prefilledUrl, voter.id]);
        updatedCount++;
      }
      
      console.log(`✅ Generated ${updatedCount} prefilled URLs`);
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

addPrefilledUrlColumn();
