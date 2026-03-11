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
                    background: 'radial-gradient(circle at 30% 20%, #5b21b6 0%, #1e1b4b 45%, #020617 100%)',
                    borderRadius: 96,
                }}
            >
                <div
                    style={{
                        width: 320,
                        height: 320,
                        borderRadius: 80,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background:
                            'linear-gradient(135deg, rgba(147,51,234,0.96) 0%, rgba(236,72,153,0.96) 100%)',
                        position: 'relative',
                        boxShadow: '0 28px 60px rgba(236,72,153,0.35)',
                    }}
                >
                    <div
                        style={{
                            width: 128,
                            height: 128,
                            borderRadius: 28,
                            transform: 'rotate(45deg)',
                            background: 'rgba(255,255,255,0.94)',
                            position: 'absolute',
                        }}
                    />
                    <div
                        style={{
                            width: 64,
                            height: 64,
                            borderRadius: 14,
                            transform: 'rotate(45deg)',
                            background: 'rgba(147,51,234,1)',
                            position: 'absolute',
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
