import { notFound, redirect } from 'next/navigation'
import { AuthSession, getSessionFromCookieStore } from '@/lib/auth-session'
import { canAccessOwnerPortal } from '@/lib/owner-portal'
import { buildSignInPath, OWNER_AUTH_CALLBACK_PATH } from '@/lib/auth-callback'

export function requireOwnerPortalSession(callbackPath: string = OWNER_AUTH_CALLBACK_PATH): AuthSession {
    const session = getSessionFromCookieStore()
    if (!session) {
        redirect(buildSignInPath(callbackPath))
    }
    if (!canAccessOwnerPortal(session.email)) {
        notFound()
    }
    return session
}
