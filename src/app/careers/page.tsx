import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
    title: 'Careers',
    description: 'Join SmartPrintAI to build AI-native commerce experiences for creators worldwide.',
    alternates: {
        canonical: '/careers',
    },
}

const openRoles = [
    {
        title: 'Senior Full-Stack Engineer',
        location: 'Remote (Europe-friendly timezone)',
        type: 'Full-time',
        summary:
            'Own product features end-to-end across Next.js, APIs, and commerce workflows. Focus on speed, reliability, and conversion.',
    },
    {
        title: 'Lifecycle Marketing Lead',
        location: 'Remote',
        type: 'Contract / Part-time',
        summary:
            'Build acquisition and retention systems across SEO, email, creator campaigns, and marketplace channels.',
    },
    {
        title: 'Product Designer (Growth)',
        location: 'Remote',
        type: 'Full-time',
        summary:
            'Design clear and high-converting experiences from prompt input to checkout, with strong visual and UX quality.',
    },
]

const values = [
    'Ship fast, measure impact, iterate weekly.',
    'Default to clear writing, clear ownership, and clear quality bars.',
    'Use AI pragmatically to improve customer outcomes, not to add noise.',
    'Act like owners: customer trust, reliability, and margins matter.',
]

export default function CareersPage() {
    return (
        <div className="max-w-6xl mx-auto px-4 py-14 space-y-12">
            <section className="glass rounded-3xl p-8 sm:p-12 relative overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(168,85,247,0.25),transparent_45%),radial-gradient(circle_at_bottom_left,rgba(236,72,153,0.18),transparent_40%)]" />
                <div className="relative z-10 space-y-5">
                    <p className="text-xs uppercase tracking-[0.18em] text-purple-300/90">Careers at SmartPrintAI</p>
                    <h1 className="text-3xl sm:text-5xl font-bold max-w-3xl leading-tight">
                        Build the future of <span className="text-gradient">AI-powered commerce</span>
                    </h1>
                    <p className="text-muted-foreground max-w-2xl">
                        We help creators turn ideas into premium physical products in minutes. Join us to build a global,
                        fast-moving platform where AI meets real-world manufacturing.
                    </p>
                    <div className="flex flex-wrap gap-3 pt-2">
                        <a
                            href="mailto:hello@smartprintai.com?subject=SmartPrintAI%20Career%20Application"
                            className="inline-flex items-center px-5 py-2.5 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-medium hover:opacity-90 transition-opacity"
                        >
                            Apply by Email
                        </a>
                        <Link
                            href="/products"
                            className="inline-flex items-center px-5 py-2.5 rounded-full border border-white/15 text-sm text-muted-foreground hover:text-foreground hover:border-purple-400/40 transition-colors"
                        >
                            Explore the Product
                        </Link>
                    </div>
                </div>
            </section>

            <section className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                {openRoles.map((role) => (
                    <article key={role.title} className="glass rounded-2xl p-6 space-y-3">
                        <h2 className="text-xl font-semibold">{role.title}</h2>
                        <p className="text-xs text-purple-300/90 uppercase tracking-wide">
                            {role.type} • {role.location}
                        </p>
                        <p className="text-sm text-muted-foreground">{role.summary}</p>
                    </article>
                ))}
            </section>

            <section className="glass rounded-2xl p-7 sm:p-8 space-y-4">
                <h2 className="text-2xl font-bold">How We Work</h2>
                <ul className="space-y-3 text-sm text-muted-foreground">
                    {values.map((value) => (
                        <li key={value} className="flex gap-3">
                            <span className="mt-1 block w-2 h-2 rounded-full bg-purple-400" />
                            <span>{value}</span>
                        </li>
                    ))}
                </ul>
                <p className="text-sm text-muted-foreground pt-2">
                    Don&apos;t see your exact role? Send us your profile and what you want to build at
                    {' '}
                    <a className="text-purple-300 hover:text-purple-200" href="mailto:hello@smartprintai.com">
                        hello@smartprintai.com
                    </a>
                    .
                </p>
            </section>
        </div>
    )
}
