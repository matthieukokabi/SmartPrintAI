import { notFound, redirect } from 'next/navigation'
import { OwnerAuthSession, getOwnerSessionFromCookieStore } from '@/lib/owner-auth-session'
import { canAccessOwnerPortal } from '@/lib/owner-portal'
import { buildOwnerLoginPath, OWNER_ADMIN_DEFAULT_PATH, normalizeOwnerAdminPath } from '@/lib/owner-auth-route'

export function requireOwnerPortalSession(callbackPath: string = OWNER_ADMIN_DEFAULT_PATH): OwnerAuthSession {
    const session = getOwnerSessionFromCookieStore()
    const normalizedPath = normalizeOwnerAdminPath(callbackPath, OWNER_ADMIN_DEFAULT_PATH)
    if (!session) {
        redirect(buildOwnerLoginPath(normalizedPath))
    }
    if (!canAccessOwnerPortal(session.email)) {
        notFound()
    }
    return session
}
