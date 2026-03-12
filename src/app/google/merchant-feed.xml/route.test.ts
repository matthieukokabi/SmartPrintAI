import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  findMany: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    product: {
      findMany: mocks.findMany,
    },
  },
}))

vi.mock('@/lib/site', () => ({
  toAbsoluteUrl: (pathOrUrl: string) => {
    if (pathOrUrl.startsWith('http://') || pathOrUrl.startsWith('https://')) {
      return pathOrUrl
    }
    const normalized = pathOrUrl.startsWith('/') ? pathOrUrl : `/${pathOrUrl}`
    return `https://smartprintai.com${normalized}`
  },
}))

import { GET } from './route'

function createRequest() {
  return new NextRequest('http://localhost:3100/google/merchant-feed.xml', {
    method: 'GET',
  })
}

describe('/google/merchant-feed.xml GET', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns xml feed for active products', async () => {
    mocks.findMany.mockResolvedValue([
      {
        id: 'prod_1',
        name: 'Cats & Dogs Tee',
        description: 'Fun <bold> shirt for pet lovers',
        category: 'Apparel',
        sellPrice: 29.99,
        imageUrl: 'https://cdn.example.com/prod-1.png',
        colors: [{ name: 'Black' }],
        sizes: ['M', 'L'],
      },
      {
        id: 'prod_2',
        name: 'Boho Tote',
        description: 'Soft pastel tote',
        category: 'Accessories',
        sellPrice: 24,
        imageUrl: '/images/tote.png',
        colors: [{ name: 'Default' }],
        sizes: ['One Size'],
      },
      {
        id: 'prod_3',
        name: 'Cozy Pillow',
        description: 'Comfy pillow',
        category: 'Home',
        sellPrice: 19.5,
        imageUrl: '/images/pillow.png',
        colors: [],
        sizes: [],
      },
    ])

    const res = await GET(createRequest())

    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toContain('application/xml')
    expect(res.headers.get('cache-control')).toContain('s-maxage=3600')

    const xml = await res.text()

    expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>')
    expect(xml).toContain('<g:id>prod_1</g:id>')
    expect(xml).toContain('<title>Cats &amp; Dogs Tee</title>')
    expect(xml).toContain('Fun &lt;bold&gt; shirt for pet lovers')
    expect(xml).toContain('<g:price>29.99 USD</g:price>')
    expect(xml).toContain('<g:google_product_category>Apparel &amp; Accessories &gt; Clothing</g:google_product_category>')
    expect(xml).toContain('<g:google_product_category>Apparel &amp; Accessories &gt; Clothing Accessories</g:google_product_category>')
    expect(xml).toContain('<g:google_product_category>Home &amp; Garden</g:google_product_category>')
    expect(xml).toContain('<g:color>Black</g:color>')
    expect(xml).toContain('<g:color>White</g:color>')
    expect(xml).toContain('<g:gender>unisex</g:gender>')
    expect(xml).toContain('<g:age_group>adult</g:age_group>')
    expect(xml).toContain('<g:size>M</g:size>')
    expect(xml).toContain('<link>https://smartprintai.com/products/prod_2</link>')
    expect(xml).toContain('<g:image_link>https://smartprintai.com/images/tote.png</g:image_link>')

    const genderTags = xml.match(/<g:gender>/g) ?? []
    const ageGroupTags = xml.match(/<g:age_group>/g) ?? []
    const colorTags = xml.match(/<g:color>/g) ?? []
    expect(genderTags).toHaveLength(3)
    expect(ageGroupTags).toHaveLength(3)
    expect(colorTags).toHaveLength(3)
  })

  it('returns an empty valid feed when no products exist', async () => {
    mocks.findMany.mockResolvedValue([])

    const res = await GET(createRequest())
    const xml = await res.text()

    expect(res.status).toBe(200)
    expect(xml).toContain('<channel>')
    expect(xml).not.toContain('<item>')
  })

  it('returns 500 json when product fetch fails', async () => {
    mocks.findMany.mockRejectedValue(new Error('db down'))

    const res = await GET(createRequest())

    expect(res.status).toBe(500)
    await expect(res.json()).resolves.toEqual({ error: 'Failed to build merchant feed' })
  })
})
