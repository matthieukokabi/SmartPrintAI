'use client'

import { FormEvent, useState } from 'react'

type SubmitState = 'idle' | 'submitting' | 'error'

type OwnerLoginClientProps = {
    nextPath: string
}

export function OwnerLoginClient({ nextPath }: OwnerLoginClientProps) {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [submitState, setSubmitState] = useState<SubmitState>('idle')
    const [message, setMessage] = useState('')

    async function onSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault()
        setSubmitState('submitting')
        setMessage('')

        try {
            const res = await fetch('/api/admin/auth/login', {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ email, password, next: nextPath }),
            })
            const data = await res.json()
            if (!res.ok) {
                setSubmitState('error')
                setMessage(data.error || 'Unable to sign in')
                return
            }

            if (data.mustRotatePassword === true) {
                window.location.assign('/admin/security?required=1')
                return
            }

            window.location.assign(typeof data.nextPath === 'string' ? data.nextPath : '/admin')
        } catch {
            setSubmitState('error')
            setMessage('Unable to sign in')
        }
    }

    return (
        <div className="mx-auto max-w-md px-4 py-16 sm:py-24">
            <div className="glass space-y-6 rounded-[2rem] p-7 sm:p-8">
                <div className="space-y-2">
                    <h1 className="text-2xl font-bold">Owner / Admin Sign In</h1>
                    <p className="text-sm text-muted-foreground">
                        Secure owner access for SmartPrintAI operations.
                    </p>
                    <p className="text-xs text-muted-foreground">
                        Redirect target: <span className="text-foreground">{nextPath}</span>
                    </p>
                </div>

                <form className="space-y-4" onSubmit={onSubmit}>
                    <div className="space-y-1.5">
                        <label className="block text-sm font-medium" htmlFor="owner-email">
                            Owner email
                        </label>
                        <input
                            id="owner-email"
                            type="email"
                            autoComplete="username"
                            required
                            value={email}
                            onChange={(event) => setEmail(event.target.value)}
                            className="app-input w-full rounded-xl px-3.5 py-3 text-sm outline-none"
                            placeholder="owner@smartprintai.com"
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="block text-sm font-medium" htmlFor="owner-password">
                            Password
                        </label>
                        <input
                            id="owner-password"
                            type="password"
                            autoComplete="current-password"
                            required
                            value={password}
                            onChange={(event) => setPassword(event.target.value)}
                            className="app-input w-full rounded-xl px-3.5 py-3 text-sm outline-none"
                            placeholder="Enter owner password"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={submitState === 'submitting'}
                        className="app-primaryButton inline-flex w-full items-center justify-center rounded-xl px-4 py-3 text-sm font-semibold disabled:opacity-60"
                    >
                        {submitState === 'submitting' ? 'Signing in…' : 'Sign In to Owner Portal'}
                    </button>
                </form>

                {message ? (
                    <p className="rounded-xl border border-[hsl(0_72%_54%/0.18)] bg-[hsl(0_72%_54%/0.08)] px-3 py-2 text-sm text-[hsl(0_72%_56%)]">
                        {message}
                    </p>
                ) : null}
            </div>
        </div>
    )
}
