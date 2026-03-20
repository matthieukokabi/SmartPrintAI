import { NextRequest, NextResponse } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  rateLimitRequest: vi.fn(),
  isMockupEligibleProduct: vi.fn(),
  detectProductProvider: vi.fn(),
  printful: {
    generateMockup: vi.fn(),
  },
  prisma: {
    mockup: {
      findUnique: vi.fn(),
      delete: vi.fn(),
      create: vi.fn(),
    },
    design: {
      findUnique: vi.fn(),
    },
    product: {
      findUnique: vi.fn(),
    },
  },
  getRequestId: vi.fn(),
  jsonWithRequestId: vi.fn(),
  logApiInfo: vi.fn(),
  logApiWarn: vi.fn(),
  logApiError: vi.fn(),
}))

vi.mock('@/lib/rate-limit', () => ({
  rateLimitRequest: mocks.rateLimitRequest,
}))

vi.mock('@/lib/mockup-eligibility', () => ({
  isMockupEligibleProduct: mocks.isMockupEligibleProduct,
}))

vi.mock('@/lib/product-provider', () => ({
  detectProductProvider: mocks.detectProductProvider,
}))

vi.mock('@/lib/printful', () => ({
  printful: mocks.printful,
}))

vi.mock('@/lib/prisma', () => ({
  prisma: mocks.prisma,
}))

vi.mock('@/lib/gelato', () => ({
  extractGelatoCreatedStoreProductUid: vi.fn(),
  extractGelatoProductImageUrl: vi.fn(),
  extractGelatoStoreProductImageUrl: vi.fn(),
  extractGelatoTemplatePlaceholderName: vi.fn(),
  gelato: {
    getTemplate: vi.fn(),
    createProductFromTemplate: vi.fn(),
    getStoreProduct: vi.fn(),
  },
}))

vi.mock('@/lib/gooten', () => ({
  extractGootenLayerIdOptionsFromError: vi.fn(() => []),
  extractGootenPreviewUrl: vi.fn(),
  extractGootenSpaceIdOptionsFromError: vi.fn(() => []),
  getGootenClient: vi.fn(() => ({
    createProductPreview: vi.fn(),
  })),
}))

vi.mock('@/lib/remote-image', () => ({
  isGootenPreviewUrl: vi.fn(() => false),
  waitForRemoteImageAvailability: vi.fn(async () => ({
    ready: true,
    attempts: 1,
    lastStatus: 200,
  })),
}))

vi.mock('@/lib/api-logging', () => ({
  getRequestId: mocks.getRequestId,
  jsonWithRequestId: mocks.jsonWithRequestId,
  logApiInfo: mocks.logApiInfo,
  logApiWarn: mocks.logApiWarn,
  logApiError: mocks.logApiError,
}))

import { POST } from './route'

function createRequest(body: string, headers: HeadersInit = {}) {
  return new NextRequest('http://localhost:3100/api/mockup', {
    method: 'POST',
    body,
    headers: {
      'content-type': 'application/json',
      ...headers,
    },
  })
}

describe('/api/mockup POST', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getRequestId.mockReturnValue('req-mockup-test')
    mocks.jsonWithRequestId.mockImplementation((requestId, body, init) => {
      const response = NextResponse.json(body, init)
      response.headers.set('x-request-id', String(requestId))
      return response
    })
    mocks.rateLimitRequest.mockResolvedValue({
      allowed: true,
      limit: 180,
      remaining: 179,
      resetInSec: 600,
    })
    mocks.prisma.mockup.findUnique.mockResolvedValue(null)
    mocks.prisma.design.findUnique.mockResolvedValue(null)
    mocks.prisma.product.findUnique.mockResolvedValue(null)
  })

  it('returns cached mockup without consuming route quota', async () => {
    mocks.prisma.mockup.findUnique.mockResolvedValue({
      id: 'mockup_cached_1',
      mockupUrl: 'https://cdn.smartprintai.com/mockups/cached.png',
    })

    const res = await POST(createRequest(JSON.stringify({
      designId: 'design_1',
      productId: 'product_1',
      color: 'black',
    })))

    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toEqual({
      mockupUrl: 'https://cdn.smartprintai.com/mockups/cached.png',
    })
    expect(mocks.rateLimitRequest).not.toHaveBeenCalled()
  })

  it('rate limits cache misses before provider work', async () => {
    mocks.rateLimitRequest.mockResolvedValue({
      allowed: false,
      limit: 180,
      remaining: 0,
      resetInSec: 44,
    })

    const res = await POST(createRequest(JSON.stringify({
      designId: 'design_2',
      productId: 'product_2',
      color: 'white',
    })))

    expect(res.status).toBe(429)
    expect(res.headers.get('retry-after')).toBe('44')
    await expect(res.json()).resolves.toEqual({
      error: 'Rate limit exceeded. Please try again shortly.',
    })
    expect(mocks.rateLimitRequest).toHaveBeenCalledWith(expect.any(NextRequest), 'mockup', 480, 600)
    expect(mocks.prisma.design.findUnique).not.toHaveBeenCalled()
    expect(mocks.prisma.product.findUnique).not.toHaveBeenCalled()
  })
})
