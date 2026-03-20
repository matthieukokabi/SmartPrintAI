import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  rateLimitRequest: vi.fn(),
  generateImage: vi.fn(),
  normalizeGeneratedDesignDataUrl: vi.fn(),
  uploadBase64Image: vi.fn(),
  prisma: {
    design: {
      create: vi.fn(),
    },
  },
  sendMakeDesignAutoPost: vi.fn(),
}))

vi.mock('@/lib/rate-limit', () => ({
  rateLimitRequest: mocks.rateLimitRequest,
}))

vi.mock('@/lib/gemini', () => ({
  generateImage: mocks.generateImage,
}))

vi.mock('@/lib/design-image', () => ({
  normalizeGeneratedDesignDataUrl: mocks.normalizeGeneratedDesignDataUrl,
}))

vi.mock('@/lib/storage', () => ({
  uploadBase64Image: mocks.uploadBase64Image,
}))

vi.mock('@/lib/prisma', () => ({
  prisma: mocks.prisma,
}))

vi.mock('@/lib/make', () => ({
  sendMakeDesignAutoPost: mocks.sendMakeDesignAutoPost,
}))

import { POST } from './route'

function createRequest(body: string, headers: HeadersInit = {}) {
  return new NextRequest('http://localhost:3100/api/generate', {
    method: 'POST',
    body,
    headers: {
      'content-type': 'application/json',
      ...headers,
    },
  })
}

describe('/api/generate POST', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.rateLimitRequest.mockResolvedValue({
      allowed: true,
      limit: 20,
      remaining: 19,
      resetInSec: 600,
    })
    mocks.generateImage.mockResolvedValue('base64-image')
    mocks.normalizeGeneratedDesignDataUrl.mockResolvedValue({
      dataUrl: 'normalized-base64-image',
      didRemoveBackground: true,
      didCrop: true,
    })
    mocks.uploadBase64Image.mockResolvedValue('https://cdn.smartprintai.com/designs/design-1.png')
    mocks.prisma.design.create.mockResolvedValue({
      id: 'design_1',
      prompt: 'funny french bulldog in sunglasses',
      style: 'pop-art',
      imageUrl: 'https://cdn.smartprintai.com/designs/design-1.png',
      sessionId: 'sess_1',
      createdAt: new Date('2026-03-11T10:00:00.000Z'),
    })
  })

  it('returns 429 when generate route is rate limited', async () => {
    mocks.rateLimitRequest.mockResolvedValue({
      allowed: false,
      limit: 20,
      remaining: 0,
      resetInSec: 30,
    })

    const res = await POST(createRequest(JSON.stringify({
      prompt: 'cat',
      style: 'artistic',
    })))

    expect(res.status).toBe(429)
    expect(res.headers.get('retry-after')).toBe('30')
    await expect(res.json()).resolves.toEqual({
      error: 'Rate limit exceeded. Please try again shortly.',
    })
  })

  it('returns 400 for invalid style', async () => {
    const res = await POST(createRequest(JSON.stringify({
      prompt: 'cyberpunk geisha portrait',
      style: 'invalid-style',
    })))

    expect(res.status).toBe(400)
    await expect(res.json()).resolves.toEqual({
      error: 'Invalid style',
    })
    expect(mocks.generateImage).not.toHaveBeenCalled()
    expect(mocks.sendMakeDesignAutoPost).not.toHaveBeenCalled()
  })

  it('returns 400 for invalid source image payload', async () => {
    const res = await POST(createRequest(JSON.stringify({
      prompt: 'cyberpunk geisha portrait',
      style: 'artistic',
      sourceImageDataUrl: 'https://example.com/image.png',
    })))

    expect(res.status).toBe(400)
    await expect(res.json()).resolves.toEqual({
      error: 'Invalid source image format',
    })
    expect(mocks.generateImage).not.toHaveBeenCalled()
    expect(mocks.sendMakeDesignAutoPost).not.toHaveBeenCalled()
  })

  it('returns 400 when source image payload is too large', async () => {
    const oversizedSourceImage = `data:image/png;base64,${'a'.repeat(900001)}`

    const res = await POST(createRequest(JSON.stringify({
      prompt: 'cyberpunk geisha portrait',
      style: 'artistic',
      sourceImageDataUrl: oversizedSourceImage,
    })))

    expect(res.status).toBe(400)
    await expect(res.json()).resolves.toEqual({
      error: 'Invalid source image',
    })
    expect(mocks.generateImage).not.toHaveBeenCalled()
    expect(mocks.sendMakeDesignAutoPost).not.toHaveBeenCalled()
  })

  it('passes uploaded source image data to the generator', async () => {
    mocks.prisma.design.create.mockResolvedValueOnce({
      id: 'design_2',
      prompt: 'turn this portrait into watercolor poster art',
      style: 'watercolor',
      imageUrl: 'https://cdn.smartprintai.com/designs/design-2.png',
      sessionId: null,
      createdAt: new Date('2026-03-11T10:05:00.000Z'),
    })
    mocks.uploadBase64Image.mockResolvedValueOnce('https://cdn.smartprintai.com/designs/design-2.png')

    const sourceImageDataUrl = 'data:image/png;base64,ZmFrZS1pbWFnZS1ieXRlcw=='

    const res = await POST(createRequest(JSON.stringify({
      prompt: 'turn this portrait into watercolor poster art',
      style: 'watercolor',
      sourceImageDataUrl,
    })))

    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toEqual({
      designId: 'design_2',
      imageUrl: 'https://cdn.smartprintai.com/designs/design-2.png',
    })

    expect(mocks.generateImage).toHaveBeenCalledWith({
      prompt: 'turn this portrait into watercolor poster art',
      style: 'watercolor',
      sourceImageDataUrl,
    })
  })

  it('creates design and dispatches make auto-post event', async () => {
    const res = await POST(createRequest(JSON.stringify({
      prompt: 'funny french bulldog in sunglasses',
      style: 'pop-art',
      sessionId: 'sess_1',
    }), {
      'x-request-id': 'req-generate-ok',
    }))

    expect(res.status).toBe(200)
    expect(res.headers.get('x-request-id')).toBe('req-generate-ok')
    await expect(res.json()).resolves.toEqual({
      designId: 'design_1',
      imageUrl: 'https://cdn.smartprintai.com/designs/design-1.png',
    })

    expect(mocks.generateImage).toHaveBeenCalledWith({
      prompt: 'funny french bulldog in sunglasses',
      style: 'pop-art',
    })
    expect(mocks.rateLimitRequest).toHaveBeenCalledWith(expect.any(NextRequest), 'generate', 60, 600)
    expect(mocks.normalizeGeneratedDesignDataUrl).toHaveBeenCalledWith('base64-image')
    expect(mocks.uploadBase64Image).toHaveBeenCalledWith('normalized-base64-image')
    expect(mocks.sendMakeDesignAutoPost).toHaveBeenCalledWith({
      requestId: 'req-generate-ok',
      designId: 'design_1',
      prompt: 'funny french bulldog in sunglasses',
      style: 'pop-art',
      imageUrl: 'https://cdn.smartprintai.com/designs/design-1.png',
      sessionId: 'sess_1',
      createdAtIso: '2026-03-11T10:00:00.000Z',
    })
  })

  it('falls back to original image when cleanup fails', async () => {
    mocks.normalizeGeneratedDesignDataUrl.mockRejectedValueOnce(new Error('cleanup failed'))

    const res = await POST(createRequest(JSON.stringify({
      prompt: 'clean logo for hoodie',
      style: 'minimalist',
    })))

    expect(res.status).toBe(200)
    expect(mocks.uploadBase64Image).toHaveBeenCalledWith('base64-image')
  })
})
