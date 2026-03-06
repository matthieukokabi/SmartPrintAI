import { NextRequest, NextResponse } from 'next/server'
import { generateImage } from '@/lib/gemini'
import { uploadBase64Image } from '@/lib/storage'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
    try {
        const { prompt, style, sessionId } = await req.json()

        if (!prompt || prompt.trim().length < 3) {
            return NextResponse.json({ error: 'Prompt too short' }, { status: 400 })
        }

        if (prompt.length > 500) {
            return NextResponse.json({ error: 'Prompt too long (max 500 characters)' }, { status: 400 })
        }

        // Generate image via Gemini
        const base64Image = await generateImage({ prompt, style })

        // Upload to storage (Backblaze B2 in prod, returns data URL if not configured)
        const imageUrl = await uploadBase64Image(base64Image)

        // Save design to DB
        const design = await prisma.design.create({
            data: {
                prompt,
                style: style || 'artistic',
                imageUrl,
                sessionId,
                status: 'ready',
            },
        })

        return NextResponse.json({
            designId: design.id,
            imageUrl,
        })
    } catch (error) {
        console.error('Generate error:', error)
        return NextResponse.json(
            { error: 'Image generation failed. Please try again.' },
            { status: 500 }
        )
    }
}
