import { cn } from '@/lib/utils'

interface SectionHeaderProps {
    titleLead: string
    titleAccent: string
    subtitle: string
    className?: string
}

export default function SectionHeader({
    titleLead,
    titleAccent,
    subtitle,
    className,
}: SectionHeaderProps) {
    return (
        <div className={cn('mx-auto max-w-3xl text-center', className)}>
            <h2 className="text-4xl font-semibold tracking-[-0.04em] sm:text-5xl lg:text-[3.4rem]">
                {titleLead} <span className="font-editorial text-gradient">{titleAccent}</span>
            </h2>
            <p className="premium-muted mt-5 text-base leading-7 sm:text-lg">
                {subtitle}
            </p>
        </div>
    )
}
