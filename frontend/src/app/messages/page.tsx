
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function MessagesPage() {
  const [conversations, setConversations] = useState([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const token = localStorage.getItem('accessToken')
    if (!token) {
      router.push('/auth/login')
      return
    }

    // Simulate loading conversations
    setTimeout(() => {
      setConversations([
        { id: 1, name: 'Smith Family', lastMessage: 'Looking forward to meeting you!', time: '2 hours ago' },
        { id: 2, name: 'Maria Garcia', lastMessage: 'Thank you for your interest', time: '1 day ago' },
      ])
      setLoading(false)
    }, 1000)
  }, [router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading messages...</div>
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
              <h1 className="text-xl font-semibold">Messages</h1>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {conversations.length === 0 ? (
          <div className="text-center py-12">
            <h2 className="text-2xl font-semibold text-gray-600 mb-4">No messages yet</h2>
            <p className="text-gray-500">Start matching to begin conversations!</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow">
            {conversations.map((conversation: any) => (
              <div key={conversation.id} className="border-b last:border-b-0 p-4 hover:bg-gray-50 cursor-pointer">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold text-gray-900">{conversation.name}</h3>
                    <p className="text-gray-600 mt-1">{conversation.lastMessage}</p>
                  </div>
                  <span className="text-sm text-gray-500">{conversation.time}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
