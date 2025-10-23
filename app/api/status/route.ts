import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({ 
    ok: true,
    message: 'KPA Election API is running',
    timestamp: new Date().toISOString()
  })
}

