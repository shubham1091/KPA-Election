// Setup database schema for the election system
require('dotenv').config();
const { neon } = require('@neondatabase/serverless');

async function setupDatabase() {
  try {
    console.log('🔧 Setting up election database schema...');
    
    const sql = neon(process.env.DATABASE_URL);
    
    // Enable pgcrypto extension for UUID generation
    await sql`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`;
    console.log('✅ pgcrypto extension enabled');
    
    // Create admins table
    await sql`
      CREATE TABLE IF NOT EXISTS admins (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        full_name VARCHAR(200) NOT NULL,
        email VARCHAR(320) NOT NULL UNIQUE,
        password_hash TEXT,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `;
    console.log('✅ admins table created');
    
    // Create elections table
    await sql`
      CREATE TABLE IF NOT EXISTS elections (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title VARCHAR(300) NOT NULL,
        description TEXT,
        starts_at TIMESTAMP,
        ends_at TIMESTAMP,
        status VARCHAR(20) NOT NULL DEFAULT 'draft',
        created_by UUID REFERENCES admins(id),
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
        config JSON
      )
    `;
    console.log('✅ elections table created');
    
    // Create positions table
    await sql`
      CREATE TABLE IF NOT EXISTS positions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        election_id UUID NOT NULL REFERENCES elections(id),
        name VARCHAR(200) NOT NULL,
        description TEXT,
        seats INTEGER NOT NULL DEFAULT 1,
        sort_order INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `;
    console.log('✅ positions table created');
    
    // Create candidates table
    await sql`
      CREATE TABLE IF NOT EXISTS candidates (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        election_id UUID NOT NULL REFERENCES elections(id),
        position_id UUID NOT NULL REFERENCES positions(id),
        display_name VARCHAR(200) NOT NULL,
        manifesto_link TEXT,
        nominated_at TIMESTAMP DEFAULT NOW() NOT NULL,
        withdrawn BOOLEAN NOT NULL DEFAULT FALSE
      )
    `;
    console.log('✅ candidates table created');
    
    // Create voters table
    await sql`
      CREATE TABLE IF NOT EXISTS voters (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        election_id UUID NOT NULL REFERENCES elections(id),
        full_name VARCHAR(200),
        student_id VARCHAR(100),
        email VARCHAR(320),
        token_hash TEXT NOT NULL,
        token_fingerprint VARCHAR(64),
        real_token TEXT NOT NULL,
        prefilled_url TEXT,
        token_used_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `;
    console.log('✅ voters table created');
    
    // Create ballots table
    await sql`
      CREATE TABLE IF NOT EXISTS ballots (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        election_id UUID NOT NULL REFERENCES elections(id),
        submitted_at TIMESTAMP DEFAULT NOW() NOT NULL,
        meta JSON
      )
    `;
    console.log('✅ ballots table created');
    
    // Create ballot_rankings table
    await sql`
      CREATE TABLE IF NOT EXISTS ballot_rankings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        ballot_id UUID NOT NULL REFERENCES ballots(id),
        position_id UUID NOT NULL REFERENCES positions(id),
        candidate_id UUID NOT NULL REFERENCES candidates(id),
        rank INTEGER NOT NULL
      )
    `;
    console.log('✅ ballot_rankings table created');
    
    // Create count_jobs table
    await sql`
      CREATE TABLE IF NOT EXISTS count_jobs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        election_id UUID NOT NULL REFERENCES elections(id),
        position_id UUID NOT NULL REFERENCES positions(id),
        started_by UUID REFERENCES admins(id),
        method VARCHAR(50) NOT NULL DEFAULT 'STV',
        seed TEXT,
        started_at TIMESTAMP DEFAULT NOW() NOT NULL,
        finished_at TIMESTAMP,
        status VARCHAR(20) NOT NULL DEFAULT 'running',
        result_summary JSON
      )
    `;
    console.log('✅ count_jobs table created');
    
    // Create count_events table
    await sql`
      CREATE TABLE IF NOT EXISTS count_events (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        job_id UUID NOT NULL REFERENCES count_jobs(id),
        round_number INTEGER NOT NULL,
        payload JSON NOT NULL,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `;
    console.log('✅ count_events table created');
    
    console.log('🎉 Database schema setup completed successfully!');
    
    // Test the schema by querying table names
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `;
    
    console.log('\n📋 Created tables:');
    tables.forEach(table => {
      console.log(`  - ${table.table_name}`);
    });
    
  } catch (error) {
    console.error('❌ Database setup failed:');
    console.error(error.message);
  }
}

setupDatabase();
