import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'Mason Market | GMU Student Marketplace'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

// ponytail: system sans instead of a fetched Outfit/Geist woff2 — this is a
// generated share-card asset, not the live site's type voice, and a runtime
// font fetch adds a network dependency to every card render for a one-off.
// Swap in the real brand font here if that trade-off stops being worth it.
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: '#006B3C',
          padding: 80,
          position: 'relative',
        }}
      >
        {/* Gold accent shapes — echo the brand's gold pop color without a photo */}
        <div
          style={{
            position: 'absolute',
            top: -140,
            right: -140,
            width: 420,
            height: 420,
            borderRadius: 420,
            background: '#C9A227',
            opacity: 0.18,
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: -200,
            left: -120,
            width: 480,
            height: 480,
            borderRadius: 480,
            background: '#C9A227',
            opacity: 0.12,
          }}
        />

        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 64,
              height: 64,
              borderRadius: 18,
              background: '#C9A227',
              color: '#3D2E00',
              fontSize: 32,
              fontWeight: 800,
            }}
          >
            M
          </div>
          <div style={{ display: 'flex', color: '#F1F0EC', fontSize: 28, fontWeight: 700, letterSpacing: -0.5 }}>
            MASON MARKET
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div
            style={{
              display: 'flex',
              color: '#FFFFFF',
              fontSize: 76,
              fontWeight: 800,
              lineHeight: 1.05,
              letterSpacing: -2,
              maxWidth: 920,
            }}
          >
            Buy &amp; sell with fellow Patriots
          </div>
          <div style={{ display: 'flex', color: '#D9EFE2', fontSize: 30, fontWeight: 500, maxWidth: 820 }}>
            The trusted student marketplace for George Mason University
          </div>
        </div>

        <div style={{ display: 'flex', gap: 14 }}>
          {['Verified GMU', 'Fairfax · Arlington · Sci-Tech', 'Meet on campus'].map((label) => (
            <div
              key={label}
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '10px 20px',
                borderRadius: 999,
                background: 'rgba(255,255,255,0.12)',
                color: '#F1F0EC',
                fontSize: 20,
                fontWeight: 600,
              }}
            >
              {label}
            </div>
          ))}
        </div>
      </div>
    ),
    { ...size }
  )
}
