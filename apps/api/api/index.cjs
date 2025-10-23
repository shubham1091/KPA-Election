/**
 * Vercel Serverless Function Handler
 * This wraps the Express app for Vercel's serverless environment
 */

// Import the built Express server
const { createServer } = require('../dist/server.cjs');

// Create the Express app
const app = createServer();

// Export for Vercel
module.exports = app;

