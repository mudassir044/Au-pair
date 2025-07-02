
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
