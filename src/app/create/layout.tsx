import type { Metadata } from 'next'
import { DEFAULT_LOCALE, buildLocaleAlternates, getLocaleCopy } from '@/lib/i18n'
import { buildLocalizedSocialMetadata } from '@/lib/metadata'

const SITE_URL = 'https://smartprintai.com'
const copy = getLocaleCopy(DEFAULT_LOCALE).create

// generateMetadata allows Next.js to access searchParams for conditional noindex
export async function generateMetadata({
      searchParams,
}: {
      searchParams: Record<string, string | string[] | undefined>
}): Promise<Metadata> {
      // Noindex any parameterised /create URL (e.g. ?productId=, ?color=, ?size=)
  const hasQueryParams =
          searchParams.productId !== undefined ||
          searchParams.color !== undefined ||
          searchParams.size !== undefined

  return {
          title: copy.metadataTitle,
          description: copy.metadataDescription,
          robots: hasQueryParams
            ? { index: false, follow: true }
                    : { index: true, follow: true },
          alternates: {
                    canonical: `${SITE_URL}/create`,
                    languages: buildLocaleAlternates('/create'),
          },
          ...buildLocalizedSocialMetadata({
                    locale: DEFAULT_LOCALE,
                    path: '/create',
                    title: copy.metadataTitle,
                    description: copy.metadataDescription,
          }),
  }
}

export default function CreateLayout({ children }: { children: React.ReactNode }) {
      return children
}
