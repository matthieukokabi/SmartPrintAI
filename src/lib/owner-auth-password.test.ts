import { describe, expect, it } from 'vitest'
import { hashOwnerPassword, verifyOwnerPassword } from '@/lib/owner-auth-password'

describe('owner auth password hashing', () => {
    it('hashes and verifies a password', () => {
        const hash = hashOwnerPassword('StrongP@ssw0rd123!')
        expect(hash.startsWith('scrypt$')).toBe(true)
        expect(verifyOwnerPassword('StrongP@ssw0rd123!', hash)).toBe(true)
    })

    it('rejects wrong password and malformed hashes', () => {
        const hash = hashOwnerPassword('AnotherP@ss123!')
        expect(verifyOwnerPassword('wrong-password', hash)).toBe(false)
        expect(verifyOwnerPassword('AnotherP@ss123!', 'invalid')).toBe(false)
    })
})
