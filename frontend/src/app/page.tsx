
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function Home() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [backendStatus, setBackendStatus] = useState<string>('Checking...')
  const router = useRouter()

  useEffect(() => {
    // Check if user is logged in
    const token = localStorage.getItem('accessToken')
    const role = localStorage.getItem('userRole')
    if (token) {
      setIsLoggedIn(true)
      setUserRole(role)
    }

    // Check backend status
    const checkBackend = async () => {
      try {
        const response = await fetch('http://localhost:8001/api/health')
        const data = await response.json()
        setBackendStatus('✅ Connected')
      } catch (error) {
        setBackendStatus('❌ Offline')
      }
    }
    checkBackend()
  }, [])

  const handleNavigation = (path: string) => {
    router.push(path)
  }

  const handleLogout = () => {
    localStorage.removeItem('accessToken')
    localStorage.removeItem('userRole')
    localStorage.removeItem('userId')
    setIsLoggedIn(false)
    setUserRole(null)
    router.push('/')
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header Navigation */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-blue-600">Au Pair Connect</h1>
            </div>

            {/* Navigation */}
            <nav className="hidden md:flex space-x-8">
              <a href="#features" className="text-gray-600 hover:text-blue-600 transition-colors">
                Features
              </a>
              <a href="#how-it-works" className="text-gray-600 hover:text-blue-600 transition-colors">
                How It Works
              </a>
              <a href="#about" className="text-gray-600 hover:text-blue-600 transition-colors">
                About
              </a>
            </nav>

            {/* Auth Buttons */}
            <div className="flex items-center space-x-4">
              {!isLoggedIn ? (
                <>
                  <button
                    onClick={() => handleNavigation('/auth/login')}
                    className="text-gray-600 hover:text-blue-600 font-medium transition-colors"
                  >
                    Sign In
                  </button>
                  <button
                    onClick={() => handleNavigation('/auth/register')}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium"
                  >
                    Sign Up
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => handleNavigation('/dashboard')}
                    className="text-gray-600 hover:text-blue-600 font-medium transition-colors"
                  >
                    Dashboard
                  </button>
                  <button
                    onClick={() => handleNavigation('/matches')}
                    className="text-gray-600 hover:text-blue-600 font-medium transition-colors"
                  >
                    Matches
                  </button>
                  <button
                    onClick={handleLogout}
                    className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors font-medium"
                  >
                    Logout
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-blue-50 to-indigo-100 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
              Connect Au Pairs with
              <span className="text-blue-600"> Host Families</span>
              <br />
              <span className="text-indigo-600">Worldwide</span>
            </h1>
            <p className="text-xl md:text-2xl text-gray-600 mb-8 max-w-3xl mx-auto">
              Find your perfect match. Create lasting connections. Experience cultural exchange 
              that enriches families and builds lifelong memories.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              {!isLoggedIn ? (
                <>
                  <button
                    onClick={() => handleNavigation('/auth/register')}
                    className="w-full sm:w-auto bg-blue-600 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-blue-700 transition-colors shadow-lg"
                  >
                    Get Started Today
                  </button>
                  <button
                    onClick={() => handleNavigation('/auth/login')}
                    className="w-full sm:w-auto bg-white text-blue-600 px-8 py-4 rounded-lg text-lg font-semibold hover:bg-gray-50 transition-colors border-2 border-blue-600"
                  >
                    Sign In
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => handleNavigation('/matches')}
                    className="w-full sm:w-auto bg-blue-600 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-blue-700 transition-colors shadow-lg"
                  >
                    View Matches
                  </button>
                  <button
                    onClick={() => handleNavigation('/dashboard')}
                    className="w-full sm:w-auto bg-white text-blue-600 px-8 py-4 rounded-lg text-lg font-semibold hover:bg-gray-50 transition-colors border-2 border-blue-600"
                  >
                    Go to Dashboard
                  </button>
                </>
              )}
            </div>

            {/* System Status (small indicator) */}
            <div className="mt-8 text-sm text-gray-500">
              System Status: {backendStatus}
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Why Choose Au Pair Connect?
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Our platform makes it easy to find the perfect match for your family or au pair journey.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="bg-blue-50 rounded-xl p-8 text-center">
              <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">For Au Pairs</h3>
              <p className="text-gray-600">
                Find caring host families, showcase your skills, and start your cultural exchange journey with confidence.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-indigo-50 rounded-xl p-8 text-center">
              <div className="w-16 h-16 bg-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">For Host Families</h3>
              <p className="text-gray-600">
                Discover qualified au pairs who will become part of your family and provide excellent childcare.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-green-50 rounded-xl p-8 text-center">
              <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Safe & Secure</h3>
              <p className="text-gray-600">
                Verified profiles, secure messaging, and comprehensive background checks ensure everyone's safety.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              How It Works
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Getting started is simple. Follow these easy steps to find your perfect match.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Step 1 */}
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-600 text-white rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
                1
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Create Your Profile</h3>
              <p className="text-gray-600">
                Sign up and create a detailed profile showcasing your personality, skills, and preferences.
              </p>
            </div>

            {/* Step 2 */}
            <div className="text-center">
              <div className="w-16 h-16 bg-indigo-600 text-white rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
                2
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Find Matches</h3>
              <p className="text-gray-600">
                Browse and connect with potential matches based on your preferences and compatibility.
              </p>
            </div>

            {/* Step 3 */}
            <div className="text-center">
              <div className="w-16 h-16 bg-green-600 text-white rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
                3
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Start Your Journey</h3>
              <p className="text-gray-600">
                Connect, chat, and begin your cultural exchange experience with your matched family or au pair.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            {/* Company Info */}
            <div>
              <h3 className="text-xl font-bold mb-4">Au Pair Connect</h3>
              <p className="text-gray-400 mb-4">
                Connecting families and au pairs worldwide for meaningful cultural exchange experiences.
              </p>
            </div>

            {/* Quick Links */}
            <div>
              <h4 className="font-semibold mb-4">Quick Links</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#features" className="hover:text-white transition-colors">Features</a></li>
                <li><a href="#how-it-works" className="hover:text-white transition-colors">How It Works</a></li>
                <li><a href="#about" className="hover:text-white transition-colors">About Us</a></li>
              </ul>
            </div>

            {/* For Users */}
            <div>
              <h4 className="font-semibold mb-4">For Users</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="/auth/register" className="hover:text-white transition-colors">Sign Up</a></li>
                <li><a href="/auth/login" className="hover:text-white transition-colors">Sign In</a></li>
                {isLoggedIn && (
                  <>
                    <li><a href="/dashboard" className="hover:text-white transition-colors">Dashboard</a></li>
                    <li><a href="/matches" className="hover:text-white transition-colors">Find Matches</a></li>
                  </>
                )}
              </ul>
            </div>

            {/* Support */}
            <div>
              <h4 className="font-semibold mb-4">Support</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">Help Center</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Contact Us</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Terms of Service</a></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2024 Au Pair Connect. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
