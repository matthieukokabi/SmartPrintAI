'use client'

import { useEffect, useMemo, useState } from 'react'
import {
    CONSENT_COOKIE_NAME,
    CONSENT_MAX_AGE_SEC,
    readConsentStateFromValue,
    type ConsentState,
} from '@/lib/consent'
import { getLocaleCopy, type SupportedLocale } from '@/lib/i18n'

type CookieConsentBannerProps = {
    locale: SupportedLocale
}

// Reads consent_state from document.cookie. We can't trust `useEffect`'s
// first render to know the cookie, so we keep state="loading" until then.
function readCookieFromDocument(): ConsentState {
    if (typeof document === 'undefined') return 'unknown'
    const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${CONSENT_COOKIE_NAME}=([^;]+)`))
    return readConsentStateFromValue(match?.[1])
}

function writeConsentCookie(value: ConsentState): void {
    if (typeof document === 'undefined') return
    const secure = typeof window !== 'undefined' && window.location.protocol === 'https:'
    // Both `expires=` and `max-age=` set the same instant. max-age wins per
    // RFC 6265 in any browser that supports it (all modern ones do); the
    // explicit expires= is belt-and-braces defense for any oddly-old browser
    // that ignores max-age. Not a fix for an observed bug — the Phase 6
    // smoke claim of "~180 day cookie" was traced to a measurement artifact
    // (the agent was inspecting spai_visitor_id, which legitimately uses
    // HOMEPAGE_HERO_VARIANT_MAX_AGE_SEC = 180d).
    const expiresUtc = new Date(Date.now() + CONSENT_MAX_AGE_SEC * 1000).toUTCString()
    document.cookie =
        `${CONSENT_COOKIE_NAME}=${value}; ` +
        `path=/; ` +
        `expires=${expiresUtc}; ` +
        `max-age=${CONSENT_MAX_AGE_SEC}; ` +
        `samesite=lax` +
        (secure ? '; secure' : '')
}

// Notifies the gtag pipeline that the user accepted analytics. The call
// path has TWO subtleties — both verified empirically against the live
// production build — that future agents must respect:
//
//   1. Timing race vs <Script strategy="afterInteractive">.
//      React useEffect runs immediately after hydration; Next.js's
//      afterInteractive Script tags inject AFTER that. At useEffect
//      mount time on a returning visit, window.gtag is undefined. A
//      `typeof window.gtag === 'function'` guard silently bails and
//      drops the consent update for the entire session (verified Phase
//      6 smoke 2026-05-19 on commit e68c5a0). So we go through the
//      dataLayer queue instead, which the gtag library replays in
//      order when it eventually attaches.
//
//   2. Real-arrays vs arguments-objects in dataLayer.
//      gtag.js distinguishes between dataLayer entries created via the
//      standard `function gtag(){dataLayer.push(arguments)}` pattern
//      (arguments-object) and entries created via a direct
//      `dataLayer.push([...])` (real Array). Only the former is
//      recognized as a gtag command at queue-replay time. The direct
//      array push fires but is silently ignored (verified on commit
//      efada8c: ICS entry shows no `update: true` flag and GA4 cookies
//      are not refreshed). So we set up a local gtag-style shim that
//      pushes `arguments`, exactly mirroring what ga4-init.js does.
//
// Ordering note: ga4-init.js's `gtag('consent','default',{...denied...})`
// fires later in the queue than our `gtag('consent','update',{granted})`.
// Per Consent Mode v2 spec, `default` only initializes categories that
// have no prior explicit value — so the `update granted` wins for
// analytics_storage, while `default denied` still applies to ad_storage /
// ad_user_data / ad_personalization (which this update doesn't touch).
//
// Do not "simplify" this back to a direct window.gtag(...) call or a
// real-array dataLayer.push([...]) — both have been verified to silently
// break returning-visitor analytics, A/B experiment exposure, and Google
// Ads conversion tracking.
function fireGtagConsentUpdate(state: ConsentState): void {
    if (typeof window === 'undefined') return
    if (state !== 'accepted') return
    const w = window as unknown as { dataLayer?: unknown[] }
    w.dataLayer = w.dataLayer || []
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, prefer-rest-params
    const gtagShim = function (this: unknown): void {
        // eslint-disable-next-line prefer-rest-params
        w.dataLayer!.push(arguments)
    } as unknown as (...args: unknown[]) => void
    gtagShim('consent', 'update', { analytics_storage: 'granted' })
}

export default function CookieConsentBanner({ locale }: CookieConsentBannerProps) {
    const [state, setState] = useState<ConsentState | 'loading'>('loading')
    const copy = useMemo(() => getLocaleCopy(locale).consent, [locale])

    useEffect(() => {
        const initial = readCookieFromDocument()
        setState(initial)
        // ga4-init.js applies gtag('consent','default',{analytics_storage:
        // 'denied', ...}) on every page load BEFORE the gtag library finishes
        // loading. For a returning visitor who previously accepted, we have
        // to re-fire the consent update on mount; otherwise gtag stays
        // denied for the entire session and analytics + A/B exposure events
        // + Google Ads conversion pings are all silently lost. Verified
        // Phase 6 smoke 2026-05-19: without this re-grant,
        // window.google_tag_data.ics.entries.analytics_storage reports
        // { implicit: true, default: false } for returning consenting
        // visitors. Do not remove this without re-verifying the smoke.
        if (initial === 'accepted') {
            fireGtagConsentUpdate('accepted')
        }
    }, [])

    if (state === 'loading' || state === 'accepted' || state === 'rejected') {
        return null
    }

    function handleAccept() {
        writeConsentCookie('accepted')
        fireGtagConsentUpdate('accepted')
        setState('accepted')
    }

    function handleReject() {
        writeConsentCookie('rejected')
        // No gtag update: defaults stay denied. Reload not needed.
        setState('rejected')
    }

    return (
        <div
            role="dialog"
            aria-modal="false"
            aria-labelledby="cookie-banner-title"
            data-testid="cookie-consent-banner"
            style={{
                position: 'fixed',
                bottom: 16,
                left: 16,
                right: 16,
                maxWidth: 720,
                margin: '0 auto',
                zIndex: 80,
                background: 'rgba(11, 18, 34, 0.96)',
                border: '1px solid rgba(46, 102, 240, 0.4)',
                borderRadius: 16,
                padding: '20px 24px',
                color: '#e4e4e7',
                fontSize: 14,
                lineHeight: 1.5,
                boxShadow: '0 24px 48px -24px rgba(0, 0, 0, 0.6)',
                backdropFilter: 'blur(12px)',
            }}
        >
            <h2
                id="cookie-banner-title"
                style={{ fontSize: 16, fontWeight: 700, margin: '0 0 8px', color: '#f4f4f5' }}
            >
                {copy.title}
            </h2>
            <p style={{ margin: '0 0 16px', color: '#a1a1aa' }}>{copy.body}</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
                <button
                    type="button"
                    onClick={handleReject}
                    data-testid="cookie-consent-reject"
                    style={{
                        padding: '10px 18px',
                        borderRadius: 10,
                        border: '1px solid #3f3f46',
                        background: 'transparent',
                        color: '#e4e4e7',
                        cursor: 'pointer',
                        fontSize: 14,
                        fontWeight: 500,
                    }}
                >
                    {copy.reject}
                </button>
                <button
                    type="button"
                    onClick={handleAccept}
                    data-testid="cookie-consent-accept"
                    style={{
                        padding: '10px 18px',
                        borderRadius: 10,
                        border: 'none',
                        background: 'linear-gradient(90deg,#2f6cf3,#26d4b8)',
                        color: '#ffffff',
                        cursor: 'pointer',
                        fontSize: 14,
                        fontWeight: 600,
                    }}
                >
                    {copy.accept}
                </button>
                <a
                    href={locale === 'en' ? '/privacy#cookies' : `/${locale}/privacy#cookies`}
                    style={{ color: '#93c5fd', fontSize: 13, textDecoration: 'underline' }}
                >
                    {copy.learnMore}
                </a>
            </div>
        </div>
    )
}
