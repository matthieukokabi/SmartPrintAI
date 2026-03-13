import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

export interface GenerateImageOptions {
    prompt: string
    style?: 'artistic' | 'watercolor' | 'cartoon' | 'minimalist' | 'pop-art' | 'photorealistic'
    sourceImageDataUrl?: string
}

type ImageInlineData = {
    mimeType: string
    data: string
}

type CandidatePart = {
    inlineData?: ImageInlineData
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

export async function generateImage(options: GenerateImageOptions): Promise<string> {
    const { prompt, style = 'artistic', sourceImageDataUrl } = options
    const stylePrompt = STYLE_PROMPTS[style] || STYLE_PROMPTS.artistic

    const fullPrompt = `${prompt}. ${stylePrompt}. Transparent or white background. High quality print-ready design. No text unless specifically requested. Square format.`

    const model = genAI.getGenerativeModel({
        model: process.env.GEMINI_MODEL || 'gemini-2.5-flash-image',
    })

    const parts: GeminiRequestPart[] = sourceImageDataUrl
        ? [
            {
                text: `Edit the provided source image using this request: ${fullPrompt}. Keep the main composition centered and suitable for premium product printing.`,
            },
            {
                inlineData: parseSourceImageDataUrl(sourceImageDataUrl),
            },
        ]
        : [{ text: fullPrompt }]

    const request = {
        contents: [{ role: 'user', parts }],
        generationConfig: {
            responseModalities: ['image'],
        },
    } as unknown as Parameters<typeof model.generateContent>[0]

    const response = await model.generateContent(request)

    const candidate = response.response.candidates?.[0]
    const imagePart = candidate?.content?.parts?.find((p: CandidatePart) => Boolean(p.inlineData))

    if (!imagePart?.inlineData) {
        throw new Error('No image generated')
    }

    return `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`
}
