'use client'

// global-error.tsx fires when the root layout itself fails (e.g. the i18n
// bundle blows up, a CSS import 500s). It MUST NOT depend on anything
// inside the regular layout chain — no Footer, no i18n, no Tailwind class
// names that require globals.css to have loaded. English-only, inline
// styles, minimal DOM.
export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    return (
        <html lang="en">
            <body
                style={{
                    background: '#070b16',
                    color: '#e4e4e7',
                    fontFamily: 'system-ui, -apple-system, "Helvetica Neue", Arial, sans-serif',
                    minHeight: '100vh',
                    margin: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '24px',
                }}
            >
                <div style={{ maxWidth: 520, textAlign: 'center' }}>
                    <h1 style={{ fontSize: 28, fontWeight: 700, margin: '0 0 12px' }}>
                        Something went wrong
                    </h1>
                    <p style={{ color: '#a1a1aa', margin: '0 0 24px', fontSize: 14, lineHeight: 1.6 }}>
                        SmartPrintAI hit an unexpected error. Try again, or reload the page. If the problem
                        keeps happening, email <a href="mailto:help@smartprintai.com" style={{ color: '#93c5fd' }}>
                            help@smartprintai.com
                        </a>.
                    </p>
                    <button
                        type="button"
                        onClick={reset}
                        style={{
                            padding: '10px 22px',
                            borderRadius: 999,
                            border: 'none',
                            background: 'linear-gradient(90deg,#2f6cf3,#26d4b8)',
                            color: '#ffffff',
                            fontSize: 14,
                            fontWeight: 600,
                            cursor: 'pointer',
                        }}
                    >
                        Try again
                    </button>
                    {error.digest && (
                        <p style={{ marginTop: 16, fontSize: 11, color: '#71717a' }}>
                            Reference: <code style={{ fontFamily: 'ui-monospace, monospace' }}>{error.digest}</code>
                        </p>
                    )}
                </div>
            </body>
        </html>
    )
}
