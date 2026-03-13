import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'Rukny Form';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)',
          fontFamily: 'sans-serif',
        }}
      >
        {/* Logo */}
        <svg width="120" height="120" viewBox="0 0 512 512">
          <rect width="512" height="512" rx="96" ry="96" fill="#1a1a1a" />
          <rect x="208" y="128" width="120" height="80" rx="4" fill="#E2E855" />
          <rect x="128" y="224" width="120" height="136" rx="4" fill="#E2E855" />
          <path
            d="M268 224 L388 224 L388 320 C388 340 376 360 356 360 L308 360 L268 312 L268 224Z"
            fill="#E2E855"
          />
        </svg>
        {/* Brand */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            marginTop: 32,
            gap: 12,
          }}
        >
          <span
            style={{
              fontSize: 48,
              fontWeight: 700,
              color: '#E2E855',
              letterSpacing: '-0.02em',
            }}
          >
            Rukny.io
          </span>
          <span
            style={{
              fontSize: 24,
              color: 'rgba(255,255,255,0.6)',
            }}
          >
            نموذج على منصة ركني
          </span>
        </div>
      </div>
    ),
    { ...size }
  );
}
