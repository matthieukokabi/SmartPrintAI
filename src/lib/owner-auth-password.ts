import { randomBytes, scryptSync, timingSafeEqual } from 'crypto'

const SCRYPT_PREFIX = 'scrypt'
const SCRYPT_N = 16384
const SCRYPT_R = 8
const SCRYPT_P = 1
const SCRYPT_KEYLEN = 64

function normalizePassword(value: string): string {
    return value.normalize('NFKC')
}

function parseScryptHash(storedHash: string): {
    n: number
    r: number
    p: number
    salt: Buffer
    key: Buffer
} | null {
    const parts = storedHash.split('$')
    if (parts.length !== 6 || parts[0] !== SCRYPT_PREFIX) {
        return null
    }

    const nRaw = parts[1]
    const rRaw = parts[2]
    const pRaw = parts[3]
    const saltRaw = parts[4]
    const keyRaw = parts[5]
    const n = Number(nRaw)
    const r = Number(rRaw)
    const p = Number(pRaw)
    if (!Number.isFinite(n) || !Number.isFinite(r) || !Number.isFinite(p) || n <= 1 || r <= 0 || p <= 0) {
        return null
    }

    try {
        const salt = Buffer.from(saltRaw, 'base64url')
        const key = Buffer.from(keyRaw, 'base64url')
        if (salt.length < 16 || key.length < 32) {
            return null
        }
        return { n, r, p, salt, key }
    } catch {
        return null
    }
}

export function hashOwnerPassword(password: string): string {
    const normalized = normalizePassword(password)
    const salt = randomBytes(16)
    const key = scryptSync(normalized, salt, SCRYPT_KEYLEN, {
        N: SCRYPT_N,
        r: SCRYPT_R,
        p: SCRYPT_P,
        maxmem: 64 * 1024 * 1024,
    })

    return [
        SCRYPT_PREFIX,
        String(SCRYPT_N),
        String(SCRYPT_R),
        String(SCRYPT_P),
        salt.toString('base64url'),
        key.toString('base64url'),
    ].join('$')
}

export function verifyOwnerPassword(password: string, storedHash: string): boolean {
    const parsed = parseScryptHash(storedHash)
    if (!parsed) {
        return false
    }

    const normalized = normalizePassword(password)
    const derived = scryptSync(normalized, parsed.salt, parsed.key.length, {
        N: parsed.n,
        r: parsed.r,
        p: parsed.p,
        maxmem: 64 * 1024 * 1024,
    })

    if (derived.length !== parsed.key.length) {
        return false
    }

    return timingSafeEqual(derived, parsed.key)
}
