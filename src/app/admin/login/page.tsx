import { redirect } from 'next/navigation'
import { OwnerLoginClient } from '@/components/admin/OwnerLoginClient'
import { getOwnerSessionFromCookieStore } from '@/lib/owner-auth-session'
import { canAccessOwnerPortal } from '@/lib/owner-portal'
import { buildOwnerLogoutPath, OWNER_ADMIN_DEFAULT_PATH, normalizeOwnerAdminPath } from '@/lib/owner-auth-route'

export const dynamic = 'force-dynamic'

type AdminLoginPageProps = {
    searchParams?: {
        next?: string
    }
}

export default function OwnerAdminLoginPage({ searchParams }: AdminLoginPageProps) {
    const nextPath = normalizeOwnerAdminPath(searchParams?.next, OWNER_ADMIN_DEFAULT_PATH)
    const session = getOwnerSessionFromCookieStore()
    if (session) {
        if (!canAccessOwnerPortal(session.email)) {
            redirect(buildOwnerLogoutPath(nextPath))
        }
        redirect(nextPath)
    }

    return <OwnerLoginClient nextPath={nextPath} />
}
