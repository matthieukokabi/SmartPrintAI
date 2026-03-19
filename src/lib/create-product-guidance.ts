type ProductGuidanceInput = {
    name?: string | null
    category?: string | null
    printfulId?: string | null
}

export type ProductPromptGuidance = {
    title: string
    checklist: [string, string, string]
    example: string
}

type ProductGuidanceProfile = 'small_area' | 'all_over' | 'drinkware' | 'standard'

const SMALL_AREA_KEYWORDS = ['cap', 'beanie', 'hat', 'drawstring', 'ornament', 'tag', 'patch']
const DRINKWARE_KEYWORDS = ['mug', 'bottle', 'tumbler', 'travel', 'canteen']

const GUIDANCE_BY_PROFILE: Record<ProductGuidanceProfile, ProductPromptGuidance> = {
    small_area: {
        title: 'Small print area tips',
        checklist: [
            'Use one centered icon/logo instead of a full scene.',
            'Ask for transparent background with no white box, frame, or poster block.',
            'Request bold shapes and thick lines so details stay readable at small size.',
        ],
        example:
            '"Cyber tiger emblem, transparent background, centered icon, bold thick lines, no text, no frame."',
    },
    all_over: {
        title: 'All-over pattern tips',
        checklist: [
            'Describe a seamless edge-to-edge pattern, not a single centered sticker.',
            'Ask for repeated motifs with even spacing so coverage stays balanced.',
            'Specify no blank center panel, no square frame, and no poster-style layout.',
        ],
        example:
            '"Neon tropical pattern, seamless full-coverage repeat, edge-to-edge, no central square, no text."',
    },
    drinkware: {
        title: 'Drinkware placement tips',
        checklist: [
            'Use a compact vertical badge or icon for curved surfaces.',
            'Keep strong contrast and avoid tiny details that blur on cylindrical wraps.',
            'Specify transparent background and no white rectangle behind artwork.',
        ],
        example:
            '"Minimal crest logo, transparent background, centered vertical badge, high contrast, no frame."',
    },
    standard: {
        title: 'Apparel mockup tips',
        checklist: [
            'Describe one main subject and keep it centered and large.',
            'Specify transparent background with no white box or border.',
            'Mention no text unless needed and ask for print-ready clean cutout edges.',
        ],
        example:
            '"Cyber tiger emblem, transparent background, centered composition, no white box, no text."',
    },
}

function includesKeyword(value: string, keywords: string[]): boolean {
    return keywords.some((keyword) => value.includes(keyword))
}

function resolveGuidanceProfile(product: ProductGuidanceInput): ProductGuidanceProfile {
    const name = (product.name || '').trim().toLowerCase()
    const category = (product.category || '').trim().toLowerCase()

    if (name.includes('all-over print') || name.includes('all over print')) {
        return 'all_over'
    }

    if (category === 'drinkware' || includesKeyword(name, DRINKWARE_KEYWORDS)) {
        return 'drinkware'
    }

    if (includesKeyword(name, SMALL_AREA_KEYWORDS)) {
        return 'small_area'
    }

    return 'standard'
}

export function getCreateProductPromptGuidance(product: ProductGuidanceInput): ProductPromptGuidance {
    return GUIDANCE_BY_PROFILE[resolveGuidanceProfile(product)]
}
