import { createHmac, timingSafeEqual } from 'crypto'
import { cookies } from 'next/headers'

export const OWNER_AUTH_COOKIE_NAME = 'spai_owner_session'

type OwnerSignedPayload = {
    email: string
    exp: number
    purpose: 'owner_session'
}

export type OwnerAuthSession = {
    email: string
}

type RequestLike = {
    cookies: {
        get: (name: string) => { value?: string } | undefined
    }
}

type ResponseLike = {
    cookies: {
        set: (name: string, value: string, options: Record<string, unknown>) => void
    }
}

function getAuthSecret(): string {
    const secret = process.env.AUTH_SESSION_SECRET
    if (!secret || secret.trim().length < 16) {
        throw new Error('AUTH_SESSION_SECRET must be set (minimum 16 chars)')
    }
    return secret
}

function signEncodedPayload(encodedPayload: string): Buffer {
    return createHmac('sha256', getAuthSecret()).update(encodedPayload).digest()
}

function encodePayload(payload: OwnerSignedPayload): string {
    return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url')
}

function decodePayload(encodedPayload: string): OwnerSignedPayload | null {
    try {
        const raw = Buffer.from(encodedPayload, 'base64url').toString('utf8')
        const parsed = JSON.parse(raw) as OwnerSignedPayload
        if (!parsed || typeof parsed !== 'object') return null
        if (parsed.purpose !== 'owner_session') return null
        if (typeof parsed.email !== 'string' || parsed.email.trim().length === 0 || parsed.email.length > 254) return null
        if (typeof parsed.exp !== 'number' || !Number.isFinite(parsed.exp)) return null

        return {
            ...parsed,
            email: parsed.email.trim().toLowerCase(),
        }
    } catch {
        return null
    }
}

function createSignedToken(payload: OwnerSignedPayload): string {
    const encodedPayload = encodePayload(payload)
    const signature = signEncodedPayload(encodedPayload).toString('base64url')
    return `${encodedPayload}.${signature}`
}

function verifySignedToken(token: string): OwnerSignedPayload | null {
    const parts = token.split('.')
    if (parts.length !== 2) return null

    const [encodedPayload, signatureRaw] = parts
    if (!encodedPayload || !signatureRaw) return null

    let providedSignature: Buffer
    try {
        providedSignature = Buffer.from(signatureRaw, 'base64url')
    } catch {
        return null
    }

    const expectedSignature = signEncodedPayload(encodedPayload)
    if (providedSignature.length !== expectedSignature.length) return null
    if (!timingSafeEqual(providedSignature, expectedSignature)) return null

    const payload = decodePayload(encodedPayload)
    if (!payload) return null
    if (payload.exp < Math.floor(Date.now() / 1000)) return null

    return payload
}

export function createOwnerSessionToken(email: string, ttlSec = 30 * 24 * 60 * 60): string {
    return createSignedToken({
        email: email.trim().toLowerCase(),
        purpose: 'owner_session',
        exp: Math.floor(Date.now() / 1000) + ttlSec,
    })
}

export function readOwnerSessionToken(token: string): OwnerAuthSession | null {
    const payload = verifySignedToken(token)
    if (!payload || payload.purpose !== 'owner_session') {
        return null
    }
    return { email: payload.email }
}

export function getOwnerSessionFromRequest(req: RequestLike): OwnerAuthSession | null {
    const token = req.cookies.get(OWNER_AUTH_COOKIE_NAME)?.value
    if (!token) return null
    return readOwnerSessionToken(token)
}

export function getOwnerSessionFromCookieStore(): OwnerAuthSession | null {
    const token = cookies().get(OWNER_AUTH_COOKIE_NAME)?.value
    if (!token) return null
    return readOwnerSessionToken(token)
}

export function setOwnerSessionCookie(response: ResponseLike, token: string) {
    response.cookies.set(OWNER_AUTH_COOKIE_NAME, token, {
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
        path: '/',
        maxAge: 30 * 24 * 60 * 60,
    })
}

export function clearOwnerSessionCookie(response: ResponseLike) {
    response.cookies.set(OWNER_AUTH_COOKIE_NAME, '', {
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
        path: '/',
        maxAge: 0,
    })
}
