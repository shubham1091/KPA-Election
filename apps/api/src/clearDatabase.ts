#!/usr/bin/env tsx

/**
 * Database Clearing Script
 * 
 * This script clears all data from the database while preserving the schema.
 * Use this when you want to start fresh with a clean database.
 * 
 * Usage: npm run clear-db
 */

import { db } from './db'
import { 
  admins, 
  elections, 
  positions, 
  candidates, 
  voters, 
  ballots, 
  ballot_rankings, 
  count_jobs, 
  count_events 
} from './schema'

async function clearDatabase() {
  console.log('🗑️  Starting database cleanup...')
  
  try {
    // Delete in reverse dependency order to avoid foreign key constraints
    console.log('Deleting count events...')
    await db.delete(count_events)
    
    console.log('Deleting count jobs...')
    await db.delete(count_jobs)
    
    console.log('Deleting ballot rankings...')
    await db.delete(ballot_rankings)
    
    console.log('Deleting ballots...')
    await db.delete(ballots)
    
    console.log('Deleting voters...')
    await db.delete(voters)
    
    console.log('Deleting candidates...')
    await db.delete(candidates)
    
    console.log('Deleting positions...')
    await db.delete(positions)
    
    console.log('Deleting elections...')
    await db.delete(elections)
    
    console.log('Deleting admins...')
    await db.delete(admins)
    
    console.log('✅ Database cleared successfully!')
    console.log('💡 You may want to run "npm run create-admin" to create a default admin user.')
    
  } catch (error) {
    console.error('❌ Error clearing database:', error)
    process.exit(1)
  }
}

// Run the script
clearDatabase()
  .then(() => {
    console.log('🎉 Database clearing completed!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('💥 Database clearing failed:', error)
    process.exit(1)
  })

