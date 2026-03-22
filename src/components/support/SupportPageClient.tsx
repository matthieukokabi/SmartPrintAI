'use client'

import Link from 'next/link'
import { FormEvent, useState } from 'react'
import LanguageSwitcher from '@/components/layout/LanguageSwitcher'
import type { LocaleCopy, SupportedLocale } from '@/lib/i18n'

type SubmitState = 'idle' | 'submitting' | 'success' | 'error'

type SupportPageClientProps = {
    locale: SupportedLocale
    copy: LocaleCopy['support']
}

export default function SupportPageClient({ locale, copy }: SupportPageClientProps) {
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
                setFeedback(data.error || copy.fallbackErrorLabel)
                return
            }

            setSubmitState('success')
            setFeedback(data.message || copy.fallbackSuccessLabel)
            setSubject('')
            setMessage('')
            setOrderId('')
        } catch {
            setSubmitState('error')
            setFeedback(copy.fallbackErrorLabel)
        }
    }

    return (
        <div className="max-w-5xl mx-auto px-4 py-16 space-y-8">
            <div className="flex justify-center">
                <LanguageSwitcher currentLocale={locale} pagePath="/support" />
            </div>

            <div>
                <h1 className="text-3xl font-bold">{copy.heading}</h1>
                <p className="text-sm text-muted-foreground mt-2">{copy.subtitle}</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="glass rounded-2xl p-5 space-y-3 lg:col-span-1">
                    <h2 className="font-semibold">{copy.contactChannelsLabel}</h2>
                    <p className="text-sm text-muted-foreground">
                        {copy.emailLabel}:
                        {' '}
                        <a className="text-purple-300 hover:text-purple-200" href="mailto:support@smartprintai.com">
                            support@smartprintai.com
                        </a>
                    </p>
                    <p className="text-sm text-muted-foreground">
                        {copy.backupLabel}:
                        {' '}
                        <a className="text-purple-300 hover:text-purple-200" href="mailto:contact@smartprintai.com">
                            contact@smartprintai.com
                        </a>
                    </p>
                    <p className="text-sm text-muted-foreground">{copy.includeOrderIdLabel}</p>
                    <p className="text-sm text-muted-foreground">
                        {copy.returnToOrdersLabel}
                        {' '}
                        <Link href="/account/orders" className="text-purple-300 hover:text-purple-200">
                            {copy.ordersLinkLabel}
                        </Link>
                        .
                    </p>
                </div>

                <div className="glass rounded-2xl p-6 lg:col-span-2">
                    <form className="space-y-4" onSubmit={onSubmit}>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="name" className="block text-sm font-medium mb-2">{copy.nameLabel}</label>
                                <input
                                    id="name"
                                    required
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm outline-none focus:border-purple-400"
                                    placeholder={copy.namePlaceholder}
                                />
                            </div>
                            <div>
                                <label htmlFor="email" className="block text-sm font-medium mb-2">{copy.emailFieldLabel}</label>
                                <input
                                    id="email"
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm outline-none focus:border-purple-400"
                                    placeholder={copy.emailPlaceholder}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="orderId" className="block text-sm font-medium mb-2">{copy.orderIdLabel}</label>
                                <input
                                    id="orderId"
                                    value={orderId}
                                    onChange={(e) => setOrderId(e.target.value)}
                                    className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm outline-none focus:border-purple-400"
                                    placeholder={copy.orderIdPlaceholder}
                                />
                            </div>
                            <div>
                                <label htmlFor="subject" className="block text-sm font-medium mb-2">{copy.subjectLabel}</label>
                                <input
                                    id="subject"
                                    required
                                    value={subject}
                                    onChange={(e) => setSubject(e.target.value)}
                                    className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm outline-none focus:border-purple-400"
                                    placeholder={copy.subjectPlaceholder}
                                />
                            </div>
                        </div>

                        <div>
                            <label htmlFor="message" className="block text-sm font-medium mb-2">{copy.messageLabel}</label>
                            <textarea
                                id="message"
                                required
                                minLength={10}
                                rows={7}
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm outline-none focus:border-purple-400"
                                placeholder={copy.messagePlaceholder}
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={submitState === 'submitting'}
                            className="inline-flex items-center rounded-lg bg-gradient-to-r from-[#2f6cf3] to-[#26d4b8] px-4 py-2 font-medium text-white shadow-[0_20px_40px_-26px_rgba(38,212,184,0.58)] transition-all duration-300 hover:brightness-105 active:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#26d4b8]/45 disabled:opacity-60"
                        >
                            {submitState === 'submitting' ? copy.sendingLabel : copy.sendLabel}
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
                    <h2 className="font-semibold">{copy.faqLabel}</h2>
                    <p className="text-sm text-muted-foreground">{copy.faqOne}</p>
                    <p className="text-sm text-muted-foreground">{copy.faqTwo}</p>
                </section>

                <section id="shipping" className="glass rounded-2xl p-5 space-y-3">
                    <h2 className="font-semibold">{copy.shippingLabel}</h2>
                    <p className="text-sm text-muted-foreground">{copy.shippingOne}</p>
                    <p className="text-sm text-muted-foreground">{copy.shippingTwo}</p>
                </section>
            </div>
        </div>
    )
}
