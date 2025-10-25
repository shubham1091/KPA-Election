import { NextResponse } from 'next/server'

// Minimal placeholder GET handler for the events stream route.
// This file was empty which caused TypeScript/Next.js to treat it as "not a module".
// If you need real server-sent events here, we can replace this with a ReadableStream
// implementation that pushes events.

export async function GET() {
	// Respond with a simple JSON to satisfy module typing and keep dev server happy.
	return NextResponse.json({ ok: true })
}
