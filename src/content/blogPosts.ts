export type BlogPostSection = {
    heading: string
    paragraphs: string[]
}

export type BlogPost = {
    slug: string
    title: string
    description: string
    publishedAt: string
    readTimeMinutes: number
    keywords: string[]
    sections: BlogPostSection[]
}

export const BLOG_POSTS: BlogPost[] = [
    {
        slug: 'creative-ai-tshirt-ideas-for-dog-lovers',
        title: '10 Creative AI T-Shirt Ideas for Dog Lovers',
        description: 'Discover 10 high-converting AI t-shirt design ideas for dog lovers and how to turn each prompt into a product people actually buy.',
        publishedAt: '2026-03-10T09:00:00.000Z',
        readTimeMinutes: 6,
        keywords: [
            'dog lover t shirt ideas',
            'ai tshirt design prompts',
            'custom dog shirts',
            'pet portrait merch',
        ],
        sections: [
            {
                heading: 'Why dog-lover designs convert so well',
                paragraphs: [
                    'Dog owners buy products that feel personal. A shirt that reflects their dog personality is emotional, giftable, and highly shareable.',
                    'AI creation makes this niche fast to test: one idea can become multiple visual styles in minutes.',
                ],
            },
            {
                heading: '10 prompt ideas you can use today',
                paragraphs: [
                    '1) “Golden retriever in retro sunset style, warm orange tones, clean vector look.”',
                    '2) “Minimal line-art portrait of a french bulldog, black on white, premium streetwear look.”',
                    '3) “Watercolor corgi with floral frame, soft pastel palette, cozy lifestyle aesthetic.”',
                    '4) “Comic-book beagle wearing sunglasses, pop-art halftone background, bold contrast.”',
                    '5) “Vintage hiking badge with german shepherd silhouette, forest colors, distressed texture.”',
                    '6) “Cyberpunk husky portrait, neon accents, dark futuristic style.”',
                    '7) “Cute dachshund chef illustration, playful kitchen theme, family-friendly style.”',
                    '8) “Monoline border collie agility pose, modern athletic brand vibe.”',
                    '9) “Boho-style poodle with botanical ornaments, earthy tones, premium lifestyle feel.”',
                    '10) “Minimal typography + paw icon composition, clean geometric balance.”',
                ],
            },
            {
                heading: 'How to make each idea print-ready',
                paragraphs: [
                    'Keep composition centered for shirts and hoodies. Avoid tiny details and thin outlines that disappear on fabric.',
                    'If text is required, use short phrases only and test legibility on dark and light products before publishing.',
                ],
            },
            {
                heading: 'Best products to pair with these prompts',
                paragraphs: [
                    'Start with unisex t-shirts and hoodies for conversion volume, then duplicate winners to mugs and tote bags for higher AOV.',
                    'For gift season, create matching variants: “Dog Mom”, “Dog Dad”, and breed-specific versions.',
                ],
            },
            {
                heading: 'Final checklist before launch',
                paragraphs: [
                    'Publish at least 10 designs in one batch, track clicks and add-to-cart rate, and keep only the top performers.',
                    'Use TikTok/Instagram short videos showing prompt-to-product transformation to accelerate discovery.',
                ],
            },
        ],
    },
    {
        slug: 'best-custom-birthday-gift-ideas-made-with-ai',
        title: 'Best Custom Birthday Gift Ideas Made with AI',
        description: 'A practical list of AI-generated custom birthday gift ideas that are personal, fast to create, and easy to ship worldwide.',
        publishedAt: '2026-03-10T09:15:00.000Z',
        readTimeMinutes: 7,
        keywords: [
            'custom birthday gift ideas',
            'ai personalized gifts',
            'print on demand birthday gifts',
            'unique birthday present',
        ],
        sections: [
            {
                heading: 'Why AI-made gifts feel more personal',
                paragraphs: [
                    'Most birthday gifts are generic. AI lets you generate a design based on inside jokes, hobbies, and personal style in seconds.',
                    'You can move from concept to checkout in one session, making last-minute gifting realistic.',
                ],
            },
            {
                heading: 'Top gift formats that work best',
                paragraphs: [
                    'Custom t-shirts for friends and couples.',
                    'Hoodies for premium feel and higher perceived value.',
                    'Mugs for office birthdays and practical gifts.',
                    'Canvas prints for memorable milestone birthdays.',
                    'Tote bags for daily-use and trend-friendly designs.',
                ],
            },
            {
                heading: 'Prompt framework for better results',
                paragraphs: [
                    'Use this structure: subject + style + mood + color palette + composition.',
                    'Example: “Birthday gift design for a cat lover, playful watercolor style, pastel colors, centered composition, clean background.”',
                ],
            },
            {
                heading: 'How to avoid common mistakes',
                paragraphs: [
                    'Do not overload prompts with too many ideas at once. Keep one central concept per design.',
                    'Avoid long text-heavy compositions unless you verify readability on mockups.',
                    'Always compare at least two style variants before selecting your final design.',
                ],
            },
            {
                heading: 'From idea to shipped gift in one workflow',
                paragraphs: [
                    'Generate image from prompt, apply to product, review mockup, and complete checkout.',
                    'After order confirmation, track status and share shipment updates with the recipient for a better post-purchase experience.',
                ],
            },
            {
                heading: 'Quick launch plan',
                paragraphs: [
                    'Create 5 birthday themes: pet lover, sports fan, travel, minimalist quote, and family memories.',
                    'Publish each theme on 2 product types, then scale only the variants that get clicks and add-to-cart activity.',
                ],
            },
        ],
    },
]

export function getBlogPostBySlug(slug: string): BlogPost | null {
    return BLOG_POSTS.find((post) => post.slug === slug) ?? null
}
