import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

export interface GenerateImageOptions {
    prompt: string
    style?: 'artistic' | 'watercolor' | 'cartoon' | 'minimalist' | 'pop-art' | 'photorealistic'
}

const STYLE_PROMPTS: Record<string, string> = {
    artistic: 'vibrant artistic illustration, bold colors, detailed artwork, suitable for print',
    watercolor: 'soft watercolor painting style, flowing colors, artistic brush strokes',
    cartoon: 'cartoon illustration style, clean lines, fun and playful, bold outlines',
    minimalist: 'minimalist design, clean simple shapes, limited color palette, modern',
    'pop-art': 'pop art style, bold contrasting colors, comic book influence, graphic design',
    photorealistic: 'photorealistic digital art, highly detailed, professional quality',
}

export async function generateImage(options: GenerateImageOptions): Promise<string> {
    const { prompt, style = 'artistic' } = options
    const stylePrompt = STYLE_PROMPTS[style] || STYLE_PROMPTS.artistic

    const fullPrompt = `${prompt}. ${stylePrompt}. Transparent or white background. High quality print-ready design. No text unless specifically requested. Square format.`

    const model = genAI.getGenerativeModel({
        model: process.env.GEMINI_MODEL || 'gemini-2.0-flash-preview-image-generation',
    })

    const response = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: fullPrompt }] }],
        generationConfig: {
            // @ts-expect-error — image generation config not in official types yet
            responseModalities: ['image'],
        },
    })

    const candidate = response.response.candidates?.[0]
    const imagePart = candidate?.content?.parts?.find((p) => p.inlineData)

    if (!imagePart?.inlineData) {
        throw new Error('No image generated — try a different prompt or style.')
    }

    return `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`
}
