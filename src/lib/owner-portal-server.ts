import { notFound, redirect } from 'next/navigation'
import { AuthSession, getSessionFromCookieStore } from '@/lib/auth-session'
import { canAccessOwnerPortal } from '@/lib/owner-portal'

export function requireOwnerPortalSession(): AuthSession {
    const session = getSessionFromCookieStore()
    if (!session) {
        redirect('/signin')
    }
    if (!canAccessOwnerPortal(session.email)) {
        notFound()
    }
    return session
}
