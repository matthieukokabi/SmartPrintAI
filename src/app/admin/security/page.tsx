import { OwnerSecurityClient } from '@/components/admin/OwnerSecurityClient'
import { OWNER_AUTH_DEFAULT_MIN_PASSWORD_LENGTH, OWNER_AUTH_MIN_PASSWORD_LENGTH_ENV_KEY, getOwnerCredentialState } from '@/lib/owner-auth'
import { requireOwnerPortalSession } from '@/lib/owner-portal-server'

export const dynamic = 'force-dynamic'

type AdminSecurityPageProps = {
    searchParams?: {
        required?: string
    }
}

function getMinPasswordLengthFromEnv(): number {
    const raw = Number(process.env[OWNER_AUTH_MIN_PASSWORD_LENGTH_ENV_KEY])
    if (!Number.isFinite(raw) || raw < 8 || raw > 128) {
        return OWNER_AUTH_DEFAULT_MIN_PASSWORD_LENGTH
    }
    return Math.floor(raw)
}

export default async function OwnerSecurityPage({ searchParams }: AdminSecurityPageProps) {
    const session = requireOwnerPortalSession('/admin/security')
    const ownerCredential = await getOwnerCredentialState(session.email)
    const requiredRotation = searchParams?.required === '1' || ownerCredential.mustRotatePassword

    return (
        <OwnerSecurityClient
            requiredRotation={requiredRotation}
            minPasswordLength={getMinPasswordLengthFromEnv()}
        />
    )
}
