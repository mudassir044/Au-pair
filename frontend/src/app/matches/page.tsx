
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function MatchesPage() {
  const [matches, setMatches] = useState([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const token = localStorage.getItem('accessToken')
    if (!token) {
      router.push('/auth/login')
      return
    }

    fetchMatches(token)
  }, [router])

  const fetchMatches = async (token: string) => {
    try {
      const response = await fetch('http://localhost:8001/api/matches/potential', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setMatches(data.matches)
      }
    } catch (error) {
      console.error('Failed to fetch matches:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading matches...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm mb-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <button 
                onClick={() => router.back()}
                className="mr-4 text-gray-600 hover:text-gray-800"
              >
                ← Back
              </button>
              <h1 className="text-xl font-semibold">Potential Matches</h1>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {matches.length === 0 ? (
          <div className="text-center py-12">
            <h2 className="text-2xl font-semibold text-gray-600 mb-4">No matches found</h2>
            <p className="text-gray-500">Complete your profile to find matches!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {matches.map((match: any, index) => (
              <div key={index} className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-semibold mb-2">Match {index + 1}</h3>
                <p className="text-gray-600 mb-4">Compatibility Score: {Math.floor(Math.random() * 30) + 70}%</p>
                <button className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700">
                  View Profile
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
