import { Loader2 } from 'lucide-react'

export default function LoadingSpinner({ text = 'Loading...' }: { text?: string }) {
    return (
        <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-purple-400 mb-4" />
            <p className="text-sm text-muted-foreground">{text}</p>
        </div>
    )
}
