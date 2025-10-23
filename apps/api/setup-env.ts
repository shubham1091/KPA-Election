#!/usr/bin/env tsx

/**
 * Environment Setup Script
 * 
 * This script helps you set up the required environment variables for the API.
 * Run this script to create a .env file with the necessary configuration.
 */

import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const envPath = path.join(__dirname, '.env');

console.log('🚀 API Environment Setup');
console.log('========================\n');

// Check if .env already exists
if (fs.existsSync(envPath)) {
  console.log('⚠️  .env file already exists!');
  rl.question('Do you want to overwrite it? (y/N): ', (answer) => {
    if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
      createEnvFile();
    } else {
      console.log('Setup cancelled.');
      rl.close();
    }
  });
} else {
  createEnvFile();
}

function createEnvFile() {
  console.log('\n📝 Please provide the following information:\n');
  
  rl.question('Database URL (postgresql://user:password@host/database): ', (databaseUrl) => {
    if (!databaseUrl) {
      console.log('❌ Database URL is required!');
      rl.close();
      return;
    }
    
    rl.question('Server Port (default: 5001): ', (port) => {
      rl.question('Client URL for CORS (default: http://localhost:3000): ', (clientUrl) => {
        rl.question('JWT Secret (optional): ', (jwtSecret) => {
          
          const envContent = `# Database Configuration
DATABASE_URL=${databaseUrl}

# Server Configuration
PORT=${port || '5001'}

# Client Configuration (for CORS)
CLIENT_URL=${clientUrl || 'http://localhost:3000'}

# Optional: JWT Secret for authentication
JWT_SECRET=${jwtSecret || 'your-secret-key-here'}
`;

          try {
            fs.writeFileSync(envPath, envContent);
            console.log('\n✅ .env file created successfully!');
            console.log('📁 Location:', envPath);
            console.log('\n🎉 You can now run the API scripts!');
            console.log('Try: npm run dev');
          } catch (error: any) {
            console.error('❌ Error creating .env file:', error.message);
          }
          
          rl.close();
        });
      });
    });
  });
}
