import bcrypt from 'bcrypt';
import { db } from './db';
import { admins } from './schema';
import { eq } from 'drizzle-orm';

async function createAdmin() {
  const email = 'admin@example.com';
  const password = 'admin123'; // Change this!
  
  try {
    // Check if admin already exists
    const existing = await db.select().from(admins).where(eq(admins.email, email));
    
    if (existing.length > 0) {
      console.log(`Admin already exists: ${email}`);
      process.exit(0);
      return;
    }
    
    const passwordHash = await bcrypt.hash(password, 10);
    
    await db.insert(admins).values({
      full_name: 'Admin User',
      email: email,
      password_hash: passwordHash,
    });
    
    console.log(`Admin created: ${email}`);
    process.exit(0);
  } catch (error: any) {
    console.error('Error creating admin:', error.message);
    process.exit(1);
  }
}

createAdmin();