'use client'

import { useEffect, useMemo, useState } from 'react'
import { Mail, Sparkles, X } from 'lucide-react'
import type { SupportedLocale } from '@/lib/i18n'

type PopupCopy = {
    badge: string
    title: string
    subtitle: string
    emailPlaceholder: string
    submitLabel: string
    submittingLabel: string
    dismissLabel: string
    successTitle: string
    successSubtitle: string
    continueLabel: string
    invalidEmailLabel: string
    failedLabel: string
    couponLabel: string
}

const POPUP_COPY: Record<SupportedLocale, PopupCopy> = {
    en: {
        badge: 'First Order Offer',
        title: 'Get your first-order discount code',
        subtitle: 'Enter your email and receive an instant coupon to use on your first SmartPrintAI order.',
        emailPlaceholder: 'you@example.com',
        submitLabel: 'Send my discount code',
        submittingLabel: 'Sending...',
        dismissLabel: 'No thanks',
        successTitle: 'Your discount code is ready',
        successSubtitle: 'We sent your code by email. You can also copy it below and start creating now.',
        continueLabel: 'Start creating',
        invalidEmailLabel: 'Please enter a valid email address.',
        failedLabel: 'Could not send your code right now. Please try again in a minute.',
        couponLabel: 'Code',
    },
    fr: {
        badge: 'Offre premiere commande',
        title: 'Recevez votre code de reduction',
        subtitle: 'Entrez votre email pour obtenir un coupon a utiliser sur votre premiere commande SmartPrintAI.',
        emailPlaceholder: 'vous@example.com',
        submitLabel: 'Envoyer mon code',
        submittingLabel: 'Envoi...',
        dismissLabel: 'Non merci',
        successTitle: 'Votre code est pret',
        successSubtitle: 'Le code vient de partir par email. Vous pouvez aussi le copier ici.',
        continueLabel: 'Commencer a creer',
        invalidEmailLabel: 'Veuillez entrer un email valide.',
        failedLabel: "Impossible d'envoyer le code pour le moment. Reessayez dans une minute.",
        couponLabel: 'Code',
    },
    de: {
        badge: 'Erstbestellung Angebot',
        title: 'Sichere dir deinen Rabattcode',
        subtitle: 'Trage deine E-Mail ein und erhalte sofort einen Gutschein fuer deine erste SmartPrintAI Bestellung.',
        emailPlaceholder: 'du@example.com',
        submitLabel: 'Rabattcode senden',
        submittingLabel: 'Wird gesendet...',
        dismissLabel: 'Nein danke',
        successTitle: 'Dein Rabattcode ist bereit',
        successSubtitle: 'Wir haben den Code per E-Mail gesendet. Du kannst ihn auch direkt hier kopieren.',
        continueLabel: 'Jetzt erstellen',
        invalidEmailLabel: 'Bitte gib eine gueltige E-Mail-Adresse ein.',
        failedLabel: 'Der Code konnte gerade nicht gesendet werden. Bitte in einer Minute erneut versuchen.',
        couponLabel: 'Code',
    },
    es: {
        badge: 'Oferta primera compra',
        title: 'Consigue tu codigo de descuento',
        subtitle: 'Deja tu email y recibe un cupon inmediato para tu primer pedido en SmartPrintAI.',
        emailPlaceholder: 'tu@example.com',
        submitLabel: 'Enviar mi codigo',
        submittingLabel: 'Enviando...',
        dismissLabel: 'No gracias',
        successTitle: 'Tu codigo esta listo',
        successSubtitle: 'Te enviamos el codigo por email. Tambien puedes copiarlo aqui.',
        continueLabel: 'Empezar a crear',
        invalidEmailLabel: 'Ingresa un email valido.',
        failedLabel: 'No pudimos enviar el codigo ahora. Intenta de nuevo en un minuto.',
        couponLabel: 'Codigo',
    },
}

const POPUP_STATE_KEY = 'spai_first_order_popup_state'

type PopupState = 'dismissed' | 'submitted'

function isValidEmail(value: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

function getStoredState(): PopupState | null {
    if (typeof window === 'undefined') {
        return null
    }

    const value = window.localStorage.getItem(POPUP_STATE_KEY)
    return value === 'dismissed' || value === 'submitted' ? value : null
}

type FirstOrderDiscountPopupProps = {
    locale: SupportedLocale
    delayMs?: number
}

export default function FirstOrderDiscountPopup({ locale, delayMs = 9000 }: FirstOrderDiscountPopupProps) {
    const copy = POPUP_COPY[locale]
    const [isOpen, setIsOpen] = useState(false)
    const [email, setEmail] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [couponCode, setCouponCode] = useState<string | null>(null)

    const createPath = useMemo(() => (locale === 'en' ? '/create' : `/${locale}/create`), [locale])

    useEffect(() => {
        if (getStoredState()) {
            return
        }

        const timer = window.setTimeout(() => {
            setIsOpen(true)
        }, delayMs)

        return () => window.clearTimeout(timer)
    }, [delayMs])

    function dismiss() {
        if (typeof window !== 'undefined') {
            window.localStorage.setItem(POPUP_STATE_KEY, 'dismissed')
        }
        setIsOpen(false)
    }

    async function submit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault()
        const normalized = email.trim().toLowerCase()

        if (!isValidEmail(normalized)) {
            setError(copy.invalidEmailLabel)
            return
        }

        setIsSubmitting(true)
        setError(null)

        try {
            const response = await fetch('/api/marketing/lead', {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({
                    email: normalized,
                    locale,
                    source: 'homepage_popup',
                }),
            })

            const payload = (await response.json()) as { couponCode?: string; error?: string }
            if (!response.ok) {
                setError(payload.error || copy.failedLabel)
                return
            }

            setCouponCode(payload.couponCode || null)
            if (typeof window !== 'undefined') {
                window.localStorage.setItem(POPUP_STATE_KEY, 'submitted')
            }
        } catch {
            setError(copy.failedLabel)
        } finally {
            setIsSubmitting(false)
        }
    }

    if (!isOpen) {
        return null
    }

    return (
        <div className="premium-home-popupOverlay fixed inset-0 z-[80] flex items-end justify-center p-4 sm:items-center sm:p-6">
            <div className="premium-home-popupPanel relative w-full max-w-lg overflow-hidden rounded-[2rem]">
                <button
                    type="button"
                    onClick={dismiss}
                    className="premium-home-popupDismiss absolute right-4 top-4 z-20"
                    aria-label="Close"
                >
                    <X className="h-5 w-5" />
                </button>

                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,hsl(var(--premium-spot)/0.14),transparent_32%),radial-gradient(circle_at_82%_18%,hsl(var(--premium-spot-alt)/0.16),transparent_28%)]" />
                <div className="pointer-events-none absolute -left-12 top-8 h-32 w-32 rounded-full bg-[radial-gradient(circle,hsl(var(--premium-spot)/0.18),transparent_72%)] blur-2xl" />
                <div className="pointer-events-none absolute -right-14 bottom-0 h-40 w-40 rounded-full bg-[radial-gradient(circle,hsl(var(--premium-spot-alt)/0.16),transparent_74%)] blur-3xl" />

                <div className="relative space-y-5 p-6 sm:p-8">
                    <div className="premium-home-popupBadge inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em]">
                        <Sparkles className="h-3.5 w-3.5" />
                        {copy.badge}
                    </div>

                    {!couponCode ? (
                        <>
                            <div className="space-y-2">
                                <h3 className="text-2xl font-semibold tracking-[-0.04em] text-[hsl(var(--premium-ink))]">
                                    {copy.title}
                                </h3>
                                <p className="premium-home-popupCopy text-sm leading-6">{copy.subtitle}</p>
                            </div>

                            <form onSubmit={submit} className="space-y-3">
                                <div className="relative">
                                    <Mail className="premium-home-popupInputIcon pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(event) => setEmail(event.target.value)}
                                        placeholder={copy.emailPlaceholder}
                                        className="premium-home-popupInput w-full rounded-[1rem] px-10 py-3 text-sm focus:outline-none"
                                        required
                                    />
                                </div>

                                {error && <p className="premium-home-popupError text-sm">{error}</p>}

                                <div className="flex flex-col sm:flex-row gap-2">
                                    <button
                                        type="submit"
                                        disabled={isSubmitting}
                                        className="premium-home-popupPrimary flex-1 rounded-[1rem] px-4 py-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                        {isSubmitting ? copy.submittingLabel : copy.submitLabel}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={dismiss}
                                        className="premium-home-popupSecondary rounded-[1rem] px-4 py-3 text-sm"
                                    >
                                        {copy.dismissLabel}
                                    </button>
                                </div>
                            </form>
                        </>
                    ) : (
                        <div className="space-y-4">
                            <h3 className="text-2xl font-semibold tracking-[-0.04em] text-[hsl(var(--premium-ink))]">
                                {copy.successTitle}
                            </h3>
                            <p className="premium-home-popupCopy text-sm leading-6">{copy.successSubtitle}</p>
                            {couponCode && (
                                <div className="premium-home-popupSuccess rounded-[1rem] px-4 py-3">
                                    <p className="premium-home-popupSuccessLabel text-xs uppercase tracking-[0.22em]">{copy.couponLabel}</p>
                                    <p className="premium-home-popupSuccessCode mt-1 text-xl font-semibold tracking-[-0.03em]">{couponCode}</p>
                                </div>
                            )}
                            <a
                                href={createPath}
                                className="premium-home-popupPrimary inline-flex rounded-[1rem] px-5 py-3 text-sm font-semibold"
                            >
                                {copy.continueLabel}
                            </a>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
