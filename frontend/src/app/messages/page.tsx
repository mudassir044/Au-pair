
'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { io, Socket } from 'socket.io-client'

interface Message {
  id: string
  content: string
  senderId: string
  receiverId: string
  createdAt: string
  sender: {
    id: string
    role: string
    auPairProfile?: {
      firstName: string
      lastName: string
      profilePhotoUrl?: string
    }
    hostFamilyProfile?: {
      familyName: string
      contactPersonName: string
      profilePhotoUrl?: string
    }
  }
}

interface Match {
  id: string
  status: string
  host: {
    id: string
    email: string
    hostFamilyProfile: {
      familyName: string
      contactPersonName: string
      profilePhotoUrl?: string
    }
  }
  auPair: {
    id: string
    email: string
    auPairProfile: {
      firstName: string
      lastName: string
      profilePhotoUrl?: string
    }
  }
}

interface Conversation {
  userId: string
  name: string
  lastMessage?: string
  unreadCount: number
  profilePhoto?: string
}

export default function MessagesPage() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [currentUserId, setCurrentUserId] = useState<string>('')
  const [socket, setSocket] = useState<Socket | null>(null)
  const [typing, setTyping] = useState(false)
  const [otherUserTyping, setOtherUserTyping] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout>()
  const router = useRouter()

  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    const token = localStorage.getItem('accessToken')
    if (!token) {
      router.push('/auth/login')
      return
    }

    // Initialize socket connection
    const newSocket = io('http://localhost:8001', {
      auth: { token }
    })

    newSocket.on('connect', () => {
      console.log('Connected to socket server')
    })

    newSocket.on('new_message', (message: Message) => {
      setMessages(prev => [...prev, message])
      // Update conversation list with new last message
      setConversations(prev => prev.map(conv => 
        conv.userId === message.senderId 
          ? { ...conv, lastMessage: message.content.substring(0, 50) + '...', unreadCount: conv.unreadCount + 1 }
          : conv
      ))
    })

    newSocket.on('user_typing', ({ userId }: { userId: string }) => {
      if (userId === selectedConversation) {
        setOtherUserTyping(true)
      }
    })

    newSocket.on('user_stopped_typing', ({ userId }: { userId: string }) => {
      if (userId === selectedConversation) {
        setOtherUserTyping(false)
      }
    })

    newSocket.on('error', (error: { message: string }) => {
      console.error('Socket error:', error.message)
    })

    setSocket(newSocket)
    fetchMatches(token)

    return () => {
      newSocket.disconnect()
    }
  }, [router])

  const fetchMatches = async (token: string) => {
    try {
      // Get current user info
      const userResponse = await fetch('http://localhost:8001/api/profiles/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      if (userResponse.ok) {
        const userData = await userResponse.json()
        setCurrentUserId(userData.id)
      }

      // Get approved matches
      const response = await fetch('http://localhost:8001/api/matches/my-matches?status=APPROVED', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      if (response.ok) {
        const data = await response.json()
        const matchedUsers: Conversation[] = data.matches.map((match: Match) => {
          const otherUser = match.host.id === currentUserId ? match.auPair : match.host
          const isAuPair = otherUser.id === match.auPair.id
          
          return {
            userId: otherUser.id,
            name: isAuPair 
              ? `${match.auPair.auPairProfile.firstName} ${match.auPair.auPairProfile.lastName}`
              : match.host.hostFamilyProfile.familyName,
            unreadCount: 0,
            profilePhoto: isAuPair 
              ? match.auPair.auPairProfile.profilePhotoUrl
              : match.host.hostFamilyProfile.profilePhotoUrl
          }
        })
        
        setConversations(matchedUsers)
      }
    } catch (error) {
      console.error('Failed to fetch matches:', error)
    } finally {
      setLoading(false)
    }
  }

  const selectConversation = async (userId: string) => {
    setSelectedConversation(userId)
    const token = localStorage.getItem('accessToken')
    
    if (socket) {
      socket.emit('join_conversation', { receiverId: userId })
    }

    // Fetch message history
    try {
      const response = await fetch(`http://localhost:8001/api/messages/${userId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      if (response.ok) {
        const data = await response.json()
        setMessages(data.messages || [])
        
        // Mark messages as read
        if (socket) {
          socket.emit('mark_messages_read', { senderId: userId })
        }
        
        // Update unread count
        setConversations(prev => prev.map(conv => 
          conv.userId === userId ? { ...conv, unreadCount: 0 } : conv
        ))
      }
    } catch (error) {
      console.error('Failed to fetch messages:', error)
    }
  }

  const sendMessage = () => {
    if (!newMessage.trim() || !selectedConversation || !socket) return

    socket.emit('send_message', {
      receiverId: selectedConversation,
      content: newMessage.trim()
    })

    setNewMessage('')
    
    // Stop typing
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }
    socket.emit('typing_stop', { receiverId: selectedConversation })
    setTyping(false)
  }

  const handleTyping = (value: string) => {
    setNewMessage(value)
    
    if (!selectedConversation || !socket) return

    if (!typing) {
      setTyping(true)
      socket.emit('typing_start', { receiverId: selectedConversation })
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }

    // Set new timeout to stop typing
    typingTimeoutRef.current = setTimeout(() => {
      setTyping(false)
      socket.emit('typing_stop', { receiverId: selectedConversation })
    }, 1000)
  }

  const formatMessageTime = (timestamp: string) => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-xl text-gray-600">Loading conversations...</div>
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

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-sm overflow-hidden" style={{ height: '600px' }}>
          <div className="flex h-full">
            {/* Conversations List */}
            <div className="w-1/3 border-r border-gray-200">
              <div className="p-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Conversations</h2>
              </div>
              <div className="overflow-y-auto h-full">
                {conversations.length === 0 ? (
                  <div className="p-4 text-center text-gray-500">
                    <p>No approved matches yet</p>
                    <button 
                      onClick={() => router.push('/matches')}
                      className="mt-2 text-blue-600 hover:text-blue-800"
                    >
                      Find matches
                    </button>
                  </div>
                ) : (
                  conversations.map((conversation) => (
                    <div
                      key={conversation.userId}
                      onClick={() => selectConversation(conversation.userId)}
                      className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 ${
                        selectedConversation === conversation.userId ? 'bg-blue-50 border-blue-200' : ''
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold">
                          {conversation.profilePhoto ? (
                            <img src={conversation.profilePhoto} alt="Profile" className="w-full h-full rounded-full object-cover" />
                          ) : (
                            conversation.name[0]
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start">
                            <h3 className="text-sm font-medium text-gray-900 truncate">
                              {conversation.name}
                            </h3>
                            {conversation.unreadCount > 0 && (
                              <span className="bg-blue-600 text-white text-xs rounded-full px-2 py-1 ml-2">
                                {conversation.unreadCount}
                              </span>
                            )}
                          </div>
                          {conversation.lastMessage && (
                            <p className="text-sm text-gray-500 truncate">{conversation.lastMessage}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Chat Area */}
            <div className="flex-1 flex flex-col">
              {selectedConversation ? (
                <>
                  {/* Chat Header */}
                  <div className="p-4 border-b border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {conversations.find(c => c.userId === selectedConversation)?.name}
                    </h3>
                  </div>

                  {/* Messages */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {messages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex ${message.senderId === currentUserId ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                            message.senderId === currentUserId
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-200 text-gray-900'
                          }`}
                        >
                          <p className="text-sm">{message.content}</p>
                          <p className={`text-xs mt-1 ${
                            message.senderId === currentUserId ? 'text-blue-200' : 'text-gray-500'
                          }`}>
                            {formatMessageTime(message.createdAt)}
                          </p>
                        </div>
                      </div>
                    ))}
                    
                    {otherUserTyping && (
                      <div className="flex justify-start">
                        <div className="bg-gray-200 text-gray-900 px-4 py-2 rounded-lg">
                          <div className="flex space-x-1">
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Message Input */}
                  <div className="p-4 border-t border-gray-200">
                    <div className="flex space-x-2">
                      <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => handleTyping(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                        placeholder="Type a message..."
                        className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <button
                        onClick={sendMessage}
                        disabled={!newMessage.trim()}
                        className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                      >
                        Send
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-6xl text-gray-300 mb-4">💬</div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Select a conversation</h3>
                    <p className="text-gray-500">Choose someone from your matches to start chatting</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
