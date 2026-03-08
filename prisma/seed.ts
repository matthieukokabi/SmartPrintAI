import "dotenv/config"
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) {
    throw new Error('DATABASE_URL is required')
}

const adapter = new PrismaPg({ connectionString: databaseUrl })
const prisma = new PrismaClient({ adapter })

const PRODUCTS = [
    {
        name: 'Unisex T-Shirt',
        printfulId: '71',
        description: 'Classic unisex tee, comfortable everyday wear. 100% cotton.',
        category: 'apparel',
        basePrice: 11.50,
        sellPrice: 29.99,
        sizes: ['S', 'M', 'L', 'XL', '2XL'],
        colors: [
            { name: 'White', hex: '#FFFFFF', printfulVariantId: 4012 },
            { name: 'Black', hex: '#1A1A1A', printfulVariantId: 4013 },
            { name: 'Navy', hex: '#1B2A4A', printfulVariantId: 4014 },
            { name: 'Forest Green', hex: '#2D4A2D', printfulVariantId: 4015 },
        ],
        imageUrl: 'https://files.cdn.printful.com/products/71/product_1553014524.jpg',
        printArea: { width: 4200, height: 4800, dpi: 300 },
    },
    {
        name: 'Premium Hoodie',
        printfulId: '380',
        description: 'Heavyweight premium hoodie. Soft fleece lining, kangaroo pocket.',
        category: 'apparel',
        basePrice: 26.00,
        sellPrice: 59.99,
        sizes: ['S', 'M', 'L', 'XL', '2XL'],
        colors: [
            { name: 'White', hex: '#FFFFFF', printfulVariantId: 13440 },
            { name: 'Black', hex: '#1A1A1A', printfulVariantId: 13441 },
            { name: 'Sand', hex: '#C4A882', printfulVariantId: 13442 },
        ],
        imageUrl: 'https://files.cdn.printful.com/products/380/product_1553014524.jpg',
        printArea: { width: 4200, height: 4800, dpi: 300 },
    },
    {
        name: 'White Mug 11oz',
        printfulId: '19',
        description: 'Classic ceramic mug. Microwave and dishwasher safe.',
        category: 'drinkware',
        basePrice: 5.95,
        sellPrice: 18.99,
        sizes: ['11oz'],
        colors: [{ name: 'White', hex: '#FFFFFF', printfulVariantId: 1320 }],
        imageUrl: 'https://files.cdn.printful.com/products/19/product_1553014524.jpg',
        printArea: { width: 2700, height: 1350, dpi: 300 },
    },
    {
        name: 'Phone Case',
        printfulId: '233',
        description: 'Slim-fit snap case. Glossy finish, lightweight protection.',
        category: 'accessories',
        basePrice: 9.00,
        sellPrice: 24.99,
        sizes: ['iPhone 14', 'iPhone 15', 'iPhone 15 Pro'],
        colors: [{ name: 'Clear', hex: '#F5F5F5', printfulVariantId: 9836 }],
        imageUrl: 'https://files.cdn.printful.com/products/233/product_1553014524.jpg',
        printArea: { width: 1800, height: 3000, dpi: 300 },
    },
    {
        name: 'Canvas Print 12x12',
        printfulId: '1',
        description: 'Museum-quality stretched canvas. Ready to hang.',
        category: 'home',
        basePrice: 13.50,
        sellPrice: 39.99,
        sizes: ['12x12'],
        colors: [{ name: 'White', hex: '#FFFFFF', printfulVariantId: 1 }],
        imageUrl: 'https://files.cdn.printful.com/products/1/product_1553014524.jpg',
        printArea: { width: 3600, height: 3600, dpi: 300 },
    },
    {
        name: 'Tote Bag',
        printfulId: '224',
        description: 'Durable cotton tote. Perfect for everyday use.',
        category: 'accessories',
        basePrice: 8.50,
        sellPrice: 22.99,
        sizes: ['One Size'],
        colors: [
            { name: 'Natural', hex: '#F5F0E8', printfulVariantId: 9551 },
            { name: 'Black', hex: '#1A1A1A', printfulVariantId: 9552 },
        ],
        imageUrl: 'https://files.cdn.printful.com/products/224/product_1553014524.jpg',
        printArea: { width: 3600, height: 3600, dpi: 300 },
    },
    {
        name: 'Tank Top',
        printfulId: '163',
        description: 'Lightweight tank top. Perfect for warm weather.',
        category: 'apparel',
        basePrice: 9.50,
        sellPrice: 24.99,
        sizes: ['S', 'M', 'L', 'XL'],
        colors: [
            { name: 'White', hex: '#FFFFFF', printfulVariantId: 7030 },
            { name: 'Black', hex: '#1A1A1A', printfulVariantId: 7031 },
        ],
        imageUrl: 'https://files.cdn.printful.com/products/163/product_1553014524.jpg',
        printArea: { width: 4200, height: 4800, dpi: 300 },
    },
    {
        name: 'Crewneck Sweatshirt',
        printfulId: '314',
        description: 'Comfortable crewneck. Soft fleece interior.',
        category: 'apparel',
        basePrice: 20.00,
        sellPrice: 49.99,
        sizes: ['S', 'M', 'L', 'XL', '2XL'],
        colors: [
            { name: 'White', hex: '#FFFFFF', printfulVariantId: 11850 },
            { name: 'Black', hex: '#1A1A1A', printfulVariantId: 11851 },
            { name: 'Grey', hex: '#999999', printfulVariantId: 11852 },
        ],
        imageUrl: 'https://files.cdn.printful.com/products/314/product_1553014524.jpg',
        printArea: { width: 4200, height: 4800, dpi: 300 },
    },
    {
        name: 'Throw Pillow 18x18',
        printfulId: '31',
        description: 'Soft double-sided pillow. Includes insert.',
        category: 'home',
        basePrice: 12.00,
        sellPrice: 34.99,
        sizes: ['18x18'],
        colors: [{ name: 'White', hex: '#FFFFFF', printfulVariantId: 1855 }],
        imageUrl: 'https://files.cdn.printful.com/products/31/product_1553014524.jpg',
        printArea: { width: 4950, height: 4950, dpi: 300 },
    },
    {
        name: 'Framed Poster',
        printfulId: '2',
        description: 'Premium framed art print. Black frame, museum glass.',
        category: 'home',
        basePrice: 14.00,
        sellPrice: 44.99,
        sizes: ['12x16', '18x24'],
        colors: [{ name: 'Black Frame', hex: '#1A1A1A', printfulVariantId: 2 }],
        imageUrl: 'https://files.cdn.printful.com/products/2/product_1553014524.jpg',
        printArea: { width: 3600, height: 4800, dpi: 300 },
    },
    {
        name: 'Sticker Sheet',
        printfulId: '505',
        description: 'Glossy vinyl stickers. Waterproof and durable.',
        category: 'accessories',
        basePrice: 4.00,
        sellPrice: 12.99,
        sizes: ['4x4'],
        colors: [{ name: 'White', hex: '#FFFFFF', printfulVariantId: 16780 }],
        imageUrl: 'https://files.cdn.printful.com/products/505/product_1553014524.jpg',
        printArea: { width: 1200, height: 1200, dpi: 300 },
    },
    {
        name: 'Baseball Cap',
        printfulId: '206',
        description: 'Classic six-panel cap. Adjustable snapback.',
        category: 'accessories',
        basePrice: 11.00,
        sellPrice: 29.99,
        sizes: ['One Size'],
        colors: [
            { name: 'White', hex: '#FFFFFF', printfulVariantId: 8890 },
            { name: 'Black', hex: '#1A1A1A', printfulVariantId: 8891 },
            { name: 'Navy', hex: '#1B2A4A', printfulVariantId: 8892 },
        ],
        imageUrl: 'https://files.cdn.printful.com/products/206/product_1553014524.jpg',
        printArea: { width: 2400, height: 1200, dpi: 300 },
    },
    {
        name: 'Kids T-Shirt',
        printfulId: '303',
        description: 'Soft kids tee. Comfortable for all-day play.',
        category: 'apparel',
        basePrice: 9.00,
        sellPrice: 24.99,
        sizes: ['XS', 'S', 'M', 'L', 'XL'],
        colors: [
            { name: 'White', hex: '#FFFFFF', printfulVariantId: 11500 },
            { name: 'Black', hex: '#1A1A1A', printfulVariantId: 11501 },
            { name: 'Pink', hex: '#FFB6C1', printfulVariantId: 11502 },
        ],
        imageUrl: 'https://files.cdn.printful.com/products/303/product_1553014524.jpg',
        printArea: { width: 3600, height: 4200, dpi: 300 },
    },
    {
        name: 'Spiral Notebook',
        printfulId: '474',
        description: 'Ruled spiral notebook. 120 pages, durable cover.',
        category: 'accessories',
        basePrice: 10.00,
        sellPrice: 27.99,
        sizes: ['6x8'],
        colors: [{ name: 'White', hex: '#FFFFFF', printfulVariantId: 15900 }],
        imageUrl: 'https://files.cdn.printful.com/products/474/product_1553014524.jpg',
        printArea: { width: 1800, height: 2400, dpi: 300 },
    },
    {
        name: 'Fleece Blanket',
        printfulId: '327',
        description: 'Ultra-soft sherpa fleece blanket. Warm and cozy.',
        category: 'home',
        basePrice: 25.00,
        sellPrice: 64.99,
        sizes: ['50x60'],
        colors: [{ name: 'White', hex: '#FFFFFF', printfulVariantId: 12200 }],
        imageUrl: 'https://files.cdn.printful.com/products/327/product_1553014524.jpg',
        printArea: { width: 6000, height: 7200, dpi: 300 },
    },
]

async function main() {
    console.log('🌱 Seeding products...')

    for (const product of PRODUCTS) {
        await prisma.product.upsert({
            where: { printfulId: product.printfulId },
            update: product,
            create: product,
        })
        console.log(`  ✓ ${product.name}`)
    }

    console.log(`\n✅ Seeded ${PRODUCTS.length} products`)
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect())
