'use client'

import { Suspense, FormEvent, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { normalizeAuthCallbackPath } from '@/lib/auth-callback'

type SubmitState = 'idle' | 'submitting' | 'success' | 'error'

function SignInContent() {
    const searchParams = useSearchParams()
    const [email, setEmail] = useState('')
    const [submitState, setSubmitState] = useState<SubmitState>('idle')
    const [message, setMessage] = useState('')

    const error = searchParams.get('error')
    const callbackUrl = normalizeAuthCallbackPath(searchParams.get('callbackUrl'))

    async function onSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault()
        setSubmitState('submitting')
        setMessage('')

        try {
            const res = await fetch('/api/auth/request', {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ email, callbackUrl }),
            })

            const data = await res.json()
            if (!res.ok) {
                setSubmitState('error')
                setMessage(data.error || 'Unable to send sign-in link')
                return
            }

            setSubmitState('success')
            setMessage('Sign-in link sent. Check your inbox.')
        } catch {
            setSubmitState('error')
            setMessage('Unable to send sign-in link')
        }
    }

    return (
        <div className="mx-auto max-w-md px-4 py-16 sm:py-24">
            <div className="glass space-y-6 rounded-[2rem] p-7 sm:p-8">
                <div>
                    <h1 className="text-2xl font-bold">Sign In</h1>
                    <p className="mt-2 text-sm text-muted-foreground">
                        Enter your email to access your SmartPrintAI order history.
                    </p>
                </div>

                {error && (
                    <p className="rounded-xl border border-[hsl(0_72%_54%/0.18)] bg-[hsl(0_72%_54%/0.08)] px-3 py-2 text-sm text-[hsl(0_72%_56%)]">
                        Your sign-in link is invalid or expired. Request a new link.
                    </p>
                )}

                <form className="space-y-3" onSubmit={onSubmit}>
                    <label className="block text-sm font-medium" htmlFor="email">
                        Email
                    </label>
                    <input
                        id="email"
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="app-input w-full rounded-xl px-3.5 py-3 text-sm outline-none"
                        placeholder="you@example.com"
                    />

                    <button
                        type="submit"
                        disabled={submitState === 'submitting'}
                        className="app-primaryButton inline-flex w-full items-center justify-center rounded-xl px-4 py-3 text-sm font-semibold disabled:opacity-60"
                    >
                        {submitState === 'submitting' ? 'Sending...' : 'Send Sign-In Link'}
                    </button>
                </form>

                {message && (
                    <p
                        className={
                            submitState === 'success'
                                ? 'rounded-xl border border-[hsl(142_72%_45%/0.18)] bg-[hsl(142_72%_45%/0.08)] px-3 py-2 text-sm text-[hsl(142_56%_42%)]'
                                : 'rounded-xl border border-[hsl(0_72%_54%/0.18)] bg-[hsl(0_72%_54%/0.08)] px-3 py-2 text-sm text-[hsl(0_72%_56%)]'
                        }
                    >
                        {message}
                    </p>
                )}

                <p className="text-sm text-muted-foreground">
                    Return to{' '}
                    <Link href="/" className="font-medium text-foreground/70 underline decoration-border underline-offset-4 transition-colors hover:text-foreground">
                        Home
                    </Link>
                </p>
            </div>
        </div>
    )
}

export default function SignInPage() {
    return (
        <Suspense fallback={<div className="max-w-md mx-auto px-4 py-16" />}>
            <SignInContent />
        </Suspense>
    )
}
