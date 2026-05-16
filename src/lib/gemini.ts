import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

export interface GenerateImageOptions {
    prompt: string
    style?: 'artistic' | 'watercolor' | 'cartoon' | 'minimalist' | 'pop-art' | 'photorealistic'
    sourceImageDataUrl?: string
    orientationHint?: string
}

type ImageInlineData = {
    mimeType: string
    data: string
}

type CandidatePart = {
    inlineData?: ImageInlineData
    text?: string
}

type Candidate = {
    content?: {
        parts?: CandidatePart[]
    }
}

const STYLE_PROMPTS: Record<string, string> = {
    artistic: 'vibrant artistic illustration, bold colors, detailed artwork, suitable for print',
    watercolor: 'soft watercolor painting style, flowing colors, artistic brush strokes',
    cartoon: 'cartoon illustration style, clean lines, fun and playful, bold outlines',
    minimalist: 'minimalist design, clean simple shapes, limited color palette, modern',
    'pop-art': 'pop art style, bold contrasting colors, comic book influence, graphic design',
    photorealistic: 'photorealistic digital art, highly detailed, professional quality',
}

type GeminiRequestPart = {
    text?: string
    inlineData?: ImageInlineData
}

const SOURCE_IMAGE_DATA_URL_REGEX = /^data:(image\/(?:png|jpeg|jpg|webp));base64,([A-Za-z0-9+/=]+)$/i

function parseSourceImageDataUrl(sourceImageDataUrl: string): ImageInlineData {
    const match = SOURCE_IMAGE_DATA_URL_REGEX.exec(sourceImageDataUrl.trim())
    if (!match) {
        throw new Error('Invalid source image format')
    }

    const mimeType = match[1].toLowerCase() === 'image/jpg' ? 'image/jpeg' : match[1].toLowerCase()
    const data = match[2]
    return { mimeType, data }
}

export function buildPrintReadyPrompt(prompt: string, stylePrompt: string, orientationHint?: string): string {
    const orientationClause = orientationHint && orientationHint.trim().length > 0
        ? `${orientationHint.trim()} `
        : 'Square format. '
    return `${orientationClause}${prompt}. ${stylePrompt}. Transparent background only with alpha (no white or solid background). No white box, no frame, no poster backdrop. Keep the main subject large, centered, and tightly composed with clean cutout edges for product mockups. High quality print-ready design. No text unless specifically requested.`
}

export async function generateImage(options: GenerateImageOptions): Promise<string> {
    const { prompt, style = 'artistic', sourceImageDataUrl, orientationHint } = options
    const stylePrompt = STYLE_PROMPTS[style] || STYLE_PROMPTS.artistic

    const fullPrompt = buildPrintReadyPrompt(prompt, stylePrompt, orientationHint)

    const model = genAI.getGenerativeModel({
        model: process.env.GEMINI_MODEL || 'gemini-2.5-flash-image',
    })

    const requestImage = async (parts: GeminiRequestPart[]): Promise<string | null> => {
        const request = {
            contents: [{ role: 'user', parts }],
            generationConfig: {
                responseModalities: ['image'],
            },
        } as unknown as Parameters<typeof model.generateContent>[0]

        const response = await model.generateContent(request)
        const candidates = (response.response.candidates || []) as Candidate[]

        for (const candidate of candidates) {
            const candidateParts = candidate.content?.parts || []
            for (const part of candidateParts) {
                if (part.inlineData?.mimeType && part.inlineData?.data) {
                    return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`
                }
            }
        }

        return null
    }

    if (!sourceImageDataUrl) {
        const image = await requestImage([{ text: fullPrompt }])
        if (image) {
            return image
        }
        throw new Error('No image generated')
    }

    const editParts: GeminiRequestPart[] = [
        {
            text: `Edit the provided source image using this request: ${fullPrompt}. Keep the main composition centered and suitable for premium product printing.`,
        },
        {
            inlineData: parseSourceImageDataUrl(sourceImageDataUrl),
        },
    ]

    try {
        const editedImage = await requestImage(editParts)
        if (editedImage) {
            return editedImage
        }
    } catch (error) {
        const message = error instanceof Error ? error.message : ''
        if (!message.includes('Unable to process input image')) {
            throw error
        }
    }

    const fallbackImage = await requestImage([{
        text: `${fullPrompt} Use the uploaded photo as inspiration and generate a clean high-end printable variation of the same core subject.`,
    }])

    if (fallbackImage) {
        return fallbackImage
    }

    throw new Error('No image generated')
}
