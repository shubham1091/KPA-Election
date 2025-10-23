# API Setup Guide

This guide will help you set up and run the API server.

## Prerequisites

- Node.js (v18 or higher)
- A PostgreSQL database (local or cloud like Neon)

## Quick Start

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment variables:**
   ```bash
   npm run setup-env
   ```
   This will guide you through creating a `.env` file with the required configuration.

3. **Test your database connection:**
   ```bash
   npm run test-db
   ```

4. **Set up the database:**
   ```bash
   npm run db:push
   ```

5. **Create an admin user:**
   ```bash
   npm run create-admin
   ```

6. **Start the development server:**
   ```bash
   npm run dev
   ```

## Environment Variables

The API requires the following environment variables in a `.env` file:

- `DATABASE_URL`: PostgreSQL connection string
- `PORT`: Server port (default: 5001)
- `CLIENT_URL`: Frontend URL for CORS (default: http://localhost:3000)
- `JWT_SECRET`: Secret key for JWT authentication (optional)

### Example .env file:
```env
DATABASE_URL=postgresql://user:password@host/database
PORT=5001
CLIENT_URL=http://localhost:3000
JWT_SECRET=your-secret-key-here
```

## Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run setup-env` - Interactive environment setup
- `npm run test-db` - Test database connection
- `npm run clear-db` - Clear all database data
- `npm run create-admin` - Create an admin user
- `npm run db:push` - Push database schema changes
- `npm run db:studio` - Open Drizzle Studio (database GUI)

## Database Setup

### Using Neon (Cloud Database)
1. Create a Neon account and project
2. Copy the connection string from your Neon dashboard
3. Use the connection string as your `DATABASE_URL`

### Using Local PostgreSQL
1. Install PostgreSQL locally
2. Create a database
3. Use connection string: `postgresql://postgres:password@localhost:5432/your_database`

## Troubleshooting

### Database Connection Issues
- Ensure your `DATABASE_URL` is correctly formatted
- Check that your database is running and accessible
- Verify network connectivity for cloud databases

### Script Not Working
- Make sure you have a `.env` file with `DATABASE_URL` set
- Check that all dependencies are installed (`npm install`)
- Ensure your database is accessible

## API Endpoints

The API provides the following main endpoints:
- `/api/auth/*` - Authentication routes
- `/api/admin/*` - Admin management routes
- `/api/results/*` - Election results routes
- `/api/submit-ballot` - Ballot submission endpoint
