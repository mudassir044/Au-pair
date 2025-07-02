
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function EditProfilePage() {
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const token = localStorage.getItem('accessToken')
    const userData = localStorage.getItem('user')
    
    if (!token || !userData) {
      router.push('/auth/login')
      return
    }

    setUser(JSON.parse(userData))
    fetchProfile(token)
  }, [router])

  const fetchProfile = async (token: string) => {
    try {
      const response = await fetch('http://localhost:8001/api/profiles/me', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setProfile(data.profile)
      }
    } catch (error) {
      console.error('Failed to fetch profile:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading profile...</div>
      </div>
    )
  }

  if (!profile) {
    router.push('/onboarding')
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow p-8">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold">
              {user?.role === 'AU_PAIR' ? 'Au Pair Profile' : 'Host Family Profile'}
            </h1>
            <button
              onClick={() => router.push('/dashboard')}
              className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
            >
              Back to Dashboard
            </button>
          </div>

          <div className="space-y-6">
            {user?.role === 'AU_PAIR' ? (
              <div>
                <h2 className="text-lg font-semibold mb-4">Au Pair Information</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Name</label>
                    <p className="mt-1 text-sm text-gray-900">{profile.firstName} {profile.lastName}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Date of Birth</label>
                    <p className="mt-1 text-sm text-gray-900">
                      {profile.dateOfBirth ? new Date(profile.dateOfBirth).toLocaleDateString() : 'Not provided'}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Languages</label>
                    <p className="mt-1 text-sm text-gray-900">
                      {profile.languages && profile.languages.length > 0 ? profile.languages.join(', ') : 'None specified'}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Preferred Countries</label>
                    <p className="mt-1 text-sm text-gray-900">
                      {profile.preferredCountries && profile.preferredCountries.length > 0 ? profile.preferredCountries.join(', ') : 'None specified'}
                    </p>
                  </div>
                </div>
                {profile.bio && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Bio</label>
                    <p className="mt-1 text-sm text-gray-900">{profile.bio}</p>
                  </div>
                )}
              </div>
            ) : (
              <div>
                <h2 className="text-lg font-semibold mb-4">Host Family Information</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Family Name</label>
                    <p className="mt-1 text-sm text-gray-900">{profile.familyName}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Contact Person</label>
                    <p className="mt-1 text-sm text-gray-900">{profile.contactPersonName}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Location</label>
                    <p className="mt-1 text-sm text-gray-900">{profile.location}, {profile.country}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Number of Children</label>
                    <p className="mt-1 text-sm text-gray-900">{profile.numberOfChildren}</p>
                  </div>
                </div>
                {profile.bio && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">About Our Family</label>
                    <p className="mt-1 text-sm text-gray-900">{profile.bio}</p>
                  </div>
                )}
              </div>
            )}

            <div className="pt-4">
              <button
                onClick={() => router.push(user?.role === 'AU_PAIR' ? '/onboarding/au-pair' : '/onboarding/host-family')}
                className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
              >
                Edit Profile
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
