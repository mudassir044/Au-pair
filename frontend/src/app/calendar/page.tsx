
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface Booking {
  id: string
  scheduledDate: string
  scheduledTime: string
  duration: number
  status: string
  bookingType: string
  notes?: string
  requester: {
    id: string
    role: string
    auPairProfile?: {
      firstName: string
      lastName: string
    }
    hostFamilyProfile?: {
      familyName: string
      contactPersonName: string
    }
  }
  receiver: {
    id: string
    role: string
    auPairProfile?: {
      firstName: string
      lastName: string
    }
    hostFamilyProfile?: {
      familyName: string
      contactPersonName: string
    }
  }
}

interface Availability {
  id: string
  date: string
  startTime: string
  endTime: string
  timezone: string
}

export default function CalendarPage() {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [availability, setAvailability] = useState<Availability[]>([])
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedTime, setSelectedTime] = useState('')
  const [showBookingForm, setShowBookingForm] = useState(false)
  const [showAvailabilityForm, setShowAvailabilityForm] = useState(false)
  const [loading, setLoading] = useState(true)
  const [currentUserId, setCurrentUserId] = useState('')
  const router = useRouter()

  useEffect(() => {
    const token = localStorage.getItem('accessToken')
    if (!token) {
      router.push('/auth/login')
      return
    }

    fetchData(token)
  }, [router])

  const fetchData = async (token: string) => {
    try {
      // Get current user
      const userResponse = await fetch('http://localhost:8001/api/profiles/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (userResponse.ok) {
        const userData = await userResponse.json()
        setCurrentUserId(userData.id)
      }

      // Get bookings
      const bookingsResponse = await fetch('http://localhost:8001/api/calendar/bookings', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (bookingsResponse.ok) {
        const bookingsData = await bookingsResponse.json()
        setBookings(bookingsData.bookings || [])
      }

      // Get availability
      const availabilityResponse = await fetch('http://localhost:8001/api/calendar/availability', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (availabilityResponse.ok) {
        const availabilityData = await availabilityResponse.json()
        setAvailability(availabilityData.availability || [])
      }
    } catch (error) {
      console.error('Failed to fetch calendar data:', error)
    } finally {
      setLoading(false)
    }
  }

  const setAvailabilitySlot = async () => {
    if (!selectedDate || !selectedTime) return

    const token = localStorage.getItem('accessToken')
    const [startTime, endTime] = selectedTime.split('-')

    try {
      const response = await fetch('http://localhost:8001/api/calendar/availability', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          date: selectedDate,
          startTime,
          endTime,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
        })
      })

      if (response.ok) {
        setShowAvailabilityForm(false)
        setSelectedDate('')
        setSelectedTime('')
        // Refresh data
        fetchData(token!)
      } else {
        alert('Failed to set availability')
      }
    } catch (error) {
      alert('Failed to set availability')
    }
  }

  const updateBookingStatus = async (bookingId: string, status: string) => {
    const token = localStorage.getItem('accessToken')

    try {
      const response = await fetch(`http://localhost:8001/api/calendar/bookings/${bookingId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status })
      })

      if (response.ok) {
        // Refresh bookings
        fetchData(token!)
      } else {
        alert('Failed to update booking')
      }
    } catch (error) {
      alert('Failed to update booking')
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString()
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return 'bg-yellow-100 text-yellow-800'
      case 'APPROVED': return 'bg-green-100 text-green-800'
      case 'REJECTED': return 'bg-red-100 text-red-800'
      case 'CANCELLED': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-xl text-gray-600">Loading calendar...</div>
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
              <h1 className="text-xl font-semibold">Calendar & Bookings</h1>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setShowAvailabilityForm(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
              >
                Set Availability
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Upcoming Bookings */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Upcoming Bookings</h2>
            
            {bookings.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-gray-500 mb-4">No bookings scheduled</div>
                <button 
                  onClick={() => router.push('/matches')}
                  className="text-blue-600 hover:text-blue-800"
                >
                  Find matches to schedule bookings
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {bookings.map((booking) => {
                  const isRequester = booking.requester.id === currentUserId
                  const otherUser = isRequester ? booking.receiver : booking.requester
                  const otherUserName = otherUser.role === 'AU_PAIR' 
                    ? `${otherUser.auPairProfile?.firstName} ${otherUser.auPairProfile?.lastName}`
                    : otherUser.hostFamilyProfile?.familyName

                  return (
                    <div key={booking.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="font-medium text-gray-900">
                            {isRequester ? `Meeting with ${otherUserName}` : `Meeting with ${otherUserName}`}
                          </h3>
                          <p className="text-sm text-gray-600">
                            {formatDate(booking.scheduledDate)} at {booking.scheduledTime}
                          </p>
                          <p className="text-sm text-gray-500">
                            Duration: {booking.duration} minutes
                          </p>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(booking.status)}`}>
                          {booking.status}
                        </span>
                      </div>

                      {booking.notes && (
                        <p className="text-sm text-gray-600 mb-3">{booking.notes}</p>
                      )}

                      {/* Action buttons */}
                      {booking.status === 'PENDING' && (
                        <div className="flex space-x-2">
                          {!isRequester ? (
                            // Receiver can approve/reject
                            <>
                              <button
                                onClick={() => updateBookingStatus(booking.id, 'APPROVED')}
                                className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => updateBookingStatus(booking.id, 'REJECTED')}
                                className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700"
                              >
                                Reject
                              </button>
                            </>
                          ) : (
                            // Requester can cancel
                            <button
                              onClick={() => updateBookingStatus(booking.id, 'CANCELLED')}
                              className="bg-gray-600 text-white px-3 py-1 rounded text-sm hover:bg-gray-700"
                            >
                              Cancel
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* My Availability */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">My Availability</h2>
            
            {availability.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-gray-500 mb-4">No availability set</div>
                <button
                  onClick={() => setShowAvailabilityForm(true)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                >
                  Set Your Availability
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {availability.map((slot) => (
                  <div key={slot.id} className="border border-gray-200 rounded-lg p-3">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-medium text-gray-900">{formatDate(slot.date)}</p>
                        <p className="text-sm text-gray-600">
                          {slot.startTime} - {slot.endTime} ({slot.timezone})
                        </p>
                      </div>
                      <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs">
                        Available
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Set Availability Modal */}
      {showAvailabilityForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Set Availability</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date
                </label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Time Slot
                </label>
                <select
                  value={selectedTime}
                  onChange={(e) => setSelectedTime(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select time slot</option>
                  <option value="09:00-10:00">9:00 AM - 10:00 AM</option>
                  <option value="10:00-11:00">10:00 AM - 11:00 AM</option>
                  <option value="11:00-12:00">11:00 AM - 12:00 PM</option>
                  <option value="14:00-15:00">2:00 PM - 3:00 PM</option>
                  <option value="15:00-16:00">3:00 PM - 4:00 PM</option>
                  <option value="16:00-17:00">4:00 PM - 5:00 PM</option>
                  <option value="19:00-20:00">7:00 PM - 8:00 PM</option>
                  <option value="20:00-21:00">8:00 PM - 9:00 PM</option>
                </select>
              </div>
            </div>

            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowAvailabilityForm(false)
                  setSelectedDate('')
                  setSelectedTime('')
                }}
                className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-400"
              >
                Cancel
              </button>
              <button
                onClick={setAvailabilitySlot}
                disabled={!selectedDate || !selectedTime}
                className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:bg-gray-300"
              >
                Set Availability
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
