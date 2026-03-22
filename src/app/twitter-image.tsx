import { ImageResponse } from 'next/og'

export const size = {
    width: 1200,
    height: 630,
}

export const contentType = 'image/png'

export default function TwitterImage() {
    return new ImageResponse(
        (
            <div
                style={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background:
                        'radial-gradient(circle at 16% 8%, rgba(46,95,247,0.28) 0%, rgba(10,23,48,0.95) 45%, #060b16 100%)',
                    color: '#e8f2ff',
                    fontFamily: 'Manrope, Inter, system-ui, sans-serif',
                    padding: '56px 72px',
                }}
            >
                <div
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        width: 760,
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginBottom: 28 }}>
                        <div
                            style={{
                                width: 76,
                                height: 76,
                                borderRadius: 20,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                background: 'linear-gradient(180deg, rgba(11,20,40,0.96) 0%, rgba(7,13,27,0.98) 100%)',
                                border: '1px solid rgba(112,156,212,0.42)',
                            }}
                        >
                            <svg width="54" height="54" viewBox="0 0 64 64" fill="none">
                                <defs>
                                    <linearGradient id="twitter-brand-stroke" x1="10" y1="10" x2="54" y2="54" gradientUnits="userSpaceOnUse">
                                        <stop stopColor="#2E5FF7" />
                                        <stop offset="1" stopColor="#26D4B8" />
                                    </linearGradient>
                                </defs>
                                <path
                                    d="M44 12.5C40.6 10.7 36.2 9.8 31.4 9.8C20.1 9.8 12.2 15.6 12.2 24.1C12.2 31.7 17.7 36.3 27.2 37.3L34.5 38.1C39.8 38.6 42.8 40.7 42.8 44C42.8 48.7 38.2 51.7 30.9 51.7C24.9 51.7 20 50.3 15.9 47.2"
                                    stroke="url(#twitter-brand-stroke)"
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
                        <div style={{ display: 'flex', fontSize: 42, fontWeight: 700, letterSpacing: '-0.02em' }}>
                            <span>SmartPrint</span>
                            <span style={{ marginLeft: 2, color: '#26D4B8' }}>
                                AI
                            </span>
                        </div>
                    </div>
                    <div style={{ fontSize: 68, lineHeight: 1.08, fontWeight: 700, letterSpacing: '-0.03em', marginBottom: 16 }}>
                        Prompt to product in minutes, ready for checkout.
                    </div>
                    <div style={{ fontSize: 31, opacity: 0.88, lineHeight: 1.34, maxWidth: 700 }}>
                        Generate print-ready art, approve premium mockups, and launch products customers can buy immediately.
                    </div>
                </div>
                <div
                    style={{
                        width: 280,
                        height: 410,
                        borderRadius: 30,
                        border: '1px solid rgba(109,154,214,0.4)',
                        background: 'linear-gradient(180deg, rgba(9,20,40,0.9) 0%, rgba(8,15,30,0.95) 100%)',
                        boxShadow: '0 18px 44px rgba(3,9,22,0.45)',
                        padding: '28px 24px',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                    }}
                >
                    <div style={{ fontSize: 21, color: '#95a9c7', textTransform: 'uppercase', letterSpacing: '0.12em' }}>Flow</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, fontSize: 28, fontWeight: 600 }}>
                        <span>Prompt</span>
                        <span style={{ color: '#26D4B8' }}>AI Design</span>
                        <span>Product Mockup</span>
                        <span style={{ color: '#2E5FF7' }}>Checkout Live</span>
                    </div>
                    <div
                        style={{
                            height: 8,
                            borderRadius: 999,
                            background: 'linear-gradient(90deg, #2E5FF7 0%, #26D4B8 100%)',
                        }}
                    />
                </div>
            </div>
        ),
        {
            ...size,
        }
    )
}
