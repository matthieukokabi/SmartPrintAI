import { describe, expect, it } from 'vitest'
import { buildOwnerLoginPath, normalizeOwnerAdminPath } from '@/lib/owner-auth-route'

describe('owner auth route helpers', () => {
    it('normalizes only safe admin paths', () => {
        expect(normalizeOwnerAdminPath('/admin')).toBe('/admin')
        expect(normalizeOwnerAdminPath('/admin/orders/cmn3p5lxs000c8fl2tvkivxxw')).toBe('/admin/orders/cmn3p5lxs000c8fl2tvkivxxw')
        expect(normalizeOwnerAdminPath('/products')).toBe('/admin')
        expect(normalizeOwnerAdminPath('https://evil.example/admin')).toBe('/admin')
    })

    it('builds owner login path with encoded next', () => {
        expect(buildOwnerLoginPath('/admin/orders/cmn3p5lxs000c8fl2tvkivxxw')).toBe(
            '/admin/login?next=%2Fadmin%2Forders%2Fcmn3p5lxs000c8fl2tvkivxxw',
        )
    })
})
