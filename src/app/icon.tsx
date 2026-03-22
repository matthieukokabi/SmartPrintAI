import { ImageResponse } from 'next/og'

export const size = {
    width: 512,
    height: 512,
}

export const contentType = 'image/png'

export default function Icon() {
    return new ImageResponse(
        (
            <div
                style={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'radial-gradient(circle at 18% 10%, #14284a 0%, #0a1730 42%, #060b16 100%)',
                    borderRadius: 96,
                }}
            >
                <div
                    style={{
                        width: 332,
                        height: 332,
                        borderRadius: 92,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: 'linear-gradient(180deg, rgba(12,22,43,0.98) 0%, rgba(6,12,25,0.98) 100%)',
                        border: '4px solid rgba(111,153,206,0.34)',
                        boxShadow: '0 24px 56px rgba(3,9,22,0.55)',
                    }}
                >
                    <svg width="256" height="256" viewBox="0 0 64 64" fill="none">
                        <defs>
                            <linearGradient id="icon-brand-stroke" x1="10" y1="10" x2="54" y2="54" gradientUnits="userSpaceOnUse">
                                <stop stopColor="#2E5FF7" />
                                <stop offset="1" stopColor="#26D4B8" />
                            </linearGradient>
                        </defs>
                        <path
                            d="M44 12.5C40.6 10.7 36.2 9.8 31.4 9.8C20.1 9.8 12.2 15.6 12.2 24.1C12.2 31.7 17.7 36.3 27.2 37.3L34.5 38.1C39.8 38.6 42.8 40.7 42.8 44C42.8 48.7 38.2 51.7 30.9 51.7C24.9 51.7 20 50.3 15.9 47.2"
                            stroke="url(#icon-brand-stroke)"
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
                        <circle cx="23.2" cy="39.2" r="2.3" fill="#9BF9EF" />
                        <circle cx="40.8" cy="17.8" r="2.3" fill="#9BF9EF" />
                        <circle cx="33.1" cy="41.9" r="2.3" fill="#D4FFF8" />
                    </svg>
                </div>
            </div>
        ),
        {
            ...size,
        }
    )
}
