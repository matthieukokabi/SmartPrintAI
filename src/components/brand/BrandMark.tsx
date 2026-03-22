import { useId } from 'react'

type BrandMarkProps = {
    size?: number
    className?: string
}

export default function BrandMark({ size = 18, className }: BrandMarkProps) {
    const gradientId = useId().replace(/:/g, '')
    const strokeGradient = `brand-mark-stroke-${gradientId}`
    const glowGradient = `brand-mark-glow-${gradientId}`

    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 64 64"
            fill="none"
            aria-hidden="true"
            className={className}
        >
            <defs>
                <linearGradient id={strokeGradient} x1="10" y1="10" x2="54" y2="54" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#2E5FF7" />
                    <stop offset="1" stopColor="#26D4B8" />
                </linearGradient>
                <radialGradient id={glowGradient} cx="0" cy="0" r="1" gradientTransform="translate(32 32) rotate(90) scale(28)" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#3AA9F5" stopOpacity="0.28" />
                    <stop offset="1" stopColor="#3AA9F5" stopOpacity="0" />
                </radialGradient>
            </defs>
            <circle cx="32" cy="32" r="28" fill={`url(#${glowGradient})`} />
            <path
                d="M44 12.5C40.6 10.7 36.2 9.8 31.4 9.8C20.1 9.8 12.2 15.6 12.2 24.1C12.2 31.7 17.7 36.3 27.2 37.3L34.5 38.1C39.8 38.6 42.8 40.7 42.8 44C42.8 48.7 38.2 51.7 30.9 51.7C24.9 51.7 20 50.3 15.9 47.2"
                stroke={`url(#${strokeGradient})`}
                strokeWidth="7.2"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            <path
                d="M40.7 17.8C38.1 16.4 34.8 15.7 31.1 15.7C24.2 15.7 19.4 19.1 19.4 24.1C19.4 28.6 22.6 31.4 28.3 32L35.4 32.8C39 33.2 40.9 34.6 40.9 36.8C40.9 39.9 37.9 41.9 33.1 41.9C29.3 41.9 26.2 41 23.3 39.2"
                stroke="#0A1732"
                strokeWidth="2.15"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            <circle cx="23.2" cy="39.2" r="2.3" fill="#94FCF1" />
            <circle cx="40.8" cy="17.8" r="2.3" fill="#94FCF1" />
            <circle cx="33.1" cy="41.9" r="2.3" fill="#D8FEF7" />
        </svg>
    )
}
