'use client'

import { DESIGN_STYLES, type DesignStyle } from '@/types'

interface Props {
    selected: DesignStyle
    onSelect: (style: DesignStyle) => void
    label: string
}

export default function StyleSelector({ selected, onSelect, label }: Props) {
    return (
        <div>
            <label className="text-sm font-medium text-muted-foreground mb-3 block">{label}</label>
            <div className="flex flex-wrap gap-2">
                {DESIGN_STYLES.map((style) => (
                    <button
                        key={style.value}
                        onClick={() => onSelect(style.value)}
                        className={`rounded-full px-4 py-2 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#26d4b8]/45 ${selected === style.value
                                ? 'bg-gradient-to-r from-[#2f6cf3] to-[#26d4b8] text-white shadow-lg shadow-[#26d4b8]/25'
                                : 'glass text-muted-foreground hover:border-[#2f6cf3]/30 hover:text-foreground'
                            }`}
                    >
                        {style.emoji} {style.label}
                    </button>
                ))}
            </div>
        </div>
    )
}
