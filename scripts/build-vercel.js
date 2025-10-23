#!/usr/bin/env node

/**
 * Vercel Single-Project Build Script
 * 
 * This script builds all apps and combines them into a single dist directory
 * for deployment as ONE Vercel project with path-based routing:
 * 
 * - yourdomain.com/       → Voter app
 * - yourdomain.com/admin  → Admin app  
 * - yourdomain.com/api    → API (serverless functions)
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Building KPA-Election for Vercel (Single Project)...\n');

// Helper to run commands
function run(command, description) {
  console.log(`📦 ${description}...`);
  try {
    execSync(command, { stdio: 'inherit' });
    console.log(`✅ ${description} complete\n`);
  } catch (error) {
    console.error(`❌ ${description} failed`);
    process.exit(1);
  }
}

// Helper to copy directory recursively
function copyDir(src, dest) {
  if (!fs.existsSync(src)) {
    console.warn(`⚠️  Source directory not found: ${src}`);
    return;
  }
  
  fs.mkdirSync(dest, { recursive: true });
  
  const entries = fs.readdirSync(src, { withFileTypes: true });
  
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// 1. Clean previous build
console.log('🧹 Cleaning previous build...\n');
if (fs.existsSync('dist')) {
  fs.rmSync('dist', { recursive: true, force: true });
}
if (fs.existsSync('api')) {
  fs.rmSync('api', { recursive: true, force: true });
}

// 2. Build all apps with Turbo
run('npx turbo run build', 'Building all apps with Turborepo');

// 3. Create dist directory structure
console.log('📁 Creating unified dist directory...\n');
fs.mkdirSync('dist', { recursive: true });
fs.mkdirSync('dist/admin', { recursive: true });
fs.mkdirSync('dist/voter', { recursive: true });

// 4. Copy voter app to dist/voter (also root since it's the default)
console.log('📋 Copying Voter app...');
if (fs.existsSync('apps/voter/dist')) {
  copyDir('apps/voter/dist', 'dist/voter');
  // Also copy to root for default route
  copyDir('apps/voter/dist', 'dist');
  console.log('✅ Voter app copied\n');
} else {
  console.error('❌ Voter build not found at apps/voter/dist');
  process.exit(1);
}

// 5. Copy admin app to dist/admin
console.log('📋 Copying Admin app...');
if (fs.existsSync('apps/admin/dist')) {
  copyDir('apps/admin/dist', 'dist/admin');
  console.log('✅ Admin app copied\n');
} else {
  console.error('❌ Admin build not found at apps/admin/dist');
  process.exit(1);
}

// 6. Set up API as Vercel serverless functions
console.log('📋 Setting up API serverless functions...');
if (fs.existsSync('apps/api/dist')) {
  fs.mkdirSync('api', { recursive: true });
  
  // Copy API dist
  copyDir('apps/api/dist', 'api');
  
  // Copy node_modules (needed for serverless)
  if (fs.existsSync('apps/api/node_modules')) {
    copyDir('apps/api/node_modules', 'api/node_modules');
  }
  
  // Copy package.json
  if (fs.existsSync('apps/api/package.json')) {
    fs.copyFileSync('apps/api/package.json', 'api/package.json');
  }
  
  console.log('✅ API copied\n');
} else {
  console.error('❌ API build not found at apps/api/dist');
  process.exit(1);
}

// 7. Update base paths in built files (if needed for routing)
console.log('🔧 Configuring routes...');

// Update admin index.html to use /admin base
const adminIndexPath = 'dist/admin/index.html';
if (fs.existsSync(adminIndexPath)) {
  let adminHtml = fs.readFileSync(adminIndexPath, 'utf8');
  // Update asset paths to be relative to /admin
  adminHtml = adminHtml.replace(/src="\//g, 'src="/admin/');
  adminHtml = adminHtml.replace(/href="\//g, 'href="/admin/');
  // Add base tag
  adminHtml = adminHtml.replace('<head>', '<head>\n  <base href="/admin/">');
  fs.writeFileSync(adminIndexPath, adminHtml);
}

console.log('✅ Routes configured\n');

// 8. Create _redirects file for SPA routing
console.log('🔧 Creating redirects...');
const redirects = `
# Admin SPA
/admin/* /admin/index.html 200

# Voter SPA (default)
/* /voter/index.html 200
`;
fs.writeFileSync('dist/_redirects', redirects.trim());
console.log('✅ Redirects created\n');

// Summary
console.log('═══════════════════════════════════════\n');
console.log('✅ Build complete!\n');
console.log('📦 Output structure:');
console.log('   dist/');
console.log('   ├── admin/      → Admin dashboard');
console.log('   ├── voter/      → Voter interface');
console.log('   └── (root)      → Voter interface (default)\n');
console.log('   api/            → API serverless functions\n');
console.log('🌐 URL structure:');
console.log('   /               → Voter app');
console.log('   /admin          → Admin app');
console.log('   /api/*          → API endpoints\n');
console.log('═══════════════════════════════════════\n');
console.log('🚀 Ready to deploy to Vercel!\n');

