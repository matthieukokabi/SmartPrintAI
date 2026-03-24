'use client'

import Link from 'next/link'
import { FormEvent, useState } from 'react'

type SubmitState = 'idle' | 'submitting' | 'success' | 'error'

type OwnerSecurityClientProps = {
    requiredRotation: boolean
    minPasswordLength: number
}

export function OwnerSecurityClient({ requiredRotation, minPasswordLength }: OwnerSecurityClientProps) {
    const [currentPassword, setCurrentPassword] = useState('')
    const [newPassword, setNewPassword] = useState('')
    const [submitState, setSubmitState] = useState<SubmitState>('idle')
    const [message, setMessage] = useState('')

    async function onSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault()
        setSubmitState('submitting')
        setMessage('')

        try {
            const res = await fetch('/api/admin/auth/change-password', {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ currentPassword, newPassword }),
            })

            const data = await res.json()
            if (!res.ok) {
                setSubmitState('error')
                setMessage(data.error || 'Unable to update owner password')
                return
            }

            setSubmitState('success')
            setCurrentPassword('')
            setNewPassword('')
            setMessage('Owner password updated successfully.')
        } catch {
            setSubmitState('error')
            setMessage('Unable to update owner password')
        }
    }

    return (
        <div className="mx-auto w-full max-w-3xl px-4 py-10 space-y-6">
            <header className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
                <h1 className="text-2xl font-semibold text-foreground">Owner Security</h1>
                <p className="mt-2 text-sm text-muted-foreground">
                    Manage password-based admin access for SmartPrintAI operations.
                </p>
                {requiredRotation ? (
                    <p className="mt-3 rounded-lg border border-amber-400/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
                        First login detected. Change the bootstrap password now before continuing operations.
                    </p>
                ) : null}
            </header>

            <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
                <form className="space-y-4" onSubmit={onSubmit}>
                    <div className="space-y-1.5">
                        <label className="text-sm font-medium text-foreground" htmlFor="current-password">
                            Current password
                        </label>
                        <input
                            id="current-password"
                            type="password"
                            autoComplete="current-password"
                            required
                            value={currentPassword}
                            onChange={(event) => setCurrentPassword(event.target.value)}
                            className="app-input w-full rounded-xl px-3.5 py-3 text-sm outline-none"
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-sm font-medium text-foreground" htmlFor="new-password">
                            New password
                        </label>
                        <input
                            id="new-password"
                            type="password"
                            autoComplete="new-password"
                            minLength={minPasswordLength}
                            required
                            value={newPassword}
                            onChange={(event) => setNewPassword(event.target.value)}
                            className="app-input w-full rounded-xl px-3.5 py-3 text-sm outline-none"
                        />
                        <p className="text-xs text-muted-foreground">
                            Minimum length: {minPasswordLength} characters.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <button
                            type="submit"
                            disabled={submitState === 'submitting'}
                            className="app-primaryButton inline-flex items-center justify-center rounded-xl px-4 py-3 text-sm font-semibold disabled:opacity-60"
                        >
                            {submitState === 'submitting' ? 'Updating…' : 'Update Password'}
                        </button>
                        <Link
                            href="/admin"
                            className="rounded-xl border border-white/15 px-4 py-3 text-sm text-muted-foreground transition hover:border-white/25 hover:text-foreground"
                        >
                            Back to admin
                        </Link>
                    </div>
                </form>

                {message ? (
                    <p
                        className={
                            submitState === 'success'
                                ? 'mt-4 rounded-xl border border-[hsl(142_72%_45%/0.18)] bg-[hsl(142_72%_45%/0.08)] px-3 py-2 text-sm text-[hsl(142_56%_42%)]'
                                : 'mt-4 rounded-xl border border-[hsl(0_72%_54%/0.18)] bg-[hsl(0_72%_54%/0.08)] px-3 py-2 text-sm text-[hsl(0_72%_56%)]'
                        }
                    >
                        {message}
                    </p>
                ) : null}
            </section>
        </div>
    )
}
