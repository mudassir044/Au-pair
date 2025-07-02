
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface AuPairProfile {
  firstName: string
  lastName: string
  dateOfBirth: string
  bio: string
  languages: string[]
  preferredCountries: string[]
  profilePhotoUrl?: string
}

interface HostFamilyProfile {
  familyName: string
  contactPersonName: string
  location: string
  country: string
  numberOfChildren: number
  childrenAges: number[]
  bio: string
  preferredLanguages: string[]
  profilePhotoUrl?: string
}

export default function OnboardingPage() {
  const [userRole, setUserRole] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const router = useRouter()

  // Au Pair form state
  const [auPairProfile, setAuPairProfile] = useState<AuPairProfile>({
    firstName: '',
    lastName: '',
    dateOfBirth: '',
    bio: '',
    languages: [],
    preferredCountries: []
  })

  // Host Family form state
  const [hostFamilyProfile, setHostFamilyProfile] = useState<HostFamilyProfile>({
    familyName: '',
    contactPersonName: '',
    location: '',
    country: '',
    numberOfChildren: 1,
    childrenAges: [],
    bio: '',
    preferredLanguages: []
  })

  const [newLanguage, setNewLanguage] = useState('')
  const [newCountry, setNewCountry] = useState('')
  const [newChildAge, setNewChildAge] = useState('')

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
          setUserRole(data.user.role)
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

    checkAuth()
  }, [router])

  const addLanguage = () => {
    if (newLanguage.trim() && !auPairProfile.languages.includes(newLanguage.trim())) {
      setAuPairProfile(prev => ({
        ...prev,
        languages: [...prev.languages, newLanguage.trim()]
      }))
      setNewLanguage('')
    }
  }

  const removeLanguage = (lang: string) => {
    setAuPairProfile(prev => ({
      ...prev,
      languages: prev.languages.filter(l => l !== lang)
    }))
  }

  const addCountry = () => {
    if (newCountry.trim() && !auPairProfile.preferredCountries.includes(newCountry.trim())) {
      setAuPairProfile(prev => ({
        ...prev,
        preferredCountries: [...prev.preferredCountries, newCountry.trim()]
      }))
      setNewCountry('')
    }
  }

  const removeCountry = (country: string) => {
    setAuPairProfile(prev => ({
      ...prev,
      preferredCountries: prev.preferredCountries.filter(c => c !== country)
    }))
  }

  const addHostLanguage = () => {
    if (newLanguage.trim() && !hostFamilyProfile.preferredLanguages.includes(newLanguage.trim())) {
      setHostFamilyProfile(prev => ({
        ...prev,
        preferredLanguages: [...prev.preferredLanguages, newLanguage.trim()]
      }))
      setNewLanguage('')
    }
  }

  const removeHostLanguage = (lang: string) => {
    setHostFamilyProfile(prev => ({
      ...prev,
      preferredLanguages: prev.preferredLanguages.filter(l => l !== lang)
    }))
  }

  const addChildAge = () => {
    const age = parseInt(newChildAge)
    if (!isNaN(age) && age > 0 && age < 18 && !hostFamilyProfile.childrenAges.includes(age)) {
      setHostFamilyProfile(prev => ({
        ...prev,
        childrenAges: [...prev.childrenAges, age].sort((a, b) => a - b)
      }))
      setNewChildAge('')
    }
  }

  const removeChildAge = (age: number) => {
    setHostFamilyProfile(prev => ({
      ...prev,
      childrenAges: prev.childrenAges.filter(a => a !== age)
    }))
  }

  const handleAuPairSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      const token = localStorage.getItem('token')
      const response = await fetch('http://localhost:8001/api/profiles/au-pair', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          ...auPairProfile,
          languages: JSON.stringify(auPairProfile.languages),
          preferredCountries: JSON.stringify(auPairProfile.preferredCountries)
        })
      })

      if (response.ok) {
        router.push('/dashboard')
      } else {
        const data = await response.json()
        alert(data.message || 'Failed to save profile')
      }
    } catch (error) {
      console.error('Profile save failed:', error)
      alert('Failed to save profile')
    } finally {
      setSaving(false)
    }
  }

  const handleHostFamilySubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      const token = localStorage.getItem('token')
      const response = await fetch('http://localhost:8001/api/profiles/host-family', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          ...hostFamilyProfile,
          childrenAges: JSON.stringify(hostFamilyProfile.childrenAges),
          preferredLanguages: JSON.stringify(hostFamilyProfile.preferredLanguages)
        })
      })

      if (response.ok) {
        router.push('/dashboard')
      } else {
        const data = await response.json()
        alert(data.message || 'Failed to save profile')
      }
    } catch (error) {
      console.error('Profile save failed:', error)
      alert('Failed to save profile')
    } finally {
      setSaving(false)
    }
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
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Complete Your Profile</h1>
          <p className="mt-2 text-gray-600">
            {userRole === 'AU_PAIR' 
              ? 'Tell host families about yourself' 
              : 'Share your family information with au pairs'
            }
          </p>
        </div>

        {userRole === 'AU_PAIR' ? (
          <form onSubmit={handleAuPairSubmit} className="bg-white shadow rounded-lg p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  First Name *
                </label>
                <input
                  type="text"
                  required
                  value={auPairProfile.firstName}
                  onChange={(e) => setAuPairProfile(prev => ({ ...prev, firstName: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Last Name *
                </label>
                <input
                  type="text"
                  required
                  value={auPairProfile.lastName}
                  onChange={(e) => setAuPairProfile(prev => ({ ...prev, lastName: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date of Birth *
              </label>
              <input
                type="date"
                required
                value={auPairProfile.dateOfBirth}
                onChange={(e) => setAuPairProfile(prev => ({ ...prev, dateOfBirth: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Languages Spoken
              </label>
              <div className="flex mb-2">
                <input
                  type="text"
                  placeholder="Add a language"
                  value={newLanguage}
                  onChange={(e) => setNewLanguage(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={addLanguage}
                  className="px-4 py-2 bg-blue-600 text-white rounded-r-md hover:bg-blue-700"
                >
                  Add
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {auPairProfile.languages.map(lang => (
                  <span
                    key={lang}
                    className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800"
                  >
                    {lang}
                    <button
                      type="button"
                      onClick={() => removeLanguage(lang)}
                      className="ml-2 text-blue-600 hover:text-blue-800"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Preferred Host Countries
              </label>
              <div className="flex mb-2">
                <input
                  type="text"
                  placeholder="Add a country"
                  value={newCountry}
                  onChange={(e) => setNewCountry(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={addCountry}
                  className="px-4 py-2 bg-blue-600 text-white rounded-r-md hover:bg-blue-700"
                >
                  Add
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {auPairProfile.preferredCountries.map(country => (
                  <span
                    key={country}
                    className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-green-100 text-green-800"
                  >
                    {country}
                    <button
                      type="button"
                      onClick={() => removeCountry(country)}
                      className="ml-2 text-green-600 hover:text-green-800"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                About Me
              </label>
              <textarea
                value={auPairProfile.bio}
                onChange={(e) => setAuPairProfile(prev => ({ ...prev, bio: e.target.value }))}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Tell host families about yourself, your experience with children, hobbies, etc."
              />
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full py-3 px-4 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Complete Profile'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleHostFamilySubmit} className="bg-white shadow rounded-lg p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Family Name *
                </label>
                <input
                  type="text"
                  required
                  value={hostFamilyProfile.familyName}
                  onChange={(e) => setHostFamilyProfile(prev => ({ ...prev, familyName: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Contact Person *
                </label>
                <input
                  type="text"
                  required
                  value={hostFamilyProfile.contactPersonName}
                  onChange={(e) => setHostFamilyProfile(prev => ({ ...prev, contactPersonName: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Location *
                </label>
                <input
                  type="text"
                  required
                  value={hostFamilyProfile.location}
                  onChange={(e) => setHostFamilyProfile(prev => ({ ...prev, location: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="City, State/Province"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Country *
                </label>
                <input
                  type="text"
                  required
                  value={hostFamilyProfile.country}
                  onChange={(e) => setHostFamilyProfile(prev => ({ ...prev, country: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Number of Children *
              </label>
              <input
                type="number"
                min="1"
                max="10"
                required
                value={hostFamilyProfile.numberOfChildren}
                onChange={(e) => setHostFamilyProfile(prev => ({ ...prev, numberOfChildren: parseInt(e.target.value) || 1 }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Children's Ages
              </label>
              <div className="flex mb-2">
                <input
                  type="number"
                  min="1"
                  max="17"
                  placeholder="Child's age"
                  value={newChildAge}
                  onChange={(e) => setNewChildAge(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={addChildAge}
                  className="px-4 py-2 bg-blue-600 text-white rounded-r-md hover:bg-blue-700"
                >
                  Add
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {hostFamilyProfile.childrenAges.map(age => (
                  <span
                    key={age}
                    className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-purple-100 text-purple-800"
                  >
                    {age} years old
                    <button
                      type="button"
                      onClick={() => removeChildAge(age)}
                      className="ml-2 text-purple-600 hover:text-purple-800"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Languages We Speak
              </label>
              <div className="flex mb-2">
                <input
                  type="text"
                  placeholder="Add a language"
                  value={newLanguage}
                  onChange={(e) => setNewLanguage(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={addHostLanguage}
                  className="px-4 py-2 bg-blue-600 text-white rounded-r-md hover:bg-blue-700"
                >
                  Add
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {hostFamilyProfile.preferredLanguages.map(lang => (
                  <span
                    key={lang}
                    className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800"
                  >
                    {lang}
                    <button
                      type="button"
                      onClick={() => removeHostLanguage(lang)}
                      className="ml-2 text-blue-600 hover:text-blue-800"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                About Our Family
              </label>
              <textarea
                value={hostFamilyProfile.bio}
                onChange={(e) => setHostFamilyProfile(prev => ({ ...prev, bio: e.target.value }))}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Tell au pairs about your family, lifestyle, expectations, etc."
              />
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full py-3 px-4 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Complete Profile'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function OnboardingPage() {
  const router = useRouter()

  useEffect(() => {
    const userData = localStorage.getItem('user')
    if (userData) {
      const user = JSON.parse(userData)
      if (user.role === 'AU_PAIR') {
        router.push('/onboarding/au-pair')
      } else if (user.role === 'HOST_FAMILY') {
        router.push('/onboarding/host-family')
      } else {
        router.push('/dashboard')
      }
    } else {
      router.push('/auth/login')
    }
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-xl">Redirecting to profile setup...</div>
    </div>
  )
}
