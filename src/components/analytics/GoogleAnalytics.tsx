import Script from 'next/script'

export default function GoogleAnalytics() {
    const measurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID
    if (!measurementId) {
        return null
    }

    return (
        <>
            <Script
                src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`}
                strategy="afterInteractive"
            />
            <Script
                id="ga4-init"
                src="/ga4-init.js"
                data-measurement-id={measurementId}
                strategy="afterInteractive"
            />
        </>
    )
}
