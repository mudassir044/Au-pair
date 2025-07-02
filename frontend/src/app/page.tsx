'use client'

import { useState, useEffect } from 'react'

export default function Home() {
  const [backendStatus, setBackendStatus] = useState<string>('Checking...')

  useEffect(() => {
    const checkBackend = async () => {
      try {
        const response = await fetch('http://localhost:8001/api/health')
        const data = await response.json()
        setBackendStatus(`✅ ${data.message}`)
      } catch (error) {
        setBackendStatus('❌ Backend not reachable')
      }
    }
    checkBackend()
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            Au Pair Connect
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Connecting Au Pairs with Host Families Worldwide
          </p>

          <div className="bg-white rounded-lg shadow-lg p-8 max-w-md mx-auto">
            <h2 className="text-2xl font-semibold mb-4">System Status</h2>
            <div className="text-left space-y-2">
              <div className="flex justify-between">
                <span>Frontend:</span>
                <span className="text-green-600">✅ Running</span>
              </div>
              <div className="flex justify-between">
                <span>Backend:</span>
                <span>{backendStatus}</span>
              </div>
            </div>
          </div>

          <div className="mt-12 grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-xl font-semibold mb-3 text-blue-600">For Au Pairs</h3>
              <p className="text-gray-600">
                Find the perfect host family, showcase your skills, and start your cultural exchange journey.
              </p>
            </div>
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-xl font-semibold mb-3 text-indigo-600">For Host Families</h3>
              <p className="text-gray-600">
                Discover caring au pairs who will become part of your family and help with childcare.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}