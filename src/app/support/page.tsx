'use client'

import { FormEvent, useState } from 'react'
import Link from 'next/link'

type SubmitState = 'idle' | 'submitting' | 'success' | 'error'

export default function SupportPage() {
    const [name, setName] = useState('')
    const [email, setEmail] = useState('')
    const [orderId, setOrderId] = useState('')
    const [subject, setSubject] = useState('')
    const [message, setMessage] = useState('')
    const [submitState, setSubmitState] = useState<SubmitState>('idle')
    const [feedback, setFeedback] = useState('')

    async function onSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault()
        setSubmitState('submitting')
        setFeedback('')

        try {
            const res = await fetch('/api/support', {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({
                    name,
                    email,
                    orderId: orderId || undefined,
                    subject,
                    message,
                }),
            })

            const data = await res.json()
            if (!res.ok) {
                setSubmitState('error')
                setFeedback(data.error || 'Unable to submit support request')
                return
            }

            setSubmitState('success')
            setFeedback(data.message || 'Support request received.')
            setSubject('')
            setMessage('')
            setOrderId('')
        } catch {
            setSubmitState('error')
            setFeedback('Unable to submit support request')
        }
    }

    return (
        <div className="max-w-5xl mx-auto px-4 py-16 space-y-8">
            <div>
                <h1 className="text-3xl font-bold">Support</h1>
                <p className="text-sm text-muted-foreground mt-2">
                    We answer all requests within 24 business hours. Shipping issues are prioritized with a 4 business hour target.
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="glass rounded-2xl p-5 space-y-3 lg:col-span-1">
                    <h2 className="font-semibold">Contact channels</h2>
                    <p className="text-sm text-muted-foreground">
                        Email:
                        {' '}
                        <a className="text-purple-300 hover:text-purple-200" href="mailto:support@smartprintai.com">
                            support@smartprintai.com
                        </a>
                    </p>
                    <p className="text-sm text-muted-foreground">
                        Backup:
                        {' '}
                        <a className="text-purple-300 hover:text-purple-200" href="mailto:contact@smartprintai.com">
                            contact@smartprintai.com
                        </a>
                    </p>
                    <p className="text-sm text-muted-foreground">
                        Include your order ID for faster handling.
                    </p>
                    <p className="text-sm text-muted-foreground">
                        Return to
                        {' '}
                        <Link href="/account/orders" className="text-purple-300 hover:text-purple-200">
                            orders
                        </Link>
                        .
                    </p>
                </div>

                <div className="glass rounded-2xl p-6 lg:col-span-2">
                    <form className="space-y-4" onSubmit={onSubmit}>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="name" className="block text-sm font-medium mb-2">Name</label>
                                <input
                                    id="name"
                                    required
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm outline-none focus:border-purple-400"
                                    placeholder="Your name"
                                />
                            </div>
                            <div>
                                <label htmlFor="email" className="block text-sm font-medium mb-2">Email</label>
                                <input
                                    id="email"
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm outline-none focus:border-purple-400"
                                    placeholder="you@example.com"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="orderId" className="block text-sm font-medium mb-2">Order ID (optional)</label>
                                <input
                                    id="orderId"
                                    value={orderId}
                                    onChange={(e) => setOrderId(e.target.value)}
                                    className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm outline-none focus:border-purple-400"
                                    placeholder="cmm..."
                                />
                            </div>
                            <div>
                                <label htmlFor="subject" className="block text-sm font-medium mb-2">Subject</label>
                                <input
                                    id="subject"
                                    required
                                    value={subject}
                                    onChange={(e) => setSubject(e.target.value)}
                                    className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm outline-none focus:border-purple-400"
                                    placeholder="What do you need help with?"
                                />
                            </div>
                        </div>

                        <div>
                            <label htmlFor="message" className="block text-sm font-medium mb-2">Message</label>
                            <textarea
                                id="message"
                                required
                                minLength={10}
                                rows={7}
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm outline-none focus:border-purple-400"
                                placeholder="Describe the issue, include links/screenshots context if relevant."
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={submitState === 'submitting'}
                            className="inline-flex items-center px-4 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 text-white font-medium disabled:opacity-60"
                        >
                            {submitState === 'submitting' ? 'Sending...' : 'Send support request'}
                        </button>
                    </form>

                    {feedback && (
                        <p
                            className={
                                'mt-4 text-sm rounded-lg px-3 py-2 ' +
                                (submitState === 'success'
                                    ? 'text-green-300 bg-green-900/20 border border-green-900/40'
                                    : 'text-red-300 bg-red-900/20 border border-red-900/40')
                            }
                        >
                            {feedback}
                        </p>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <section id="faq" className="glass rounded-2xl p-5 space-y-3">
                    <h2 className="font-semibold">FAQ</h2>
                    <p className="text-sm text-muted-foreground">
                        Order not visible yet? It can take a few minutes after payment for status synchronization.
                    </p>
                    <p className="text-sm text-muted-foreground">
                        Need invoice help? Send order ID and billing email in your support message.
                    </p>
                </section>

                <section id="shipping" className="glass rounded-2xl p-5 space-y-3">
                    <h2 className="font-semibold">Shipping</h2>
                    <p className="text-sm text-muted-foreground">
                        Production usually starts right after payment confirmation and shipment notification follows carrier handoff.
                    </p>
                    <p className="text-sm text-muted-foreground">
                        Shipping incidents are prioritized. Target first response: within 4 business hours.
                    </p>
                </section>
            </div>
        </div>
    )
}
