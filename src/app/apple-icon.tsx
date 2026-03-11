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
                    background: 'radial-gradient(circle at 30% 20%, #5b21b6 0%, #1e1b4b 45%, #020617 100%)',
                    borderRadius: 42,
                }}
            >
                <div
                    style={{
                        width: 112,
                        height: 112,
                        borderRadius: 28,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background:
                            'linear-gradient(135deg, rgba(147,51,234,0.96) 0%, rgba(236,72,153,0.96) 100%)',
                        position: 'relative',
                    }}
                >
                    <div
                        style={{
                            width: 44,
                            height: 44,
                            borderRadius: 10,
                            transform: 'rotate(45deg)',
                            background: 'rgba(255,255,255,0.94)',
                            position: 'absolute',
                        }}
                    />
                    <div
                        style={{
                            width: 22,
                            height: 22,
                            borderRadius: 5,
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
