import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
    return {
        name: 'SmartPrintAI',
        short_name: 'SmartPrintAI',
        description:
            'Describe your vision, watch AI create it, and get it printed on premium products.',
        start_url: '/',
        display: 'standalone',
        background_color: '#020617',
        theme_color: '#9333ea',
        icons: [
            {
                src: '/icon?size=192',
                sizes: '192x192',
                type: 'image/png',
            },
            {
                src: '/icon?size=512',
                sizes: '512x512',
                type: 'image/png',
            },
            {
                src: '/apple-icon',
                sizes: '180x180',
                type: 'image/png',
            },
        ],
    }
}
