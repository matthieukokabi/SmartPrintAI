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

// Notifies the loaded gtag library (if any) that the user just accepted
// analytics. Default state is "denied" until this fires. Loading gtag
// before this runs is fine — Consent Mode v2 honors the default-denied
// state and only enables storage after the update call.
function fireGtagConsentUpdate(state: ConsentState): void {
    if (typeof window === 'undefined') return
    const w = window as unknown as {
        gtag?: (cmd: string, action: string, params: Record<string, string>) => void
    }
    if (typeof w.gtag !== 'function') return
    if (state === 'accepted') {
        w.gtag('consent', 'update', {
            analytics_storage: 'granted',
        })
    }
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
