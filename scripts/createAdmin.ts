import * as readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { config } from 'dotenv';
import path from 'path';
import { db } from '../lib/db';
import { admins } from '../lib/schema';
import bcrypt from 'bcrypt';

// Load environment variables
config({ path: path.resolve(__dirname, '../.env.local') });

async function createAdmin() {
  try {
    console.log('\n🔐 Create Admin User\n');

    // Check for command-line arguments first
    let username = process.argv[2];
    let password = process.argv[3];

    // If not provided via args, use interactive mode
    if (!username || !password) {
      const rl = readline.createInterface({ input, output });
      
      username = await rl.question('Enter username: ');
      password = await rl.question('Enter password: ');
      
      rl.close();
    }

    if (!username || !password) {
      console.error('❌ Username and password are required');
      console.error('   Usage: npm run create-admin [username] [password]');
      process.exit(1);
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await db.insert(admins).values({
      username,
      password: hashedPassword,
    });

    console.log('\n✅ Admin user created successfully!');
    console.log(`   Username: ${username}`);
    console.log('\n🎉 You can now login at /admin\n');

  } catch (error) {
    console.error('\n❌ Error creating admin:', error instanceof Error ? error.message : 'Unknown error');
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

createAdmin();

