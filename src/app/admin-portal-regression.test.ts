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

    expect(adminPage).toContain('requireOwnerPortalSession()')
    expect(adminOrderPage).toContain('requireOwnerPortalSession()')
  })

  it('keeps support intake persistence wired in support api route', () => {
    const supportRoute = readFile('src/app/api/support/route.ts')
    expect(supportRoute).toContain('appendSupportIntakeRecord')
  })
})
