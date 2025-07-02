
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function DashboardPage() {
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

  const handleLogout = () => {
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    localStorage.removeItem('user')
    router.push('/')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold">Au Pair Connect</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-gray-700">Welcome, {user?.email}</span>
              <button
                onClick={handleLogout}
                className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="border-4 border-dashed border-gray-200 rounded-lg p-8">
            <h2 className="text-2xl font-bold mb-6">
              {user?.role === 'AU_PAIR' ? 'Au Pair' : 'Host Family'} Dashboard
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-lg font-semibold mb-2">Profile Status</h3>
                <p className="text-gray-600">
                  {profile ? '✅ Profile Complete' : '❌ Profile Incomplete'}
                </p>
                <Link 
                  href="/profile"
                  className="mt-2 inline-block bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                >
                  {profile ? 'Edit Profile' : 'Create Profile'}
                </Link>
              </div>

              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-lg font-semibold mb-2">Matches</h3>
                <p className="text-gray-600">Find your perfect match</p>
                <Link 
                  href="/matches"
                  className="mt-2 inline-block bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                >
                  View Matches
                </Link>
              </div>

              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-lg font-semibold mb-2">Messages</h3>
                <p className="text-gray-600">Chat with potential families/au pairs</p>
                <Link 
                  href="/messages"
                  className="mt-2 inline-block bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700"
                >
                  Open Messages
                </Link>
              </div>
            </div>

            <div className="mt-8">
              <h3 className="text-lg font-semibold mb-4">Account Information</h3>
              <div className="bg-white p-4 rounded-lg shadow">
                <p><strong>Email:</strong> {user?.email}</p>
                <p><strong>Role:</strong> {user?.role}</p>
                <p><strong>Email Verified:</strong> {user?.isEmailVerified ? '✅ Yes' : '❌ No'}</p>
                <p><strong>Account Active:</strong> {user?.isActive ? '✅ Yes' : '❌ No'}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
