'use client'

import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { useSearchParams } from 'next/navigation'
import Image from 'next/image'
import PromptInput from '@/components/create/PromptInput'
import StyleSelector from '@/components/create/StyleSelector'
import GeneratedImage from '@/components/create/GeneratedImage'
import ProductPicker from '@/components/create/ProductPicker'
import MockupPreview from '@/components/create/MockupPreview'
import TrustSignalStrip from '@/components/shared/TrustSignalStrip'
import LanguageSwitcher from '@/components/layout/LanguageSwitcher'
import { useCart } from '@/store/cart'
import type { DesignStyle, Product } from '@/types'
import type { LocaleCopy, SupportedLocale } from '@/lib/i18n'
import { ShoppingCart, Check } from 'lucide-react'
import { isMockupEligibleProduct } from '@/lib/mockup-eligibility'
import { getCreateProductPromptGuidance } from '@/lib/create-product-guidance'
import {
    trackCreateEntrypointResolved,
    trackCreateFlowAbandonedEarly,
    trackCreateFlowStarted,
    trackCreateGenerationStarted,
    trackCreatePageViewed,
    trackCreateProductSelected,
    trackCreatePromptInputFocused,
    trackCreatePromptStarted,
    trackCreateTemplateSelected,
} from '@/lib/analytics'
import {
    HOMEPAGE_HERO_VARIANT_COOKIE,
    HOMEPAGE_VISITOR_ID_COOKIE,
    normalizeHomepageHeroVariant,
    sanitizeVisitorId,
} from '@/lib/homepage-experiment'

type CreatePageClientProps = {
    locale: SupportedLocale
    copy: LocaleCopy['create']
}

type CreateEntrypoint = 'homepage' | 'other' | 'unknown'
type CreatePromptLengthBucket = '0_2' | '3_10' | '11_30' | '31_80' | '81_plus'

function colorDotStyle(hex: string) {
    const safeHex = /^#[0-9a-f]{6}$/i.test(hex) ? hex : '#ffffff'
    return { backgroundColor: safeHex }
}

const MAX_REFERENCE_IMAGE_BYTES = 8 * 1024 * 1024
const SUPPORTED_REFERENCE_IMAGE_TYPES = new Set(['image/png', 'image/jpeg', 'image/jpg', 'image/webp'])
const MAX_REFERENCE_IMAGE_DATA_URL_LENGTH = 900_000
const TARGET_REFERENCE_IMAGE_LONG_EDGE = 1400
const MIN_REFERENCE_IMAGE_LONG_EDGE = 768
const MAX_MOCKUP_RETRY_ATTEMPTS = 2
const DEFAULT_MOCKUP_RETRY_SEC = 12
const MAX_MOCKUP_RETRY_SEC = 90
const MOCKUP_RETRY_BUFFER_SEC = 3

function normalizeReferrerPath(referrer: string): string | undefined {
    if (!referrer) {
        return undefined
    }
    try {
        const url = new URL(referrer)
        if (typeof window !== 'undefined' && url.origin !== window.location.origin) {
            return 'external'
        }
        return url.pathname
    } catch {
        return undefined
    }
}

function isHomepagePath(path: string | undefined): boolean {
    if (!path) {
        return false
    }
    return /^\/(?:en|fr|de|es)?$/.test(path)
}

function toPromptLengthBucket(promptLength: number): CreatePromptLengthBucket {
    if (promptLength <= 2) {
        return '0_2'
    }
    if (promptLength <= 10) {
        return '3_10'
    }
    if (promptLength <= 30) {
        return '11_30'
    }
    if (promptLength <= 80) {
        return '31_80'
    }
    return '81_plus'
}

function readHomepageVariantFromDocumentCookie(): string | undefined {
    const rawCookieValue = document.cookie
        .split(';')
        .map((part) => part.trim())
        .find((part) => part.startsWith(`${HOMEPAGE_HERO_VARIANT_COOKIE}=`))
        ?.split('=')
        .slice(1)
        .join('=')

    let cookieValue: string | null = null
    if (rawCookieValue) {
        try {
            cookieValue = decodeURIComponent(rawCookieValue)
        } catch {
            cookieValue = rawCookieValue
        }
    }

    const variant = normalizeHomepageHeroVariant(cookieValue)
    return variant || undefined
}

function readHomepageVisitorIdFromDocumentCookie(): string | undefined {
    const rawCookieValue = document.cookie
        .split(';')
        .map((part) => part.trim())
        .find((part) => part.startsWith(`${HOMEPAGE_VISITOR_ID_COOKIE}=`))
        ?.split('=')
        .slice(1)
        .join('=')

    let cookieValue: string | null = null
    if (rawCookieValue) {
        try {
            cookieValue = decodeURIComponent(rawCookieValue)
        } catch {
            cookieValue = rawCookieValue
        }
    }

    return sanitizeVisitorId(cookieValue) || undefined
}

function readFileAsDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => {
            if (typeof reader.result === 'string') {
                resolve(reader.result)
                return
            }
            reject(new Error('Could not read image. Please try another file.'))
        }
        reader.onerror = () => reject(new Error('Could not read image. Please try another file.'))
        reader.readAsDataURL(file)
    })
}

function loadImageElement(dataUrl: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const image = new window.Image()
        image.onload = () => resolve(image)
        image.onerror = () => reject(new Error('Could not process image. Please try another file.'))
        image.src = dataUrl
    })
}

function renderImageDataUrl(
    image: HTMLImageElement,
    longEdge: number,
    preferredFormat: 'image/webp' | 'image/jpeg',
    quality: number
): string {
    const longestSide = Math.max(image.width, image.height)
    const scale = longestSide > longEdge ? longEdge / longestSide : 1
    const width = Math.max(1, Math.round(image.width * scale))
    const height = Math.max(1, Math.round(image.height * scale))
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) {
        throw new Error('Could not process image. Please try another file.')
    }
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(image, 0, 0, width, height)

    let output = canvas.toDataURL(preferredFormat, quality)
    if (!output.startsWith(`data:${preferredFormat}`)) {
        output = canvas.toDataURL('image/jpeg', quality)
    }
    return output
}

async function prepareReferenceImageDataUrl(file: File): Promise<string> {
    const originalDataUrl = await readFileAsDataUrl(file)
    const image = await loadImageElement(originalDataUrl)

    if (originalDataUrl.length <= MAX_REFERENCE_IMAGE_DATA_URL_LENGTH) {
        return originalDataUrl
    }

    const format: 'image/webp' | 'image/jpeg' = file.type === 'image/png' ? 'image/webp' : 'image/jpeg'
    const longEdgeTargets = [TARGET_REFERENCE_IMAGE_LONG_EDGE, 1200, 1024, MIN_REFERENCE_IMAGE_LONG_EDGE]
    const qualityTargets = [0.88, 0.8, 0.72, 0.64, 0.56, 0.5]

    for (const longEdge of longEdgeTargets) {
        for (const quality of qualityTargets) {
            const candidate = renderImageDataUrl(image, longEdge, format, quality)
            if (candidate.length <= MAX_REFERENCE_IMAGE_DATA_URL_LENGTH) {
                return candidate
            }
        }
    }

    throw new Error('Uploaded photo is too large. Please use a smaller image.')
}

export default function CreatePageClient({ locale, copy }: CreatePageClientProps) {
    const searchParams = useSearchParams()
    const initialPrompt = searchParams.get('prompt') || ''
    const initialProductId = searchParams.get('productId')
    const initialColor = searchParams.get('color') || ''
    const initialSize = searchParams.get('size') || ''

    const [style, setStyle] = useState<DesignStyle>('artistic')
    const [isGenerating, setIsGenerating] = useState(false)
    const [designId, setDesignId] = useState<string | null>(null)
    const [imageUrl, setImageUrl] = useState<string | null>(null)
    const [currentPrompt, setCurrentPrompt] = useState(initialPrompt)
    const [referenceImageDataUrl, setReferenceImageDataUrl] = useState<string | null>(null)
    const [referenceImageName, setReferenceImageName] = useState<string | null>(null)
    const [referenceImageError, setReferenceImageError] = useState<string | null>(null)
    const [generateError, setGenerateError] = useState<string | null>(null)

    const [products, setProducts] = useState<Product[]>([])
    const [selectedProduct, setSelectedProduct] = useState<string | null>(initialProductId)
    const [mockupUrl, setMockupUrl] = useState<string | null>(null)
    const [isMockupLoading, setIsMockupLoading] = useState(false)
    const [mockupError, setMockupError] = useState<string | null>(null)

    const [selectedSize, setSelectedSize] = useState(initialSize)
    const [selectedColor, setSelectedColor] = useState(initialColor)
    const [added, setAdded] = useState(false)

    const addItem = useCart((s) => s.addItem)
    const updateMockupForDesign = useCart((s) => s.updateMockupForDesign)
    const entryContextRef = useRef<{
        entrypoint: CreateEntrypoint
        referrerPath: string
        homepageVariant?: string
        visitorId?: string
    }>({
        entrypoint: 'unknown',
        referrerPath: 'direct',
        homepageVariant: undefined,
        visitorId: undefined,
    })
    const createEntryStageRef = useRef({
        promptFocused: false,
        promptStarted: false,
        generationStarted: false,
        productSelected: false,
        templateSelected: false,
    })
    const promptLengthBucketRef = useRef<CreatePromptLengthBucket>(toPromptLengthBucket(initialPrompt.trim().length))

    const getCreateAnalyticsContext = () => ({
        entrypoint: entryContextRef.current.entrypoint,
        referrer_path: entryContextRef.current.referrerPath,
        locale,
        page_variant: entryContextRef.current.homepageVariant,
        visitor_id: entryContextRef.current.visitorId,
    })

    useEffect(() => {
        const referrerPath = normalizeReferrerPath(document.referrer)
        const entrypoint: CreateEntrypoint = isHomepagePath(referrerPath)
            ? 'homepage'
            : referrerPath
                ? 'other'
                : 'unknown'
        const homepageVariant = readHomepageVariantFromDocumentCookie()
        const visitorId = readHomepageVisitorIdFromDocumentCookie()
        const normalizedReferrerPath = referrerPath || 'direct'

        entryContextRef.current = {
            entrypoint,
            referrerPath: normalizedReferrerPath,
            homepageVariant,
            visitorId,
        }

        trackCreatePageViewed({
            entrypoint,
            referrer_path: normalizedReferrerPath,
            locale,
            page_variant: homepageVariant,
            visitor_id: visitorId,
        })
        trackCreateEntrypointResolved({
            entrypoint,
            referrer_path: normalizedReferrerPath,
            locale,
            page_variant: homepageVariant,
            visitor_id: visitorId,
        })

        trackCreateFlowStarted({
            entrypoint,
            referrer_path: normalizedReferrerPath,
            locale,
            page_variant: homepageVariant,
            visitor_id: visitorId,
        })

        const stageState = createEntryStageRef.current
        return () => {
            if (stageState.generationStarted) {
                return
            }

            let lastCompletedStep: 'page_viewed' | 'prompt_focused' | 'prompt_started' | 'template_selected' | 'product_selected' = 'page_viewed'
            if (stageState.promptFocused) {
                lastCompletedStep = 'prompt_focused'
            }
            if (stageState.promptStarted) {
                lastCompletedStep = 'prompt_started'
            }
            if (stageState.templateSelected) {
                lastCompletedStep = 'template_selected'
            }
            if (stageState.productSelected) {
                lastCompletedStep = 'product_selected'
            }

            const context = entryContextRef.current
            trackCreateFlowAbandonedEarly({
                entrypoint: context.entrypoint,
                referrer_path: context.referrerPath,
                locale,
                page_variant: context.homepageVariant,
                last_completed_step: lastCompletedStep,
                prompt_length_bucket: promptLengthBucketRef.current,
            })
        }
    }, [locale])

    useEffect(() => {
        fetch('/api/products')
            .then((r) => r.json())
            .then((data: Product[]) => setProducts(data))
            .catch(console.error)
    }, [])

    const mockupEligibleProducts = products.filter((p) =>
        isMockupEligibleProduct({ name: p.name, printfulId: p.printfulId, printArea: p.printArea })
    )

    useEffect(() => {
        if (!mockupEligibleProducts.length || !selectedProduct) return
        const exists = mockupEligibleProducts.some((p) => p.id === selectedProduct)
        if (!exists) {
            setSelectedProduct(null)
        }
    }, [mockupEligibleProducts, selectedProduct])

    const product = mockupEligibleProducts.find((p) => p.id === selectedProduct)
    const productPromptGuidance = product ? getCreateProductPromptGuidance(product) : null

    useEffect(() => {
        if (!product) return

        const defaultSize = product.sizes[0] || 'One Size'
        const defaultColor = product.colors[0]?.name || 'Default'

        if (!product.sizes.includes(selectedSize)) {
            setSelectedSize(defaultSize)
        }

        const matchingColor = product.colors.find(
            (color) => color.name.toLowerCase() === selectedColor.toLowerCase()
        )
        if (!matchingColor) {
            setSelectedColor(defaultColor)
        } else if (matchingColor.name !== selectedColor) {
            setSelectedColor(matchingColor.name)
        }
    }, [product, selectedColor, selectedSize])

    useEffect(() => {
        if (!designId || !selectedProduct || !selectedColor) return

        const controller = new AbortController()
        let cancelled = false
        let retryTimer: ReturnType<typeof setTimeout> | null = null

        async function generateMockup(attempt = 0) {
            let keepLoadingForRetry = false
            setIsMockupLoading(true)
            if (attempt === 0) {
                setMockupUrl(null)
                setMockupError(null)
            }
            try {
                const res = await fetch('/api/mockup', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ designId, productId: selectedProduct, color: selectedColor }),
                    signal: controller.signal,
                })

                const contentType = res.headers.get('content-type') || ''
                const data = contentType.includes('application/json')
                    ? (await res.json()) as { mockupUrl?: string; error?: string; retryAfterSec?: number }
                    : null

                if (res.status === 429) {
                    const retryAfterHeader = Number(res.headers.get('retry-after') || '')
                    const retryAfterBody = typeof data?.retryAfterSec === 'number' ? data.retryAfterSec : NaN
                    const retryAfterSecRaw = Number.isFinite(retryAfterHeader) && retryAfterHeader > 0
                        ? retryAfterHeader
                        : (Number.isFinite(retryAfterBody) && retryAfterBody > 0 ? retryAfterBody : DEFAULT_MOCKUP_RETRY_SEC)
                    const retryAfterSec = Math.min(
                        Math.max(Math.ceil(retryAfterSecRaw) + MOCKUP_RETRY_BUFFER_SEC, 1),
                        MAX_MOCKUP_RETRY_SEC
                    )

                    if (attempt < MAX_MOCKUP_RETRY_ATTEMPTS && !cancelled) {
                        keepLoadingForRetry = true
                        retryTimer = setTimeout(() => {
                            void generateMockup(attempt + 1)
                        }, retryAfterSec * 1000)
                        return
                    }

                    throw new Error(data?.error || 'Mockup provider is busy. Please try again in about one minute.')
                }

                if (!res.ok) {
                    throw new Error(data?.error || 'Mockup generation failed')
                }

                if (!data?.mockupUrl) {
                    throw new Error('Mockup generation failed')
                }

                if (!cancelled) {
                    setMockupUrl(data.mockupUrl)
                    if (designId && selectedProduct) {
                        updateMockupForDesign(designId, selectedProduct, data.mockupUrl)
                    }
                }
            } catch (err) {
                if (!cancelled) {
                    console.error(err)
                    if (err instanceof Error && err.name === 'AbortError') {
                        return
                    }
                    setMockupError(err instanceof Error ? err.message : 'Mockup generation failed')
                }
            } finally {
                if (!cancelled && !keepLoadingForRetry) {
                    setIsMockupLoading(false)
                }
            }
        }

        void generateMockup()
        return () => {
            cancelled = true
            controller.abort()
            if (retryTimer) {
                clearTimeout(retryTimer)
            }
        }
    }, [designId, selectedProduct, selectedColor, updateMockupForDesign])

    const handleGenerate = async (prompt: string) => {
        const promptLengthBucket = toPromptLengthBucket(prompt.trim().length)
        promptLengthBucketRef.current = promptLengthBucket
        if (!createEntryStageRef.current.promptStarted && prompt.trim().length > 0) {
            trackCreatePromptStarted({
                ...getCreateAnalyticsContext(),
                prompt_length_bucket: promptLengthBucket,
            })
            createEntryStageRef.current.promptStarted = true
        }
        if (!createEntryStageRef.current.generationStarted) {
            trackCreateGenerationStarted({
                ...getCreateAnalyticsContext(),
                prompt_length_bucket: promptLengthBucket,
                template_type: style,
                has_reference_image: Boolean(referenceImageDataUrl),
            })
            createEntryStageRef.current.generationStarted = true
        }

        setIsGenerating(true)
        setImageUrl(null)
        setDesignId(null)
        setMockupUrl(null)
        setMockupError(null)
        setCurrentPrompt(prompt)
        setGenerateError(null)
        try {
            const res = await fetch('/api/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt,
                    style,
                    sourceImageDataUrl: referenceImageDataUrl ?? undefined,
                }),
            })
            if (!res.ok) {
                if (res.status === 413) {
                    throw new Error('Uploaded photo is too large. Please use a smaller image.')
                }

                const contentType = res.headers.get('content-type') || ''
                if (contentType.includes('application/json')) {
                    const errorData = (await res.json()) as { error?: string }
                    throw new Error(errorData.error || 'Image generation failed. Please try again.')
                }

                throw new Error('Image generation failed. Please try again.')
            }

            const data = await res.json()
            if (data.imageUrl) {
                setImageUrl(data.imageUrl)
                setDesignId(data.designId)
                return
            }
            throw new Error(data.error || 'Image generation failed. Please try again.')
        } catch (err) {
            console.error(err)
            setGenerateError(err instanceof Error ? err.message : 'Image generation failed. Please try again.')
        } finally {
            setIsGenerating(false)
        }
    }

    const handleReferenceImageUpload = (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0]
        if (!file) {
            return
        }

        if (!SUPPORTED_REFERENCE_IMAGE_TYPES.has(file.type)) {
            setReferenceImageError('Use PNG, JPG, or WEBP only.')
            setReferenceImageDataUrl(null)
            setReferenceImageName(null)
            setGenerateError(null)
            event.target.value = ''
            return
        }

        if (file.size > MAX_REFERENCE_IMAGE_BYTES) {
            setReferenceImageError('Image is too large. Max size is 8MB.')
            setReferenceImageDataUrl(null)
            setReferenceImageName(null)
            setGenerateError(null)
            event.target.value = ''
            return
        }

        prepareReferenceImageDataUrl(file)
            .then((dataUrl) => {
                setReferenceImageDataUrl(dataUrl)
                setReferenceImageName(file.name)
                setReferenceImageError(null)
                setGenerateError(null)
                event.target.value = ''
            })
            .catch((error) => {
                const message = error instanceof Error
                    ? error.message
                    : 'Could not process image. Please try another file.'
                setReferenceImageError(message)
                setReferenceImageDataUrl(null)
                setReferenceImageName(null)
                setGenerateError(null)
                event.target.value = ''
            })
    }

    const clearReferenceImage = () => {
        setReferenceImageDataUrl(null)
        setReferenceImageName(null)
        setReferenceImageError(null)
        setGenerateError(null)
    }

    const clearGenerationError = () => {
        if (generateError) {
            setGenerateError(null)
        }
    }

    const handlePromptInputFocus = () => {
        clearGenerationError()
        if (createEntryStageRef.current.promptFocused) {
            return
        }
        trackCreatePromptInputFocused(getCreateAnalyticsContext())
        createEntryStageRef.current.promptFocused = true
    }

    const handlePromptStarted = (promptLength: number) => {
        const promptLengthBucket = toPromptLengthBucket(promptLength)
        promptLengthBucketRef.current = promptLengthBucket
        if (createEntryStageRef.current.promptStarted) {
            return
        }
        trackCreatePromptStarted({
            ...getCreateAnalyticsContext(),
            prompt_length_bucket: promptLengthBucket,
        })
        createEntryStageRef.current.promptStarted = true
    }

    const handleStyleChange = (nextStyle: DesignStyle) => {
        clearGenerationError()
        if (!createEntryStageRef.current.templateSelected) {
            trackCreateTemplateSelected({
                ...getCreateAnalyticsContext(),
                template_type: nextStyle,
            })
            createEntryStageRef.current.templateSelected = true
        }
        setStyle(nextStyle)
    }

    const handleProductSelect = (productId: string) => {
        if (!createEntryStageRef.current.productSelected) {
            const selectedProductData = mockupEligibleProducts.find((candidate) => candidate.id === productId)
            trackCreateProductSelected({
                ...getCreateAnalyticsContext(),
                product_id: productId,
                product_type: selectedProductData?.category || 'unknown',
            })
            createEntryStageRef.current.productSelected = true
        }
        setSelectedProduct(productId)
    }

    const handleAddToCart = () => {
        if (!designId || !selectedProduct) return
        const selectedProductData = products.find((p) => p.id === selectedProduct)
        if (!selectedProductData) return

        const sizeForCart = selectedProductData.sizes.includes(selectedSize)
            ? selectedSize
            : (selectedProductData.sizes[0] || 'One Size')
        const colorForCart = selectedProductData.colors.find(
            (color) => color.name.toLowerCase() === selectedColor.toLowerCase()
        )?.name || selectedProductData.colors[0]?.name || 'Default'

        addItem({
            id: `${designId}-${selectedProduct}-${sizeForCart}-${colorForCart}`,
            productId: selectedProduct,
            productName: selectedProductData.name,
            designId,
            imageUrl: imageUrl || '',
            mockupUrl: mockupUrl || imageUrl || '',
            size: sizeForCart,
            color: colorForCart,
            quantity: 1,
            price: selectedProductData.sellPrice,
        })
        setAdded(true)
        setTimeout(() => setAdded(false), 2000)
    }

    return (
        <div className="max-w-7xl mx-auto px-4 py-12">
            <div className="mb-5 flex justify-center">
                <LanguageSwitcher currentLocale={locale} pagePath="/create" />
            </div>

            <div className="text-center mb-12">
                <h1 className="text-3xl sm:text-4xl font-bold mb-3">
                    {copy.titleLead} <span className="text-gradient">{copy.titleAccent}</span>
                </h1>
                <p className="text-muted-foreground">{copy.subtitle}</p>
            </div>

            <TrustSignalStrip locale={locale} className="mb-8" />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="space-y-8">
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-5 space-y-3">
                        <div>
                            <p className="text-sm font-semibold text-foreground">Reference Photo (optional)</p>
                            <p className="text-xs text-muted-foreground mt-1">
                                Upload your own image and AI will transform it using your prompt.
                            </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <label className="inline-flex items-center px-4 py-2 rounded-xl glass text-sm cursor-pointer hover:text-foreground transition-colors">
                                Upload Photo
                                <input
                                    type="file"
                                    accept="image/png,image/jpeg,image/jpg,image/webp"
                                    className="hidden"
                                    onChange={handleReferenceImageUpload}
                                />
                            </label>
                            {referenceImageDataUrl && (
                                <button
                                    type="button"
                                    onClick={clearReferenceImage}
                                    className="inline-flex items-center px-4 py-2 rounded-xl border border-white/10 text-sm text-muted-foreground hover:text-foreground transition-colors"
                                >
                                    Remove
                                </button>
                            )}
                        </div>
                        {referenceImageName && (
                            <p className="text-xs text-muted-foreground truncate">{referenceImageName}</p>
                        )}
                        {referenceImageError && (
                            <p className="text-xs text-red-300">{referenceImageError}</p>
                        )}
                        {referenceImageDataUrl && (
                            <div className="relative h-40 w-full max-w-sm overflow-hidden rounded-xl border border-white/10 bg-black/20">
                                <Image
                                    src={referenceImageDataUrl}
                                    alt="Uploaded reference image"
                                    fill
                                    className="object-cover"
                                    unoptimized
                                />
                            </div>
                        )}
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-5 space-y-4">
                        <div className="space-y-1.5">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#26d4b8]/90">
                                {copy.entryStepLabel}
                            </p>
                            <p className="text-sm font-semibold text-foreground">{copy.entryStepTitle}</p>
                            <p className="text-xs text-muted-foreground">{copy.entryStepHint}</p>
                        </div>
                        <PromptInput
                            onGenerate={handleGenerate}
                            onPromptFocus={handlePromptInputFocus}
                            onPromptStarted={handlePromptStarted}
                            isLoading={isGenerating}
                            initialPrompt={initialPrompt}
                            copy={{
                                placeholder: copy.promptPlaceholder,
                                generatingLabel: copy.promptGeneratingLabel,
                                generateLabel: copy.promptGenerateLabel,
                                tip: copy.promptTip,
                            }}
                        />
                    </div>
                    {generateError && (
                        <p className="text-sm text-red-300 -mt-4">{generateError}</p>
                    )}

                    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-5 space-y-3">
                        <p className="text-sm font-semibold text-foreground">{copy.promptGuideTitle}</p>
                        <ul className="space-y-2 text-xs text-muted-foreground">
                            {copy.promptGuideChecklist.map((item) => (
                                <li key={item} className="flex items-start gap-2">
                                    <span className="mt-[3px] h-1.5 w-1.5 flex-none rounded-full bg-[#26d4b8]/85" />
                                    <span>{item}</span>
                                </li>
                            ))}
                        </ul>
                        <div>
                            <p className="text-xs font-semibold text-foreground/90">{copy.promptGuideExampleLabel}</p>
                            <ul className="mt-2 space-y-1.5 text-xs text-muted-foreground">
                                {copy.promptGuideExamples.map((example) => (
                                    <li key={example}>{example}</li>
                                ))}
                            </ul>
                        </div>
                    </div>

                    <StyleSelector selected={style} onSelect={handleStyleChange} label={copy.styleLabel} />

                    {imageUrl && (
                        <>
                            <ProductPicker
                                products={mockupEligibleProducts}
                                selectedId={selectedProduct}
                                onSelect={handleProductSelect}
                                chooseLabel={copy.chooseProductLabel}
                                loadingLabel={copy.loadingProductsLabel}
                            />
                            {selectedProduct && product && (
                                <div className="space-y-4">
                                    <div>
                                        <label className="text-sm font-medium text-muted-foreground mb-2 block">{copy.sizeLabel}</label>
                                        <div className="flex flex-wrap gap-2">
                                            {product.sizes.map((size: string) => (
                                                <button
                                                    key={size}
                                                    onClick={() => setSelectedSize(size)}
                                                    className={`rounded-lg px-4 py-2 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#26d4b8]/45 ${selectedSize === size
                                                        ? 'bg-gradient-to-r from-[#2f6cf3] to-[#26d4b8] text-white shadow-lg shadow-[#26d4b8]/20'
                                                        : 'glass text-muted-foreground hover:text-foreground'
                                                        }`}
                                                >
                                                    {size}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-muted-foreground mb-2 block">{copy.colorLabel}</label>
                                        <div className="flex flex-wrap gap-2">
                                            {product.colors.map((color) => (
                                                <button
                                                    key={color.name}
                                                    onClick={() => setSelectedColor(color.name)}
                                                    className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#26d4b8]/45 ${selectedColor === color.name
                                                        ? 'border border-[#2f6cf3] bg-gradient-to-r from-[#2f6cf3] to-[#26d4b8] text-white shadow-lg shadow-[#26d4b8]/20'
                                                        : 'glass text-muted-foreground hover:text-foreground'
                                                        }`}
                                                >
                                                    <span className="w-4 h-4 rounded-full border border-white/20" style={colorDotStyle(color.hex)} />
                                                    {color.name}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {productPromptGuidance && (
                                        <div className="rounded-xl border border-white/10 bg-white/5 p-3.5 space-y-2">
                                            <p className="text-xs font-semibold text-foreground">{productPromptGuidance.title}</p>
                                            <ul className="space-y-1.5 text-xs text-muted-foreground">
                                                {productPromptGuidance.checklist.map((item) => (
                                                    <li key={item} className="flex items-start gap-2">
                                                        <span className="mt-[3px] h-1.5 w-1.5 flex-none rounded-full bg-[#26d4b8]/85" />
                                                        <span>{item}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                            <p className="text-[11px] text-muted-foreground/80">{productPromptGuidance.example}</p>
                                        </div>
                                    )}

                                    <button
                                        onClick={handleAddToCart}
                                        disabled={added}
                                        className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#2f6cf3] to-[#26d4b8] px-6 py-3 font-medium text-white shadow-[0_20px_40px_-26px_rgba(38,212,184,0.58)] transition-all duration-300 hover:brightness-105 active:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#26d4b8]/45"
                                    >
                                        {added ? (
                                            <>
                                                <Check className="w-4 h-4" /> {copy.addedToCartLabel}
                                            </>
                                        ) : (
                                            <>
                                                <ShoppingCart className="w-4 h-4" /> {copy.addToCartLabel} - ${product.sellPrice.toFixed(2)}
                                            </>
                                        )}
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </div>

                <div className="space-y-6 lg:sticky lg:top-24 self-start">
                    <GeneratedImage
                        imageUrl={imageUrl}
                        isLoading={isGenerating}
                        onRegenerate={() => currentPrompt && handleGenerate(currentPrompt)}
                        copy={{
                            creatingLabel: copy.creatingDesignLabel,
                            creatingSubLabel: copy.creatingDesignSubLabel,
                            placeholderLabel: copy.generatedPlaceholderLabel,
                            regenerateLabel: copy.regenerateLabel,
                        }}
                    />
                    {imageUrl && selectedProduct && (
                        <>
                            <MockupPreview
                                mockupUrl={mockupUrl}
                                isLoading={isMockupLoading}
                                copy={{
                                    generatingLabel: copy.generatingMockupLabel,
                                    placeholderLabel: copy.mockupPlaceholderLabel,
                                }}
                            />
                            {mockupError && (
                                <p className="text-sm text-red-300 -mt-3">{mockupError}</p>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}
