import Link from 'next/link'
import Image from 'next/image'
import { headers } from 'next/headers'
import BrandMark from '@/components/brand/BrandMark'
import {
    DEFAULT_LOCALE,
    getLocaleCopy,
    isSupportedLocale,
    type SupportedLocale,
} from '@/lib/i18n'

function detectLocaleFromPathname(pathname: string): SupportedLocale {
    const seg = pathname.split('/').filter(Boolean)[0]
    if (seg && isSupportedLocale(seg)) {
        return seg
    }
    return DEFAULT_LOCALE
}

function localePrefix(locale: SupportedLocale): string {
    return locale === 'en' ? '' : `/${locale}`
}

export default function Footer() {
    const pathname = headers().get('x-pathname') || '/'
    const locale = detectLocaleFromPathname(pathname)
    const copy = getLocaleCopy(locale).footer
    const prefix = localePrefix(locale)
    const createHref = `${prefix}/create`
    const supportEmail = 'help@smartprintai.com'

    return (
        <footer
            style={{
                borderTop: '1px solid var(--border)',
                padding: '48px 24px',
                background: 'var(--surface)',
            }}
        >
            <div style={{ maxWidth: 1200, margin: '0 auto' }}>
                <div
                    style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                        gap: 40,
                        marginBottom: 40,
                    }}
                >
                    <div>
                        <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                            <BrandMark size={18} />
                            <Image src="/images/logo.svg" alt="SmartPrintAI" width={24} height={24} />
                            <span className="gradient-text">SmartPrintAI</span>
                        </h2>
                        <p style={{ color: 'var(--text-muted)', fontSize: 14, lineHeight: 1.6, marginBottom: 16 }}>
                            {copy.tagline}
                        </p>
                        <Link
                            href={createHref}
                            data-home-cta="footer_primary_create"
                            data-home-cta-label={copy.cta}
                            className="inline-flex items-center justify-center gap-1.5 rounded-full bg-gradient-to-r from-[#2f6cf3] to-[#26d4b8] px-4 py-2 text-sm font-medium text-white shadow-[0_20px_40px_-26px_rgba(38,212,184,0.58)] transition-all duration-300 hover:brightness-105"
                            aria-label={copy.cta}
                        >
                            {copy.cta}
                        </Link>
                    </div>
                    <div>
                        <h3 style={{ fontWeight: 600, marginBottom: 12 }}>{copy.productsHeading}</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            <Link href={createHref} style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: 14 }}>
                                {copy.productsList.tshirts}
                            </Link>
                            <Link href={createHref} style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: 14 }}>
                                {copy.productsList.hoodies}
                            </Link>
                            <Link href={createHref} style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: 14 }}>
                                {copy.productsList.mugs}
                            </Link>
                            <Link href={createHref} style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: 14 }}>
                                {copy.productsList.wallArt}
                            </Link>
                        </div>
                    </div>
                    <div>
                        <h3 style={{ fontWeight: 600, marginBottom: 12 }}>{copy.supportHeading}</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            <a
                                href={`mailto:${supportEmail}`}
                                style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: 14 }}
                            >
                                {supportEmail}
                            </a>
                            <Link href={`${prefix}/shipping`} style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: 14 }}>
                                {copy.supportLinks.shipping}
                            </Link>
                            <Link href={`${prefix}/returns`} style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: 14 }}>
                                {copy.supportLinks.returns}
                            </Link>
                            <Link href={`${prefix}/terms`} style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: 14 }}>
                                {copy.supportLinks.terms}
                            </Link>
                            <Link href={`${prefix}/privacy`} style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: 14 }}>
                                {copy.supportLinks.privacy}
                            </Link>
                        </div>
                    </div>
                </div>
                <div
                    style={{
                        borderTop: '1px solid var(--border)',
                        paddingTop: 24,
                        textAlign: 'center',
                        color: 'var(--text-muted)',
                        fontSize: 13,
                    }}
                >
                    {copy.copyright}
                </div>
            </div>
        </footer>
    )
}
