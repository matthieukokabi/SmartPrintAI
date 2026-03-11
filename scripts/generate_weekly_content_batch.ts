import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'

type ChannelIdea = {
    theme: string
    prompt: string
    angle: string
    cta: string
}

const TIKTOK_POOL: ChannelIdea[] = [
    {
        theme: 'Funny Frenchie',
        prompt: 'Funny little French bulldog wearing sunglasses and a bucket hat, playful cartoon sticker style, bright colors',
        angle: 'Show the full prompt to final t-shirt in under 15 seconds.',
        cta: 'Comment FRENCHIE and pin this prompt for later.',
    },
    {
        theme: 'Pop Art Cat',
        prompt: 'Vibrant pop-art cat portrait with halftone texture, neon splashes, centered composition, clean t-shirt graphic',
        angle: 'Hook with before and after: plain tee to viral cat graphic.',
        cta: 'Tap link in bio to launch this design on your product.',
    },
    {
        theme: 'Geisha Watercolor',
        prompt: 'Elegant geisha-inspired portrait with cherry blossoms and lantern glow, watercolor and ink illustration',
        angle: 'Demonstrate premium aesthetic for hoodies and canvas.',
        cta: 'Save this prompt if you want premium gift designs.',
    },
    {
        theme: 'Retro Mountain Badge',
        prompt: 'Retro mountain adventure badge with pine trees and sunrise, national park poster style t-shirt graphic',
        angle: 'Focus on travel and hiking audience gift buyers.',
        cta: 'Use this idea for Father\'s Day and birthday gifts.',
    },
    {
        theme: 'Golden Retriever Sunset',
        prompt: 'Golden retriever smiling in retro 90s sunset stripes, vintage distressed print look, bold and friendly',
        angle: 'Show dog niche conversion proof and quick launch path.',
        cta: 'Reply DOG and we will share 3 extra dog prompts.',
    },
    {
        theme: 'Koi Minimalist',
        prompt: 'Minimalist koi fish yin-yang circle, Japanese tattoo inspired line art, black and red print style',
        angle: 'Target minimal style buyers and premium black shirt combos.',
        cta: 'Save this for your next minimalist collection.',
    },
    {
        theme: 'Wildflower Quote',
        prompt: 'Hand-painted wildflower bouquet with soft pastel tones and handwritten text Bloom at your pace',
        angle: 'Lifestyle and self-care gift positioning for female audience.',
        cta: 'Share with someone who would wear this every week.',
    },
    {
        theme: 'Boho Celestial',
        prompt: 'Boho celestial moon and stars with subtle constellation details, clean line art for premium tee print',
        angle: 'Contrast fast generation with premium-looking output.',
        cta: 'Click through to test this prompt on hoodies and tote bags.',
    },
]

const PINTEREST_POOL: ChannelIdea[] = [
    {
        theme: 'Pet Lover Gift',
        prompt: 'Watercolor corgi with floral frame, soft pastel palette, cozy lifestyle aesthetic',
        angle: 'Pin as pet gift for birthday and holiday inspiration.',
        cta: 'Pin this and reuse the prompt in your next design batch.',
    },
    {
        theme: 'Cyberpunk Husky',
        prompt: 'Cyberpunk husky portrait, neon accents, dark futuristic style',
        angle: 'Target gaming room decor and streetwear audience.',
        cta: 'Try this on hoodies and posters for higher AOV.',
    },
    {
        theme: 'Dachshund Chef',
        prompt: 'Cute dachshund chef illustration, playful kitchen theme, family-friendly style',
        angle: 'Kitchen decor and mug niche with broad seasonal demand.',
        cta: 'Save to your kitchen gift board.',
    },
    {
        theme: 'Border Collie Athlete',
        prompt: 'Monoline border collie agility pose, modern athletic brand vibe',
        angle: 'Sport and activewear angle for pet owners.',
        cta: 'Use this prompt for your next athletic pet collection.',
    },
    {
        theme: 'Boho Poodle',
        prompt: 'Boho-style poodle with botanical ornaments, earthy tones, premium lifestyle feel',
        angle: 'Premium lifestyle niche for tote and hoodie bundles.',
        cta: 'Pin now and test three color palettes.',
    },
    {
        theme: 'Birthday Cat Gift',
        prompt: 'Birthday gift design for a cat lover, playful watercolor style, pastel colors, centered composition, clean background',
        angle: 'Birthday seasonal pin with strong gift intent.',
        cta: 'Copy this prompt and launch a birthday collection.',
    },
    {
        theme: 'Minimal Paw Typography',
        prompt: 'Minimal typography plus paw icon composition, clean geometric balance',
        angle: 'Simple evergreen design style for high print clarity.',
        cta: 'Add this to your evergreen best sellers board.',
    },
    {
        theme: 'Vintage City Night',
        prompt: 'Vintage Van Gogh style starry night over a city',
        angle: 'Art-inspired decor and canvas conversion angle.',
        cta: 'Test this prompt first on canvas and wall art.',
    },
]

const BLOG_POOL = [
    'How to launch a 10-design AI pet collection in one afternoon',
    'Best prompt structures for premium hoodie designs that actually convert',
    'How to pick winning print-on-demand products by audience and margin',
    'AI gift design playbook for birthdays, anniversaries, and holiday peaks',
    'How to turn one winning prompt into 20 SKU-ready product variants',
]

function parseArg(name: string): string | null {
    const match = process.argv.find((arg) => arg.startsWith(`${name}=`))
    if (!match) {
        return null
    }
    return match.slice(name.length + 1)
}

function getMonday(date: Date): Date {
    const day = date.getUTCDay() || 7
    const monday = new Date(date)
    monday.setUTCDate(monday.getUTCDate() - day + 1)
    monday.setUTCHours(0, 0, 0, 0)
    return monday
}

function getIsoWeek(date: Date): { year: number; week: number } {
    const target = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
    const dayNum = target.getUTCDay() || 7
    target.setUTCDate(target.getUTCDate() + 4 - dayNum)
    const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1))
    const weekNo = Math.ceil((((target.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
    return { year: target.getUTCFullYear(), week: weekNo }
}

function rotate<T>(items: T[], count: number, offset: number): T[] {
    const result: T[] = []
    for (let index = 0; index < count; index += 1) {
        result.push(items[(offset + index) % items.length])
    }
    return result
}

function formatDate(date: Date): string {
    return date.toISOString().slice(0, 10)
}

function buildPlan(weekStart: Date): string {
    const iso = getIsoWeek(weekStart)
    const offset = iso.week % TIKTOK_POOL.length
    const tiktokIdeas = rotate(TIKTOK_POOL, 5, offset)
    const pinIdeas = rotate(PINTEREST_POOL, 7, offset)
    const blogIdeas = rotate(BLOG_POOL, 2, offset)

    const weekLabel = `${iso.year}-W${String(iso.week).padStart(2, '0')}`

    const lines: string[] = []
    lines.push(`# SmartPrintAI Weekly Content Batch - ${weekLabel}`)
    lines.push('')
    lines.push(`Week start (UTC Monday): ${formatDate(weekStart)}`)
    lines.push('')
    lines.push('## 90-minute runbook')
    lines.push('1. 15 min - Pick 5 TikTok hooks + prompts and assign publish slots.')
    lines.push('2. 20 min - Generate visuals/mockups for all TikTok clips in one batch.')
    lines.push('3. 20 min - Create 7 Pinterest pins from winning prompts and schedule them.')
    lines.push('4. 20 min - Draft 2 SEO blog post outlines with internal links to /create and /products.')
    lines.push('5. 15 min - Final QA: links, hashtags, CTA, and publish calendar.')
    lines.push('')
    lines.push('## TikTok (5 posts)')

    tiktokIdeas.forEach((idea, index) => {
        lines.push(`### Post ${index + 1} - ${idea.theme}`)
        lines.push(`- Prompt: ${idea.prompt}`)
        lines.push(`- Angle: ${idea.angle}`)
        lines.push(`- CTA: ${idea.cta}`)
        lines.push('')
    })

    lines.push('## Pinterest (7 pins)')
    pinIdeas.forEach((idea, index) => {
        lines.push(`### Pin ${index + 1} - ${idea.theme}`)
        lines.push(`- Prompt: ${idea.prompt}`)
        lines.push(`- Angle: ${idea.angle}`)
        lines.push(`- CTA: ${idea.cta}`)
        lines.push('')
    })

    lines.push('## SEO blog topics (2)')
    blogIdeas.forEach((idea, index) => {
        lines.push(`${index + 1}. ${idea}`)
    })
    lines.push('')
    lines.push('## Quality gate before publishing')
    lines.push('- Every post links to https://smartprintai.com/create or localized equivalent.')
    lines.push('- Product visuals match real catalog products and real colorways.')
    lines.push('- Captions include one clear CTA and one audience-specific keyword.')
    lines.push('- No copyrighted characters, logos, or trademarked franchises in prompts.')

    return lines.join('\n')
}

const weekStartArg = parseArg('--week-start')
const writePathArg = parseArg('--write')

const inputDate = weekStartArg ? new Date(`${weekStartArg}T00:00:00Z`) : new Date()
if (Number.isNaN(inputDate.getTime())) {
    throw new Error('Invalid --week-start value. Use YYYY-MM-DD.')
}

const weekStart = getMonday(inputDate)
const plan = buildPlan(weekStart)

if (writePathArg) {
    const absolutePath = path.resolve(process.cwd(), writePathArg)
    mkdirSync(path.dirname(absolutePath), { recursive: true })
    writeFileSync(absolutePath, plan + '\n', 'utf8')
    console.log(`Saved weekly content batch to ${absolutePath}`)
}

console.log(plan)
