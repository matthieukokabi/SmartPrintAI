import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
    try {
        const products = await prisma.product.findMany({
            where: { active: true },
            orderBy: { name: 'asc' },
        })

        return NextResponse.json(products)
    } catch (error) {
        console.error('Products error:', error)
        return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 })
    }
}
