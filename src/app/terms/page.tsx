// The canonical /terms URL renders the English variant of the
// locale-aware page. Localized URLs live at /[locale]/terms.
// Both routes share the same component + the same `copy.terms.*`
// content in src/lib/i18n.ts.
import LocalizedTermsPage, {
    generateMetadata as localizedGenerateMetadata,
} from '@/app/[locale]/terms/page'

export const generateMetadata = () => localizedGenerateMetadata({ params: { locale: 'en' } })

export default function TermsPage() {
    return <LocalizedTermsPage params={{ locale: 'en' }} />
}
