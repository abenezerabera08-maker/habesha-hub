'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft, ImageOff } from 'lucide-react'
import { useState } from 'react'

type EventDetailHeaderProps = {
  imageUrl: string | null
  title: string
}

export default function EventDetailHeader({ imageUrl, title }: EventDetailHeaderProps) {
  const router = useRouter()
  const [imgFailed, setImgFailed] = useState(false)
  const showImage = !!imageUrl && !imgFailed

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        paddingBottom: '56.25%',
        background: showImage ? '#f0f0f0' : 'linear-gradient(135deg, #FDE68A 0%, #F59E0B 50%, #D97706 100%)',
      }}
    >
      {showImage && (
        <img
          src={imageUrl!}
          alt={title}
          onError={() => setImgFailed(true)}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
          }}
        />
      )}
      {!showImage && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <ImageOff size={48} color="rgba(255,255,255,0.5)" />
        </div>
      )}
      {/* Back button */}
      <button
        type="button"
        onClick={() => router.back()}
        aria-label="Go back"
        style={{
          position: 'absolute',
          top: 12,
          left: 12,
          width: 36,
          height: 36,
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.9)',
          border: 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        }}
      >
        <ArrowLeft size={18} color="#1C1917" />
      </button>
    </div>
  )
}
