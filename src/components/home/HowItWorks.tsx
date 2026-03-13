import { prisma } from '@/lib/prisma'
import HowItWorksStory from '@/components/home/HowItWorksStory'

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
    const [latestReadyDesign, activeProducts] = await Promise.all([
        prisma.design.findFirst({
            where: {
                status: 'ready',
                imageUrl: { not: '' },
            },
            orderBy: { createdAt: 'desc' },
            select: {
                imageUrl: true,
            },
        }),
        prisma.product.findMany({
            where: {
                active: true,
                imageUrl: { not: '' },
            },
            orderBy: { name: 'asc' },
            take: 2,
            select: {
                imageUrl: true,
            },
        }),
    ])

    const media = [
        {
            title: copy.steps[0].title,
            imageUrl: latestReadyDesign?.imageUrl ?? activeProducts[0]?.imageUrl ?? null,
        },
        {
            title: copy.steps[1].title,
            imageUrl: activeProducts[0]?.imageUrl ?? latestReadyDesign?.imageUrl ?? null,
        },
        {
            title: copy.steps[2].title,
            imageUrl: activeProducts[1]?.imageUrl ?? activeProducts[0]?.imageUrl ?? latestReadyDesign?.imageUrl ?? null,
        },
    ]

    return <HowItWorksStory copy={copy} media={media} />
}
