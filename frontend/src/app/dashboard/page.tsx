'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('token')
      if (!token) {
        router.push('/auth/login')
        return
      }

      try {
        const response = await fetch('http://localhost:8001/api/auth/me', {
          headers: { Authorization: `Bearer ${token}` }
        })

        if (response.ok) {
          const data = await response.json()
          setUser(data.user)

          // Check if user has a profile
          await checkProfile(token)
        } else {
          router.push('/auth/login')
        }
      } catch (error) {
        console.error('Auth check failed:', error)
        router.push('/auth/login')
      } finally {
        setLoading(false)
      }
    }

    const checkProfile = async (token: string) => {
      try {
        const response = await fetch('http://localhost:8001/api/profiles/me', {
          headers: { Authorization: `Bearer ${token}` }
        })

        if (response.ok) {
          const data = await response.json()
          if (!data.profile) {
            // No profile exists, redirect to onboarding
            router.push('/onboarding')
            return
          }
          setProfile(data.profile)
        }
      } catch (error) {
        console.error('Profile check failed:', error)
      }
    }

    checkAuth()
  }, [router])

  const handleLogout = () => {
    localStorage.removeItem('token')
    router.push('/')
  }

  const handleEditProfile = () => {
    router.push('/onboarding')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <h1 className="text-xl font-semibold">Au Pair Dashboard</h1>
            <div className="flex items-center space-x-4">
              <span className="text-gray-700">
                Welcome, {profile ? 
                  (user?.role === 'AU_PAIR' ? `${profile.firstName} ${profile.lastName}` : profile.familyName)
                  : user?.email
                }
              </span>
              <button
                onClick={handleLogout}
                className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* Profile Summary */}
        {profile && (
          <div className="bg-white shadow rounded-lg p-6 mb-6">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-2">Your Profile</h2>
                {user?.role === 'AU_PAIR' ? (
                  <div className="space-y-1">
                    <p className="text-gray-600">
                      <span className="font-medium">Name:</span> {profile.firstName} {profile.lastName}
                    </p>
                    <p className="text-gray-600">
                      <span className="font-medium">Age:</span> {new Date().getFullYear() - new Date(profile.dateOfBirth).getFullYear()}
                    </p>
                    {profile.languages && JSON.parse(profile.languages).length > 0 && (
                      <p className="text-gray-600">
                        <span className="font-medium">Languages:</span> {JSON.parse(profile.languages).join(', ')}
                      </p>
                    )}
                    {profile.preferredCountries && JSON.parse(profile.preferredCountries).length > 0 && (
                      <p className="text-gray-600">
                        <span className="font-medium">Preferred Countries:</span> {JSON.parse(profile.preferredCountries).join(', ')}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-1">
                    <p className="text-gray-600">
                      <span className="font-medium">Family:</span> {profile.familyName}
                    </p>
                    <p className="text-gray-600">
                      <span className="font-medium">Location:</span> {profile.location}, {profile.country}
                    </p>
                    <p className="text-gray-600">
                      <span className="font-medium">Children:</span> {profile.numberOfChildren}
                    </p>
                    {profile.preferredLanguages && JSON.parse(profile.preferredLanguages).length > 0 && (
                      <p className="text-gray-600">
                        <span className="font-medium">Languages:</span> {JSON.parse(profile.preferredLanguages).join(', ')}
                      </p>
                    )}
                  </div>
                )}
              </div>
              <button
                onClick={handleEditProfile}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Edit Profile
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm font-medium">P</span>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Profile</dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {user?.role === 'AU_PAIR' ? 'Au Pair' : 'Host Family'}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm font-medium">M</span>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Matches</dt>
                    <dd className="text-lg font-medium text-gray-900">0</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm font-medium">C</span>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Messages</dt>
                    <dd className="text-lg font-medium text-gray-900">0</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h2>
            <div className="space-y-3">
              <button
                onClick={() => router.push('/matches')}
                className="w-full text-left px-4 py-3 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
              >
                <div className="font-medium text-blue-900">Browse Matches</div>
                <div className="text-sm text-blue-600">Find your perfect match</div>
              </button>
              <button
                onClick={() => router.push('/messages')}
                className="w-full text-left px-4 py-3 bg-green-50 hover:bg-green-100 rounded-lg transition-colors"
              >
                <div className="font-medium text-green-900">Messages</div>
                <div className="text-sm text-green-600">Chat with potential matches</div>
              </button>
              <button
                onClick={() => router.push('/calendar')}
                className="w-full text-left px-4 py-3 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors"
              >
                <div className="font-medium text-purple-900">Calendar</div>
                <div className="text-sm text-purple-600">Manage bookings and availability</div>
              </button>
              <button
                onClick={() => router.push('/documents')}
                className="w-full text-left px-4 py-3 bg-orange-50 hover:bg-orange-100 rounded-lg transition-colors"
              >
                <div className="font-medium text-orange-900">Documents</div>
                <div className="text-sm text-orange-600">Upload verification documents</div>
              </button>
            </div>
          </div>

          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Profile Status</h2>
            <div className="text-sm text-gray-600">
              Your profile is {user?.role === 'AU_PAIR' ? 'ready to connect with host families' : 'ready to find au pairs'}!
            </div>
            {profile?.bio && (
              <div className="mt-3">
                <p className="text-sm font-medium text-gray-700">About:</p>
                <p className="text-sm text-gray-600 mt-1">{profile.bio}</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}