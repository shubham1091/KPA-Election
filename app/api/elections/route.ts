import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { elections } from '@/lib/schema'
import { desc } from 'drizzle-orm'

export async function GET() {
  try {
    const allElections = await db
      .select()
      .from(elections)
      .orderBy(desc(elections.createdAt))

    return NextResponse.json(allElections)
  } catch (error) {
    console.error('Error fetching elections:', error)
    return NextResponse.json(
      { error: 'Failed to fetch elections', details: error.message },
      { status: 500 }
    )
  }
}

