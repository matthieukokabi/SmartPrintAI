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
    return `https://print.zuerifix.tech${normalized}`
  },
}))

import { GET } from './route'

const CHECKOUT_COUNTRIES = ['US', 'CA', 'GB', 'DE', 'FR', 'AU', 'NL', 'BE', 'CH']

function items(xml: string): string[] {
  return xml.match(/<item>.*?<\/item>/g) ?? []
}

describe('/google/merchant-feed.xml GET', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns xml feed for active products', async () => {
    mocks.findMany.mockResolvedValue([
      {
        id: 'prod_1',
        name: "Unisex Cats & Dogs Tee",
        printfulId: '71',
        description: 'Fun <bold> shirt for pet lovers',
        category: 'T-Shirts & Tops',
        sellPrice: 29.99,
        imageUrl: 'https://cdn.example.com/prod-1.png',
        colors: [{ name: 'Black' }, { name: 'White' }],
        sizes: ['M', 'L'],
      },
      {
        id: 'prod_2',
        name: 'Boho Tote',
        printfulId: '327',
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
        printfulId: '95',
        description: 'Comfy pillow',
        category: 'Home & Decor',
        sellPrice: 19.5,
        imageUrl: '/images/pillow.png',
        colors: [],
        sizes: [],
      },
    ])

    const res = await GET()

    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toContain('application/xml')
    expect(res.headers.get('cache-control')).toContain('s-maxage=3600')

    const xml = await res.text()
    expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>')
    expect(xml).not.toContain('smartprintai.com')

    // Apparel is split into one item per size, grouped by product id.
    const [teeM, teeL, tote, pillow] = items(xml)
    expect(items(xml)).toHaveLength(4)
    expect(teeM).toContain('<g:id>prod_1-m</g:id>')
    expect(teeM).toContain('<g:item_group_id>prod_1</g:item_group_id>')
    expect(teeM).toContain('<title>Unisex Cats &amp; Dogs Tee - M</title>')
    expect(teeM).toContain('<g:size>M</g:size>')
    expect(teeL).toContain('<g:id>prod_1-l</g:id>')
    expect(teeL).toContain('<g:size>L</g:size>')
    expect(teeM).toContain('Fun &lt;bold&gt; shirt for pet lovers')
    expect(teeM).toContain('<g:price>29.99 USD</g:price>')
    expect(teeM).toContain('<g:google_product_category>Apparel &amp; Accessories &gt; Clothing</g:google_product_category>')
    expect(teeM).toContain('<g:color>Black/White</g:color>')
    expect(teeM).toContain('<g:gender>unisex</g:gender>')
    expect(teeM).toContain('<g:age_group>adult</g:age_group>')
    expect(teeM).toContain('<link>https://print.zuerifix.tech/products/prod_1</link>')
    expect(teeM).toContain('<g:canonical_link>https://print.zuerifix.tech/products/prod_1</g:canonical_link>')
    expect(teeM).not.toContain('<g:shopping_ads_excluded_country>')

    // Non-apparel stays a single item with the plain id and no apparel attributes.
    expect(tote).toContain('<g:id>prod_2</g:id>')
    expect(tote).not.toContain('<g:item_group_id>')
    expect(tote).toContain('<g:google_product_category>Apparel &amp; Accessories &gt; Clothing Accessories</g:google_product_category>')
    expect(tote).toContain('<g:image_link>https://print.zuerifix.tech/images/tote.png</g:image_link>')
    expect(tote).not.toContain('<g:color>')        // "Default" is not a colour
    expect(tote).not.toContain('<g:size>')
    expect(tote).not.toContain('<g:gender>')
    expect(tote).not.toContain('<g:age_group>')

    expect(pillow).toContain('<g:id>prod_3</g:id>')
    expect(pillow).toContain('<g:google_product_category>Home &amp; Garden &gt; Decor</g:google_product_category>')
    expect(pillow).not.toContain('<g:color>')
    expect(pillow).not.toContain('<g:gender>')

    // Shipping: every item carries Standard + Express for each checkout country.
    for (const item of items(xml)) {
      const shippingTags = item.match(/<g:shipping>/g) ?? []
      expect(shippingTags).toHaveLength(CHECKOUT_COUNTRIES.length * 2)
      for (const country of CHECKOUT_COUNTRIES) {
        expect(item).toContain(`<g:country>${country}</g:country>`)
      }
      expect(item).toContain('<g:service>Standard Shipping</g:service><g:price>5.99 USD</g:price><g:min_transit_time>5</g:min_transit_time><g:max_transit_time>10</g:max_transit_time>')
      expect(item).toContain('<g:service>Express Shipping</g:service><g:price>12.99 USD</g:price><g:min_transit_time>2</g:min_transit_time><g:max_transit_time>4</g:max_transit_time>')
      expect(item).toContain('<g:min_handling_time>2</g:min_handling_time><g:max_handling_time>5</g:max_handling_time>')
    }
  })

  it('derives gender and age_group from stated wording or the adult/kids size run, never by guessing', async () => {
    mocks.findMany.mockResolvedValue([
      { id: 'w', name: "Women's Racerback Tank", printfulId: '1', description: '', category: 'apparel', sellPrice: 20, imageUrl: '/w.png', colors: [], sizes: ['S'] },
      { id: 'm', name: "Men's Fleece Joggers", printfulId: '2', description: '', category: 'Bottoms', sellPrice: 40, imageUrl: '/m.png', colors: [], sizes: ['S'] },
      { id: 'k', name: 'All-Over Print Kids Leggings', printfulId: '3', description: '', category: 'Kids', sellPrice: 25, imageUrl: '/k.png', colors: [], sizes: ['2T'] },
      { id: 'y', name: 'Hoodies (Youth Sizes)', printfulId: '96', description: '', category: 'apparel', sellPrice: 35, imageUrl: '/y.png', colors: [{ name: 'Black' }], sizes: ['XS'] },
      { id: 'd', name: 'All-Over Print Bodycon Dress', printfulId: '4', description: '', category: 'Dresses', sellPrice: 45, imageUrl: '/d.png', colors: [{ name: 'Default' }], sizes: ['M'] },
      { id: 's', name: 'All-Over Print Shorts', printfulId: '5', description: '', category: 'Bottoms', sellPrice: 30, imageUrl: '/s.png', colors: [], sizes: ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL'] },
      { id: 'tt', name: 'Kids Tee Toddler Sizes', printfulId: '6', description: '', category: 'apparel', sellPrice: 18, imageUrl: '/t.png', colors: [], sizes: ['3T'] },
      { id: 'o', name: 'Printed Socks', printfulId: '7', description: '', category: 'apparel', sellPrice: 12, imageUrl: '/o.png', colors: [], sizes: ['One Size'] },
    ])

    const xml = await (await GET()).text()
    const all = items(xml)
    const pick = (id: string) => all.find((i) => i.includes(`<g:item_group_id>${id}</g:item_group_id>`) || i.includes(`<g:id>${id}</g:id>`)) as string
    const [women, men, kids, youth, dress, shorts, toddler, socks] = ['w', 'm', 'k', 'y', 'd', 's', 'tt', 'o'].map(pick)

    expect(women).toContain('<g:gender>female</g:gender>')
    expect(women).toContain('<g:age_group>adult</g:age_group>')
    expect(men).toContain('<g:gender>male</g:gender>')
    expect(men).toContain('<g:age_group>adult</g:age_group>')
    expect(kids).not.toContain('<g:gender>')
    expect(kids).toContain('<g:age_group>kids</g:age_group>')
    expect(youth).toContain('<g:age_group>kids</g:age_group>')
    expect(youth).not.toContain('<g:gender>')
    expect(youth).toContain('<g:color>Black</g:color>')
    // Adult alpha size run without any gender wording -> unisex adult.
    expect(shorts).toContain('<g:gender>unisex</g:gender>')
    expect(shorts).toContain('<g:age_group>adult</g:age_group>')
    // Women's-cut line with an adult size run: adult, but no gender guessed.
    expect(dress).not.toContain('<g:gender>')
    expect(dress).toContain('<g:age_group>adult</g:age_group>')
    expect(dress).not.toContain('<g:color>')
    expect(dress).toContain('<g:size>M</g:size>')
    expect(toddler).toContain('<g:age_group>toddler</g:age_group>')
    expect(toddler).not.toContain('<g:gender>')
    // Non-alpha sizing: nothing inferred.
    expect(socks).not.toContain('<g:gender>')
    expect(socks).not.toContain('<g:age_group>')
  })

  it('limits shipping to the countries a US-only product can reach', async () => {
    mocks.findMany.mockResolvedValue([
      { id: 'orn', name: 'Acrylic Ornaments', printfulId: '793', description: '', category: 'Accessories', sellPrice: 12, imageUrl: '/o.png', colors: [], sizes: ['Circle'] },
    ])

    const xml = await (await GET()).text()
    const [item] = items(xml)
    expect(item.match(/<g:shipping>/g) ?? []).toHaveLength(2)
    expect(item).toContain('<g:country>US</g:country>')
    expect(item).not.toContain('<g:country>DE</g:country>')
    // ...and is excluded from Shopping ads in every other checkout country.
    const excluded = (item.match(/<g:shopping_ads_excluded_country>[A-Z]{2}<\/g:shopping_ads_excluded_country>/g) ?? []).map((m) => m.replace(/<[^>]+>/g, ''))
    expect(excluded).toEqual(['CA', 'GB', 'DE', 'FR', 'AU', 'NL', 'BE', 'CH'])
  })

  it('returns an empty valid feed when no products exist', async () => {
    mocks.findMany.mockResolvedValue([])

    const res = await GET()
    const xml = await res.text()

    expect(res.status).toBe(200)
    expect(xml).toContain('<channel>')
    expect(xml).not.toContain('<item>')
  })

  it('returns 500 json when product fetch fails', async () => {
    mocks.findMany.mockRejectedValue(new Error('db down'))

    const res = await GET()

    expect(res.status).toBe(500)
    await expect(res.json()).resolves.toEqual({ error: 'Failed to build merchant feed' })
  })
})
