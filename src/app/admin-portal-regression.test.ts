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
    const ownerPortalServer = readFile('src/lib/owner-portal-server.ts')

    expect(adminPage).toContain("requireOwnerPortalSession('/admin')")
    expect(adminOrderPage).toContain('requireOwnerPortalSession(`/admin/orders/${params.id}`)')
    expect(ownerPortalServer).toContain("buildOwnerLoginPath")
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
    expect(adminPage).toContain('/api/admin/auth/logout')
  })

  it('keeps dedicated admin login route and copy', () => {
    const adminLoginPage = readFile('src/app/admin/login/page.tsx')
    const ownerLoginClient = readFile('src/components/admin/OwnerLoginClient.tsx')
    expect(adminLoginPage).toContain("normalizeOwnerAdminPath")
    expect(adminLoginPage).toContain('canAccessOwnerPortal')
    expect(adminLoginPage).toContain('buildOwnerLogoutPath')
    expect(ownerLoginClient).toContain('Owner / Admin Sign In')
    expect(ownerLoginClient).toContain('/api/admin/auth/login')
  })
})
