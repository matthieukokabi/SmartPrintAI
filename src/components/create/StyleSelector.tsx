'use client'

import { DESIGN_STYLES, type DesignStyle } from '@/types'

interface Props {
    selected: DesignStyle
    onSelect: (style: DesignStyle) => void
}

export default function StyleSelector({ selected, onSelect }: Props) {
    return (
        <div>
            <label className="text-sm font-medium text-muted-foreground mb-3 block">Style</label>
            <div className="flex flex-wrap gap-2">
                {DESIGN_STYLES.map((style) => (
                    <button
                        key={style.value}
                        onClick={() => onSelect(style.value)}
                        className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${selected === style.value
                                ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/25'
                                : 'glass text-muted-foreground hover:text-foreground hover:border-purple-500/30'
                            }`}
                    >
                        {style.emoji} {style.label}
                    </button>
                ))}
            </div>
        </div>
    )
}
