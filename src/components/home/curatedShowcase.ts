export interface CuratedShowcaseItem {
    id: string
    prompt: string
    styleLabel: string
    audience: string
}

export const curatedShowcase: CuratedShowcaseItem[] = [
    {
        id: 'cat-pop',
        prompt: 'Vibrant pop-art cat portrait with halftone texture, neon splashes, centered composition, clean t-shirt graphic',
        styleLabel: 'Pop Art',
        audience: 'Cat Lovers',
    },
    {
        id: 'frenchie-funny',
        prompt: 'Funny little French bulldog wearing sunglasses and a bucket hat, playful cartoon sticker style, bright colors',
        styleLabel: 'Cartoon',
        audience: 'Frenchie Fans',
    },
    {
        id: 'dog-retro',
        prompt: 'Golden retriever smiling in retro 90s sunset stripes, vintage distressed print look, bold and friendly',
        styleLabel: 'Artistic',
        audience: 'Dog Lovers',
    },
    {
        id: 'geisha-watercolor',
        prompt: 'Elegant geisha-inspired portrait with cherry blossoms and lantern glow, watercolor and ink illustration',
        styleLabel: 'Watercolor',
        audience: 'Asian Art',
    },
    {
        id: 'koi-minimal',
        prompt: 'Minimalist koi fish yin-yang circle, Japanese tattoo inspired line art, black and red print style',
        styleLabel: 'Minimalist',
        audience: 'Tattoo Style',
    },
    {
        id: 'boho-celestial',
        prompt: 'Boho celestial moon and stars with subtle constellation details, clean line art for premium tee print',
        styleLabel: 'Minimalist',
        audience: 'Mystic Vibe',
    },
    {
        id: 'wildflower-bloom',
        prompt: 'Hand-painted wildflower bouquet with soft pastel tones and handwritten text Bloom at your pace',
        styleLabel: 'Watercolor',
        audience: 'Floral Trend',
    },
    {
        id: 'mountain-badge',
        prompt: 'Retro mountain adventure badge with pine trees and sunrise, national park poster style t-shirt graphic',
        styleLabel: 'Artistic',
        audience: 'Outdoor Style',
    },
]

export const howItWorksShowcaseOrder = ['cat-pop', 'frenchie-funny', 'dog-retro'] as const
