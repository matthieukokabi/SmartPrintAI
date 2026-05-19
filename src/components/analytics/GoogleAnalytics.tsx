import Script from 'next/script'

// Consent Mode v2: ga4-init.js sets all consent categories to "denied"
// BEFORE gtag('config') runs, so loading this component pre-consent is
// safe and intended — cookieless pings flow for Google's consent-mode
// modeling. The CookieConsentBanner's Accept handler fires
// gtag('consent','update',{analytics_storage:'granted'}) afterwards.
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
