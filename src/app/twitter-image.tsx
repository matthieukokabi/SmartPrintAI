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
                    background:
                        'radial-gradient(circle at 20% 10%, rgba(168,85,247,0.45) 0%, rgba(17,24,39,0.95) 40%, #020617 100%)',
                    color: '#ffffff',
                    fontFamily: 'Inter, system-ui, sans-serif',
                    padding: '56px 72px',
                    position: 'relative',
                }}
            >
                <div
                    style={{
                        position: 'absolute',
                        right: 70,
                        top: 52,
                        width: 180,
                        height: 180,
                        borderRadius: 46,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background:
                            'linear-gradient(135deg, rgba(147,51,234,0.98) 0%, rgba(236,72,153,0.98) 100%)',
                    }}
                >
                    <div
                        style={{
                            width: 68,
                            height: 68,
                            borderRadius: 18,
                            transform: 'rotate(45deg)',
                            background: 'rgba(255,255,255,0.94)',
                            position: 'absolute',
                        }}
                    />
                    <div
                        style={{
                            width: 32,
                            height: 32,
                            borderRadius: 8,
                            transform: 'rotate(45deg)',
                            background: 'rgba(147,51,234,1)',
                            position: 'absolute',
                        }}
                    />
                </div>

                <div
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                        width: 840,
                    }}
                >
                    <div style={{ fontSize: 34, opacity: 0.9, marginBottom: 18 }}>SmartPrintAI</div>
                    <div style={{ fontSize: 68, lineHeight: 1.1, fontWeight: 700, marginBottom: 16 }}>
                        Describe it. AI creates it. We print it.
                    </div>
                    <div style={{ fontSize: 30, opacity: 0.84, lineHeight: 1.35 }}>
                        Custom products with AI-generated designs, ready to order in minutes.
                    </div>
                </div>
            </div>
        ),
        {
            ...size,
        }
    )
}
