import { prisma } from '@/lib/prisma'
import HowItWorksStory from '@/components/home/HowItWorksStory'
import { curatedShowcase, howItWorksShowcaseOrder } from '@/components/home/curatedShowcase'

type StepCopy = {
    title: string
    description: string
}

interface HowItWorksCopy {
    titleLead: string
    titleAccent: string
    subtitle: string
    stepLabel: string
    steps: [StepCopy, StepCopy, StepCopy]
}

const defaultCopy: HowItWorksCopy = {
    titleLead: 'How It',
    titleAccent: 'Works',
    subtitle: 'From idea to doorstep in three simple steps',
    stepLabel: 'STEP',
    steps: [
        {
            title: 'Describe Your Vision',
            description: 'Type any idea - a pet portrait, abstract art, or a funny quote. Our AI understands it all.',
        },
        {
            title: 'Pick Your Product',
            description: 'Choose from 15+ premium products - t-shirts, hoodies, mugs, canvas prints, and more.',
        },
        {
            title: 'We Print & Ship',
            description: 'Your custom product is printed on demand and shipped worldwide in 3-7 business days.',
        },
    ],
}

interface HowItWorksProps {
    copy?: HowItWorksCopy
}

export default async function HowItWorks({ copy = defaultCopy }: HowItWorksProps) {
    const readyCuratedDesigns = await prisma.design.findMany({
        where: {
            status: 'ready',
            prompt: {
                in: curatedShowcase.map((item) => item.prompt),
            },
            imageUrl: { not: '' },
        },
        orderBy: { createdAt: 'desc' },
        take: 100,
        select: {
            prompt: true,
            imageUrl: true,
        },
    })

    const designByPrompt = new Map<string, string>()
    for (const design of readyCuratedDesigns) {
        if (!designByPrompt.has(design.prompt) && design.imageUrl.startsWith('http') && !design.imageUrl.includes('localhost')) {
            designByPrompt.set(design.prompt, design.imageUrl)
        }
    }

    const preferredStoryIds = new Set<string>(howItWorksShowcaseOrder)

    const curatedPriority = [
        ...howItWorksShowcaseOrder
            .map((id) => curatedShowcase.find((item) => item.id === id))
            .filter((item): item is (typeof curatedShowcase)[number] => Boolean(item)),
        ...curatedShowcase.filter((item) => !preferredStoryIds.has(item.id)),
    ]

    const curatedImageSequence = curatedPriority
        .map((item) => designByPrompt.get(item.prompt) ?? null)
        .filter((imageUrl): imageUrl is string => Boolean(imageUrl))

    const fallbackImage = curatedImageSequence[0] ?? null
    const media = copy.steps.map((step, index) => ({
        title: step.title,
        imageUrl: curatedImageSequence[index] ?? fallbackImage,
    }))

    return <HowItWorksStory copy={copy} media={media} />
}
