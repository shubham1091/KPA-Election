import React from 'react'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
	// This is a nested layout — do NOT render <html> or <body> here.
	// The root `app/layout.tsx` provides the document shell and body classes.
	// Keep the admin layout minimal to avoid hydration mismatches.
	return <>{children}</>
}
