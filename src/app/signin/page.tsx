'use client'

import { Suspense, FormEvent, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

type SubmitState = 'idle' | 'submitting' | 'success' | 'error'

function SignInContent() {
    const searchParams = useSearchParams()
    const [email, setEmail] = useState('')
    const [submitState, setSubmitState] = useState<SubmitState>('idle')
    const [message, setMessage] = useState('')

    const error = searchParams.get('error')

    async function onSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault()
        setSubmitState('submitting')
        setMessage('')

        try {
            const res = await fetch('/api/auth/request', {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ email }),
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
        <div className="max-w-md mx-auto px-4 py-16">
            <div className="glass rounded-2xl p-6 space-y-5">
                <div>
                    <h1 className="text-2xl font-bold">Sign In</h1>
                    <p className="text-sm text-muted-foreground mt-2">
                        Enter your email to access your SmartPrintAI order history.
                    </p>
                </div>

                {error && (
                    <p className="text-sm text-red-300 bg-red-900/20 border border-red-900/40 rounded-lg px-3 py-2">
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
                        className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm outline-none focus:border-purple-400"
                        placeholder="you@example.com"
                    />

                    <button
                        type="submit"
                        disabled={submitState === 'submitting'}
                        className="w-full inline-flex justify-center items-center px-4 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 text-white font-medium disabled:opacity-60"
                    >
                        {submitState === 'submitting' ? 'Sending...' : 'Send Sign-In Link'}
                    </button>
                </form>

                {message && (
                    <p
                        className={
                            submitState === 'success'
                                ? 'text-sm text-green-300 bg-green-900/20 border border-green-900/40 rounded-lg px-3 py-2'
                                : 'text-sm text-red-300 bg-red-900/20 border border-red-900/40 rounded-lg px-3 py-2'
                        }
                    >
                        {message}
                    </p>
                )}

                <p className="text-sm text-muted-foreground">
                    Return to{' '}
                    <Link href="/" className="text-purple-300 hover:text-purple-200">
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
