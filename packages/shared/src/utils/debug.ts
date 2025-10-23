// Debug utilities for troubleshooting

export const testElectionCreation = async () => {
  try {
    console.log('Testing election creation...')
    
    // Test data
    const testElection = {
      title: 'Test Election',
      description: 'A test election for debugging',
      status: 'draft',
      created_by: 'test-admin-id' // This might be the issue
    }
    
    console.log('Test election data:', testElection)
    
    // Make the API call
    const response = await fetch('/api/elections', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testElection)
    })
    
    console.log('Response status:', response.status)
    console.log('Response headers:', response.headers)
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error('Error response:', errorText)
      throw new Error(`HTTP ${response.status}: ${errorText}`)
    }
    
    const data = await response.json()
    console.log('Success! Created election:', data)
    return data
  } catch (error) {
    console.error('Test failed:', error)
    throw error
  }
}

// Add to window for easy testing in browser console
if (typeof window !== 'undefined') {
  (window as any).testElectionCreation = testElectionCreation
}

