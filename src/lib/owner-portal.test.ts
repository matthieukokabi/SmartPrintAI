import { describe, expect, it } from 'vitest'
import { canAccessOwnerPortal, evaluateOwnerPortalAccess, getOwnerPortalAllowlist } from '@/lib/owner-portal'

describe('owner portal access', () => {
  it('uses OWNER_PORTAL_EMAILS as primary allowlist', () => {
    const allowlist = getOwnerPortalAllowlist({
      OWNER_PORTAL_EMAILS: 'Owner@SmartPrintAI.com, ops@smartprintai.com ;invalid-entry',
      SUPPORT_EMAIL: 'support@smartprintai.com',
    })

    expect(allowlist).toEqual(['owner@smartprintai.com', 'ops@smartprintai.com'])
  })

  it('falls back to SUPPORT_EMAIL when OWNER_PORTAL_EMAILS is missing', () => {
    const allowlist = getOwnerPortalAllowlist({
      SUPPORT_EMAIL: 'Support@SmartPrintAI.com',
    })
    expect(allowlist).toEqual(['support@smartprintai.com'])
  })

  it('denies access when allowlist is empty', () => {
    const decision = evaluateOwnerPortalAccess('owner@smartprintai.com', {})
    expect(decision.allowed).toBe(false)
    expect(decision.allowedEmails).toEqual([])
  })

  it('accepts normalized owner email and rejects non-owner email', () => {
    expect(canAccessOwnerPortal(' Owner@SmartPrintAI.com ', {
      OWNER_PORTAL_EMAILS: 'owner@smartprintai.com',
    })).toBe(true)

    expect(canAccessOwnerPortal('customer@example.com', {
      OWNER_PORTAL_EMAILS: 'owner@smartprintai.com',
    })).toBe(false)
  })
})
