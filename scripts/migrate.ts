import { config } from 'dotenv';
import path from 'path';
import { neon } from '@neondatabase/serverless';

// Load environment variables
config({ path: path.resolve(__dirname, '../.env.local') });

async function runMigration() {
  const DATABASE_URL = process.env.DATABASE_URL;
  
  if (!DATABASE_URL) {
    console.error('❌ DATABASE_URL not found in .env.local');
    process.exit(1);
  }

  console.log('🔄 Connecting to database...');
  const sql = neon(DATABASE_URL);

  try {
    console.log('\n📝 Running migrations...\n');

    // Update admins table
    console.log('  → Renaming admins.email to admins.username...');
    await sql`ALTER TABLE admins RENAME COLUMN email TO username`;
    
    console.log('  → Renaming admins.password_hash to admins.password...');
    await sql`ALTER TABLE admins RENAME COLUMN password_hash TO password`;
    
    console.log('  → Removing admins.full_name...');
    await sql`ALTER TABLE admins DROP COLUMN IF EXISTS full_name`;
    
    console.log('  → Removing admins.created_at...');
    await sql`ALTER TABLE admins DROP COLUMN IF EXISTS created_at`;
    
    console.log('  → Adding admins.createdAt...');
    await sql`ALTER TABLE admins ADD COLUMN IF NOT EXISTS "createdAt" timestamp DEFAULT now() NOT NULL`;

    // Update elections table
    console.log('\n  → Renaming elections.title to elections.name...');
    await sql`ALTER TABLE elections RENAME COLUMN title TO name`;
    
    console.log('  → Renaming elections.starts_at to elections.startDate...');
    await sql`ALTER TABLE elections RENAME COLUMN starts_at TO "startDate"`;
    
    console.log('  → Renaming elections.ends_at to elections.endDate...');
    await sql`ALTER TABLE elections RENAME COLUMN ends_at TO "endDate"`;
    
    console.log('  → Renaming elections.created_by to elections.createdBy...');
    await sql`ALTER TABLE elections RENAME COLUMN created_by TO "createdBy"`;
    
    console.log('  → Renaming elections.created_at to elections.createdAt...');
    await sql`ALTER TABLE elections RENAME COLUMN created_at TO "createdAt"`;
    
    console.log('  → Renaming elections.updated_at to elections.updatedAt...');
    await sql`ALTER TABLE elections RENAME COLUMN updated_at TO "updatedAt"`;

    console.log('\n✅ Migration completed successfully!\n');
    
    // Verify
    console.log('📋 Verifying admins table schema:');
    const adminsColumns = await sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'admins'
      ORDER BY ordinal_position
    `;
    adminsColumns.forEach((col: { column_name: string; data_type: string }) => {
      console.log(`  - ${col.column_name}: ${col.data_type}`);
    });

    console.log('\n📋 Verifying elections table schema:');
    const electionsColumns = await sql`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'elections'
      ORDER BY ordinal_position
    `;
    electionsColumns.forEach((col: { column_name: string; data_type: string }) => {
      console.log(`  - ${col.column_name}: ${col.data_type}`);
    });

    process.exit(0);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    if (errorMessage.includes('column') && errorMessage.includes('does not exist')) {
      console.log('\n⚠️  Some columns already migrated or don\'t exist. Continuing...');
      console.log('   Error:', errorMessage);
    } else if (errorMessage.includes('already exists')) {
      console.log('\n⚠️  Column already exists. Skipping...');
      console.log('   Error:', errorMessage);
    } else {
      console.error('\n❌ Migration failed:', error);
      process.exit(1);
    }
  }
}

runMigration();

