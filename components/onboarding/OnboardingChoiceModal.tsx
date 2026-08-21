'use client'

import { useEffect } from 'react'
import { Users, CalendarPlus, ChevronRight, Sparkles, X } from 'lucide-react'

type Props = {
  open: boolean
  onAttend: () => void
  onHost: () => void
  onSkip: () => void
}

export default function OnboardingChoiceModal({ open, onAttend, onHost, onSkip }: Props) {
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [open])

  if (!open) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Welcome to HabeshaHub"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        background: 'rgba(247,247,249,0.94)',
        backdropFilter: 'blur(7px)',
        WebkitBackdropFilter: 'blur(7px)',
      }}
    >
      <section
        style={{
          position: 'relative',
          width: 'min(100%, 520px)',
          maxHeight: '94dvh',
          overflowY: 'auto',
          padding: '26px 28px 30px',
          borderRadius: '30px 30px 0 0',
          background: '#fff',
          color: '#11132f',
          boxShadow: '0 -10px 45px rgba(25,25,45,0.10)',
          fontFamily: "Inter, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        }}
        className="hh-onboarding-sheet"
      >
        {/* Drag handle */}
        <div style={{
          width: 76, height: 7, margin: '0 auto 44px',
          borderRadius: 99, background: '#d4d5dc',
        }} />

        {/* Close button */}
        <button
          type="button"
          aria-label="Close onboarding"
          onClick={onSkip}
          style={{
            position: 'absolute', top: 18, right: 18,
            width: 38, height: 38, border: 0, borderRadius: '50%',
            display: 'grid', placeItems: 'center',
            color: '#858899', background: 'transparent', cursor: 'pointer',
          }}
        >
          <X size={18} />
        </button>

        {/* Hero */}
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center',
        }}>
          {/* Sparkle icon */}
          <div style={{
            width: 84, height: 84,
            display: 'grid', placeItems: 'center',
            marginBottom: 38, borderRadius: '50%',
            color: '#f2aa25',
            background: 'linear-gradient(145deg,#fffaf0,#fff5df)',
            boxShadow: '0 10px 25px rgba(241,172,39,0.10)',
          }}>
            <Sparkles size={31} />
          </div>

          <h1 style={{
            margin: 0,
            fontSize: 'clamp(38px, 9vw, 54px)',
            lineHeight: 1.08,
            letterSpacing: '-0.045em',
            fontWeight: 800,
          }}>
            What do you want to<br />
            <span style={{ color: '#f2aa25' }}>do?</span>
          </h1>

          <p style={{
            margin: '25px 0 48px',
            color: '#7c7f92',
            fontSize: 18,
            lineHeight: 1.5,
          }}>
            Choose an option to get started<br />
            with HabeshaHub
          </p>
        </div>

        {/* Options */}
        <div style={{ display: 'grid', gap: 20 }}>
          {/* Attend Events */}
          <button
            type="button"
            onClick={onAttend}
            className="hh-onboard-option"
            style={{
              width: '100%', minHeight: 174,
              display: 'grid',
              gridTemplateColumns: '94px minmax(0,1fr) 30px',
              alignItems: 'center', gap: 20,
              padding: '24px 22px',
              border: '1px solid #e8e8ed', borderRadius: 22,
              background: '#fff', textAlign: 'left',
              cursor: 'pointer',
              boxShadow: '0 8px 22px rgba(22,24,53,0.055)',
              transition: '0.16s ease',
            }}
          >
            <div style={{
              width: 94, height: 94,
              display: 'grid', placeItems: 'center',
              borderRadius: '50%',
              color: '#7041b6', background: '#f2eafa',
            }}>
              <Users size={30} />
            </div>
            <div>
              <strong style={{
                display: 'block', marginBottom: 9,
                color: '#11132f', fontSize: 22, lineHeight: 1.2, fontWeight: 750,
              }}>
                Attend Events
              </strong>
              <span style={{ color: '#7b7e91', fontSize: 17, lineHeight: 1.45 }}>
                Discover amazing events<br />and get your tickets
              </span>
            </div>
            <ChevronRight size={29} color="#7041b6" />
          </button>

          {/* Host an Event */}
          <button
            type="button"
            onClick={onHost}
            className="hh-onboard-option"
            style={{
              width: '100%', minHeight: 174,
              display: 'grid',
              gridTemplateColumns: '94px minmax(0,1fr) 30px',
              alignItems: 'center', gap: 20,
              padding: '24px 22px',
              border: '1px solid #e8e8ed', borderRadius: 22,
              background: '#fff', textAlign: 'left',
              cursor: 'pointer',
              boxShadow: '0 8px 22px rgba(22,24,53,0.055)',
              transition: '0.16s ease',
            }}
          >
            <div style={{
              width: 94, height: 94,
              display: 'grid', placeItems: 'center',
              borderRadius: '50%',
              color: '#efa928', background: '#fff5df',
            }}>
              <CalendarPlus size={30} />
            </div>
            <div>
              <strong style={{
                display: 'block', marginBottom: 9,
                color: '#11132f', fontSize: 22, lineHeight: 1.2, fontWeight: 750,
              }}>
                Host an Event
              </strong>
              <span style={{ color: '#7b7e91', fontSize: 17, lineHeight: 1.45 }}>
                Create and manage your<br />own events
              </span>
            </div>
            <ChevronRight size={29} color="#efa928" />
          </button>
        </div>

        {/* Divider */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr auto 1fr',
          alignItems: 'center', gap: 18,
          margin: '52px 0 30px',
          color: '#9b9dab',
        }}>
          <i style={{ height: 1, background: '#e6e6eb', border: 0 }} />
          <span style={{ fontSize: 17 }}>or</span>
          <i style={{ height: 1, background: '#e6e6eb', border: 0 }} />
        </div>

        {/* Skip */}
        <button
          type="button"
          onClick={onSkip}
          style={{
            display: 'block', margin: 'auto',
            padding: '8px 18px 14px',
            border: 0, background: 'transparent',
            color: '#858899', fontSize: 18, cursor: 'pointer',
          }}
        >
          Skip for now
        </button>
      </section>

      <style>{`
        .hh-onboard-option:hover {
          transform: translateY(-2px);
          box-shadow: 0 13px 28px rgba(22,24,53,0.09);
        }
        .hh-onboard-option:focus-visible {
          outline: 3px solid rgba(112,65,182,0.25);
          outline-offset: 3px;
        }
        @media (min-width: 700px) {
          .hh-onboarding-sheet {
            align-self: center;
            border-radius: 30px !important;
          }
        }
        @media (max-width: 430px) {
          .hh-onboarding-sheet {
            padding: 20px 18px 25px !important;
            border-radius: 26px 26px 0 0 !important;
          }
        }
        @media (max-height: 720px) {
          .hh-onboarding-sheet {
            min-height: 100dvh;
            border-radius: 0 !important;
          }
        }
      `}</style>
    </div>
  )
}
