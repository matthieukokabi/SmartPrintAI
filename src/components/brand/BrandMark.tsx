import { useId } from 'react'

type BrandMarkProps = {
    size?: number
    className?: string
}

export default function BrandMark({ size = 18, className }: BrandMarkProps) {
    const gradientId = useId().replace(/:/g, '')

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
                <linearGradient id={`brand-mark-${gradientId}`} x1="10" y1="10" x2="54" y2="54" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#F97316" />
                    <stop offset="1" stopColor="#0EA5E9" />
                </linearGradient>
            </defs>
            <circle cx="32" cy="32" r="29" fill={`url(#brand-mark-${gradientId})`} />
            <circle cx="32" cy="32" r="28" stroke="#0F172A" strokeWidth="2.5" />
            <path
                d="M32 16L35.7 26.3L46 30L35.7 33.7L32 44L28.3 33.7L18 30L28.3 26.3L32 16Z"
                fill="#FFFFFF"
                stroke="#0F172A"
                strokeWidth="2"
                strokeLinejoin="round"
            />
            <path d="M40.5 19.5C46 21 50 25.5 51.5 31" stroke="#0F172A" strokeWidth="2.2" strokeLinecap="round" />
            <circle cx="52.5" cy="32" r="2.7" fill="#0F172A" />
        </svg>
    )
}
