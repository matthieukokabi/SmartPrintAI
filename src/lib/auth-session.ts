import { createHmac, timingSafeEqual } from 'crypto'
import { cookies } from 'next/headers'

export const AUTH_COOKIE_NAME = 'spai_session'

type SignedPayload = {
    email: string
    exp: number
    purpose: 'signin_link' | 'session'
    userId?: string
}

export type AuthSession = {
    userId: string
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

function encodePayload(payload: SignedPayload): string {
    return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url')
}

function decodePayload(encodedPayload: string): SignedPayload | null {
    try {
        const raw = Buffer.from(encodedPayload, 'base64url').toString('utf8')
        const parsed = JSON.parse(raw) as SignedPayload

        if (typeof parsed !== 'object' || parsed === null) return null
        if (typeof parsed.email !== 'string' || parsed.email.trim().length === 0 || parsed.email.length > 254) return null
        if (typeof parsed.exp !== 'number' || !Number.isFinite(parsed.exp)) return null
        if (parsed.purpose !== 'signin_link' && parsed.purpose !== 'session') return null
        if (parsed.userId !== undefined && typeof parsed.userId !== 'string') return null

        return {
            ...parsed,
            email: parsed.email.trim().toLowerCase(),
        }
    } catch {
        return null
    }
}

function createSignedToken(payload: SignedPayload): string {
    const encodedPayload = encodePayload(payload)
    const signature = signEncodedPayload(encodedPayload).toString('base64url')
    return encodedPayload + '.' + signature
}

function verifySignedToken(token: string): SignedPayload | null {
    const parts = token.split('.')
    if (parts.length !== 2) {
        return null
    }

    const encodedPayload = parts[0]
    const signatureRaw = parts[1]
    if (!encodedPayload || !signatureRaw) {
        return null
    }

    let providedSignature: Buffer
    try {
        providedSignature = Buffer.from(signatureRaw, 'base64url')
    } catch {
        return null
    }

    const expectedSignature = signEncodedPayload(encodedPayload)
    if (providedSignature.length !== expectedSignature.length) {
        return null
    }

    if (!timingSafeEqual(providedSignature, expectedSignature)) {
        return null
    }

    const payload = decodePayload(encodedPayload)
    if (!payload) {
        return null
    }

    if (payload.exp < Math.floor(Date.now() / 1000)) {
        return null
    }

    return payload
}

export function createSignInLinkToken(email: string, ttlSec = 15 * 60): string {
    const normalizedEmail = email.trim().toLowerCase()
    return createSignedToken({
        email: normalizedEmail,
        purpose: 'signin_link',
        exp: Math.floor(Date.now() / 1000) + ttlSec,
    })
}

export function readSignInLinkToken(token: string): { email: string } | null {
    const payload = verifySignedToken(token)
    if (!payload || payload.purpose !== 'signin_link') {
        return null
    }

    return { email: payload.email }
}

export function createSessionToken(userId: string, email: string, ttlSec = 30 * 24 * 60 * 60): string {
    return createSignedToken({
        userId,
        email: email.trim().toLowerCase(),
        purpose: 'session',
        exp: Math.floor(Date.now() / 1000) + ttlSec,
    })
}

export function readSessionToken(token: string): AuthSession | null {
    const payload = verifySignedToken(token)
    if (!payload || payload.purpose !== 'session' || !payload.userId) {
        return null
    }

    return {
        userId: payload.userId,
        email: payload.email,
    }
}

export function getSessionFromRequest(req: RequestLike): AuthSession | null {
    const token = req.cookies.get(AUTH_COOKIE_NAME)?.value
    if (!token) return null
    return readSessionToken(token)
}

export function getSessionFromCookieStore(): AuthSession | null {
    const token = cookies().get(AUTH_COOKIE_NAME)?.value
    if (!token) return null
    return readSessionToken(token)
}

export function setSessionCookie(response: ResponseLike, token: string) {
    response.cookies.set(AUTH_COOKIE_NAME, token, {
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
        path: '/',
        maxAge: 30 * 24 * 60 * 60,
    })
}

export function clearSessionCookie(response: ResponseLike) {
    response.cookies.set(AUTH_COOKIE_NAME, '', {
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
        path: '/',
        maxAge: 0,
    })
}
