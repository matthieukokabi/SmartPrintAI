import { ImageResponse } from 'next/og'

export const size = {
    width: 180,
    height: 180,
}

export const contentType = 'image/png'

export default function AppleIcon() {
    return new ImageResponse(
        (
            <div
                style={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'radial-gradient(circle at 20% 10%, #14284a 0%, #0a1730 42%, #060b16 100%)',
                    borderRadius: 42,
                }}
            >
                <div
                    style={{
                        width: 118,
                        height: 118,
                        borderRadius: 32,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: 'linear-gradient(180deg, rgba(12,22,43,0.98) 0%, rgba(6,12,25,0.98) 100%)',
                        border: '2px solid rgba(111,153,206,0.35)',
                    }}
                >
                    <svg width="92" height="92" viewBox="0 0 64 64" fill="none">
                        <defs>
                            <linearGradient id="apple-brand-stroke" x1="10" y1="10" x2="54" y2="54" gradientUnits="userSpaceOnUse">
                                <stop stopColor="#2E5FF7" />
                                <stop offset="1" stopColor="#26D4B8" />
                            </linearGradient>
                        </defs>
                        <path
                            d="M44 12.5C40.6 10.7 36.2 9.8 31.4 9.8C20.1 9.8 12.2 15.6 12.2 24.1C12.2 31.7 17.7 36.3 27.2 37.3L34.5 38.1C39.8 38.6 42.8 40.7 42.8 44C42.8 48.7 38.2 51.7 30.9 51.7C24.9 51.7 20 50.3 15.9 47.2"
                            stroke="url(#apple-brand-stroke)"
                            strokeWidth="7.2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                        <path
                            d="M40.7 17.8C38.1 16.4 34.8 15.7 31.1 15.7C24.2 15.7 19.4 19.1 19.4 24.1C19.4 28.6 22.6 31.4 28.3 32L35.4 32.8C39 33.2 40.9 34.6 40.9 36.8C40.9 39.9 37.9 41.9 33.1 41.9C29.3 41.9 26.2 41 23.3 39.2"
                            stroke="#0A1732"
                            strokeWidth="2.2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                    </svg>
                </div>
            </div>
        ),
        {
            ...size,
        }
    )
}
