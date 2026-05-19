import { NextRequest } from 'next/server'

// 12 months: max recommended by EDPB for a "yes/no" cookie consent
// before re-prompting. Matches the CNIL/IAB-EU baseline.
export const CONSENT_COOKIE_NAME = 'consent_state'
export const CONSENT_MAX_AGE_SEC = 60 * 60 * 24 * 365

export type ConsentState = 'accepted' | 'rejected' | 'unknown'

export function isValidConsentState(value: string | null | undefined): value is ConsentState {
    return value === 'accepted' || value === 'rejected' || value === 'unknown'
}

// Server-side helper used by /api/analytics/events to gate event writes.
export function readConsentState(req: NextRequest): ConsentState {
    const raw = req.cookies.get(CONSENT_COOKIE_NAME)?.value
    if (isValidConsentState(raw)) return raw
    return 'unknown'
}

// Variant for callers that already have the raw cookie value
// (e.g. the client banner reading document.cookie).
export function readConsentStateFromValue(value: string | null | undefined): ConsentState {
    if (isValidConsentState(value)) return value
    return 'unknown'
}
