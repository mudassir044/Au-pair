
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface Match {
  id: string
  email: string
  role: string
  matchScore: number
  auPairProfile?: {
    firstName: string
    lastName: string
    bio?: string
    languages?: string
    preferredCountries?: string
    profilePhotoUrl?: string
  }
  hostFamilyProfile?: {
    familyName: string
    contactPersonName: string
    bio?: string
    location: string
    country: string
    numberOfChildren: number
    preferredLanguages?: string
    profilePhotoUrl?: string
  }
}

export default function MatchesPage() {
  const [matches, setMatches] = useState<Match[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [sentRequests, setSentRequests] = useState<Set<string>>(new Set())
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
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setMatches(data.matches || [])
      } else if (response.status === 401) {
        localStorage.removeItem('accessToken')
        router.push('/auth/login')
      } else {
        setError('Failed to load matches')
      }
    } catch (error) {
      console.error('Failed to fetch matches:', error)
      setError('Failed to connect to server')
    } finally {
      setLoading(false)
    }
  }

  const sendMatchRequest = async (targetUserId: string) => {
    const token = localStorage.getItem('accessToken')
    if (!token) return

    // Optimistically add to sent requests
    setSentRequests(prev => new Set([...prev, targetUserId]))

    try {
      const response = await fetch('http://localhost:8001/api/matches', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          targetUserId,
          notes: 'Interested in connecting!'
        })
      })

      if (response.ok) {
        // Keep the button disabled - request was sent successfully
      } else {
        const data = await response.json()
        // Remove from sent requests if failed
        setSentRequests(prev => {
          const newSet = new Set(prev)
          newSet.delete(targetUserId)
          return newSet
        })
        alert(`Failed to send match request: ${data.message}`)
      }
    } catch (error) {
      // Remove from sent requests if failed
      setSentRequests(prev => {
        const newSet = new Set(prev)
        newSet.delete(targetUserId)
        return newSet
      })
      alert('Failed to send match request')
    }
  }

  if (loading) {
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
                <h1 className="text-xl font-semibold">Find Matches</h1>
              </div>
            </div>
          </div>
        </nav>
        <div className="flex items-center justify-center py-12">
          <div className="text-xl text-gray-600">Loading matches...</div>
        </div>
      </div>
    )
  }

  if (error) {
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
                <h1 className="text-xl font-semibold">Find Matches</h1>
              </div>
            </div>
          </div>
        </nav>
        <div className="text-center py-12">
          <div className="text-red-600 mb-4">{error}</div>
          <button 
            onClick={() => window.location.reload()}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
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
              <h1 className="text-xl font-semibold">Find Matches</h1>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {matches.length === 0 ? (
          <div className="text-center py-12">
            <div className="bg-white rounded-lg shadow-sm p-8">
              <h2 className="text-2xl font-semibold text-gray-600 mb-4">No matches found</h2>
              <p className="text-gray-500 mb-6">
                Complete your profile and try again later, or check back as more users join the platform!
              </p>
              <button 
                onClick={() => router.push('/profile/edit')}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
              >
                Complete Profile
              </button>
            </div>
          </div>
        ) : (
          <div>
            <div className="mb-6">
              <p className="text-gray-600">Found {matches.length} potential matches</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {matches.map((match) => {
                const isAuPair = match.role === 'AU_PAIR'
                const profile = isAuPair ? match.auPairProfile : match.hostFamilyProfile
                
                return (
                  <div key={match.id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
                    {/* Profile Photo */}
                    <div className="h-48 bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center">
                      {profile?.profilePhotoUrl ? (
                        <img 
                          src={profile.profilePhotoUrl} 
                          alt="Profile" 
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="text-white text-6xl font-bold">
                          {isAuPair 
                            ? `${match.auPairProfile?.firstName?.[0] || ''}${match.auPairProfile?.lastName?.[0] || ''}`
                            : match.hostFamilyProfile?.familyName?.[0] || ''}
                        </div>
                      )}
                    </div>
                    
                    {/* Profile Info */}
                    <div className="p-6">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">
                            {isAuPair 
                              ? `${match.auPairProfile?.firstName || ''} ${match.auPairProfile?.lastName || ''}`.trim()
                              : match.hostFamilyProfile?.familyName || 'Host Family'}
                          </h3>
                          <p className="text-sm text-gray-500">
                            {isAuPair ? 'Au Pair' : 'Host Family'}
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="bg-green-100 text-green-800 text-xs font-semibold px-2 py-1 rounded-full">
                            {match.matchScore}% match
                          </div>
                        </div>
                      </div>

                      {/* Location */}
                      {match.hostFamilyProfile?.location && (
                        <div className="mb-3">
                          <p className="text-sm text-gray-600">
                            📍 {match.hostFamilyProfile.location}, {match.hostFamilyProfile.country}
                          </p>
                        </div>
                      )}

                      {/* Children info for host families */}
                      {match.hostFamilyProfile && (
                        <div className="mb-3">
                          <p className="text-sm text-gray-600">
                            👨‍👩‍👧‍👦 {match.hostFamilyProfile.numberOfChildren} children
                          </p>
                        </div>
                      )}

                      {/* Languages */}
                      <div className="mb-3">
                        {isAuPair && match.auPairProfile?.languages && (
                          <div className="flex flex-wrap gap-1">
                            {JSON.parse(match.auPairProfile.languages).slice(0, 3).map((lang: string, index: number) => (
                              <span key={index} className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                                {lang}
                              </span>
                            ))}
                          </div>
                        )}
                        {match.hostFamilyProfile?.preferredLanguages && (
                          <div className="flex flex-wrap gap-1">
                            {JSON.parse(match.hostFamilyProfile.preferredLanguages).slice(0, 3).map((lang: string, index: number) => (
                              <span key={index} className="bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded">
                                {lang}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Bio */}
                      {profile?.bio && (
                        <div className="mb-4">
                          <p className="text-sm text-gray-600 line-clamp-3">
                            {profile.bio.length > 100 ? `${profile.bio.substring(0, 100)}...` : profile.bio}
                          </p>
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div className="flex gap-2">
                        <button 
                          onClick={() => sendMatchRequest(match.id)}
                          disabled={sentRequests.has(match.id)}
                          className={`flex-1 py-2 px-4 rounded-lg transition-colors text-sm font-medium ${
                            sentRequests.has(match.id) 
                              ? 'bg-green-100 text-green-800 cursor-not-allowed' 
                              : 'bg-blue-600 text-white hover:bg-blue-700'
                          }`}
                        >
                          {sentRequests.has(match.id) ? 'Request Sent' : 'Send Request'}
                        </button>
                        <button className="flex-1 bg-gray-100 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium">
                          View Profile
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
