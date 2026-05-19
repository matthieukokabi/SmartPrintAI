// The canonical /privacy URL renders the English variant of the
// locale-aware page. Localized URLs live at /[locale]/privacy.
// Both routes share the same component + the same `copy.privacy.*`
// content in src/lib/i18n.ts.
import LocalizedPrivacyPage, {
    generateMetadata as localizedGenerateMetadata,
} from '@/app/[locale]/privacy/page'

export const generateMetadata = () => localizedGenerateMetadata({ params: { locale: 'en' } })

export default function PrivacyPage() {
    return <LocalizedPrivacyPage params={{ locale: 'en' }} />
}
