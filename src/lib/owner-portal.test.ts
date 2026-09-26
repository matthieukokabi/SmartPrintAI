import { describe, expect, it } from 'vitest'
import { canAccessOwnerPortal, evaluateOwnerPortalAccess, getOwnerPortalAllowlist } from '@/lib/owner-portal'

describe('owner portal access', () => {
  it('uses OWNER_PORTAL_EMAILS as primary allowlist', () => {
    const allowlist = getOwnerPortalAllowlist({
      OWNER_PORTAL_EMAILS: 'owner@zuerifix.tech, ops@zuerifix.tech ;invalid-entry',
      SUPPORT_EMAIL: 'print@zuerifix.tech',
    })

    expect(allowlist).toEqual(['owner@zuerifix.tech', 'ops@zuerifix.tech'])
  })

  it('falls back to SUPPORT_EMAIL when OWNER_PORTAL_EMAILS is missing', () => {
    const allowlist = getOwnerPortalAllowlist({
      SUPPORT_EMAIL: 'print@zuerifix.tech',
    })
    expect(allowlist).toEqual(['print@zuerifix.tech'])
  })

  it('denies access when allowlist is empty', () => {
    const decision = evaluateOwnerPortalAccess('print@zuerifix.tech', {})
    expect(decision.allowed).toBe(false)
    expect(decision.allowedEmails).toEqual([])
  })

  it('accepts normalized owner email and rejects non-owner email', () => {
    expect(canAccessOwnerPortal(' print@zuerifix.tech ', {
      OWNER_PORTAL_EMAILS: 'print@zuerifix.tech',
    })).toBe(true)

    expect(canAccessOwnerPortal('customer@example.com', {
      OWNER_PORTAL_EMAILS: 'print@zuerifix.tech',
    })).toBe(false)
  })
})
