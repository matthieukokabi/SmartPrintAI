import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

function readFile(filePath: string): string {
  return fs.readFileSync(path.join(process.cwd(), filePath), 'utf8')
}

describe('owner operations portal regression guards', () => {
  it('keeps owner-session gating on admin routes', () => {
    const adminPage = readFile('src/app/admin/page.tsx')
    const adminOrderPage = readFile('src/app/admin/orders/[id]/page.tsx')

    expect(adminPage).toContain("requireOwnerPortalSession('/admin')")
    expect(adminOrderPage).toContain('requireOwnerPortalSession(`/admin/orders/${params.id}`)')
  })

  it('keeps admin route aliases consistent', () => {
    const adminOrdersPage = readFile('src/app/admin/orders/page.tsx')
    const legacyAdminOrderPage = readFile('src/app/admin/order/[id]/page.tsx')

    expect(adminOrdersPage).toContain("redirect('/admin')")
    expect(legacyAdminOrderPage).toContain('redirect(`/admin/orders/${params.id}`)')
  })

  it('keeps support intake persistence wired in support api route', () => {
    const supportRoute = readFile('src/app/api/support/route.ts')
    expect(supportRoute).toContain('appendSupportIntakeRecord')
  })

  it('keeps owner order discovery controls in admin portal', () => {
    const adminPage = readFile('src/app/admin/page.tsx')
    expect(adminPage).toContain('Search by order id, short id, email')
    expect(adminPage).toContain('name="q"')
    expect(adminPage).toContain('name="status"')
  })

  it('shows owner-specific sign-in context copy when callback targets admin', () => {
    const signInPage = readFile('src/app/signin/page.tsx')
    expect(signInPage).toContain('Owner / Admin Sign In')
    expect(signInPage).toContain('operations portal')
    expect(signInPage).toContain('callbackUrl')
  })
})
