import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  rateLimitRequest: vi.fn(),
  generateImage: vi.fn(),
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
    expect(mocks.uploadBase64Image).toHaveBeenCalledWith('base64-image')
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
})
