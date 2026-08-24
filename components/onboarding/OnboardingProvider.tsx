'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import OnboardingChoiceModal from './OnboardingChoiceModal'
import BottomNav from '@/app/components/BottomNav'
import NotificationBell from '@/components/notification/NotificationBell'

const STORAGE_KEY = 'habeshahub_onboarding_completed'

export default function OnboardingProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [showModal, setShowModal] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const completed = localStorage.getItem(STORAGE_KEY)
    if (!completed) {
      setShowModal(true)
    }
    setMounted(true)
  }, [])

  const complete = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, '1')
    setShowModal(false)
  }, [])

  const handleAttend = useCallback(() => {
    complete()
    router.push('/')
  }, [complete, router])

  const handleHost = useCallback(() => {
    complete()
    router.push('/create-event')
  }, [complete, router])

  const handleSkip = useCallback(() => {
    complete()
  }, [complete])

  return (
    <>
      {children}
      {mounted && (
        <>
          <BottomNav hidden={showModal} />
          {!showModal && <NotificationBell />}
        </>
      )}
      <OnboardingChoiceModal
        open={showModal}
        onAttend={handleAttend}
        onHost={handleHost}
        onSkip={handleSkip}
      />
    </>
  )
}
