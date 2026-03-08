import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, Package } from 'lucide-react'
import { prisma } from '@/lib/prisma'
import OrderStatusTimeline, { getReadableOrderStatus } from '@/components/order/OrderStatusTimeline'

export const dynamic = 'force-dynamic'

type PageProps = {
    params: {
        id: string
    }
}

function toOrderLabel(id: string): string {
    return `#${id.slice(-8).toUpperCase()}`
}

export default async function OrderTrackingPage({ params }: PageProps) {
    if (!/^[A-Za-z0-9_-]{1,191}$/.test(params.id)) {
        notFound()
    }

    const order = await prisma.order.findUnique({
        where: { id: params.id },
        include: {
            items: {
                include: {
                    product: {
                        select: { name: true },
                    },
                },
            },
        },
    })

    if (!order) {
        notFound()
    }

    const createdAt = new Date(order.createdAt)

    return (
        <div className="max-w-3xl mx-auto px-4 py-10 space-y-6">
            <Link
                href="/success"
                className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
            >
                <ArrowLeft className="w-4 h-4" />
                Back
            </Link>

            <div className="glass rounded-2xl p-6 space-y-6">
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold">Order Tracking</h1>
                        <p className="text-sm text-muted-foreground mt-1">
                            {toOrderLabel(order.id)} • {createdAt.toLocaleString()}
                        </p>
                    </div>

                    <span className="text-sm font-medium px-3 py-1 rounded-full bg-white/10 border border-white/10">
                        {getReadableOrderStatus(order.status)}
                    </span>
                </div>

                <OrderStatusTimeline status={order.status} />

                <div className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-3">
                    <div className="flex items-center gap-2">
                        <Package className="w-4 h-4 text-purple-300" />
                        <p className="text-sm font-medium">Order summary</p>
                    </div>
                    <div className="text-sm text-muted-foreground space-y-1">
                        <p>Total: <span className="text-foreground font-medium">${order.total.toFixed(2)}</span></p>
                        <p>Items: <span className="text-foreground font-medium">{order.items.length}</span></p>
                        {order.printfulOrderId ? (
                            <p>Fulfillment ID: <span className="text-foreground font-medium">{order.printfulOrderId}</span></p>
                        ) : (
                            <p>Fulfillment ID: <span className="text-foreground font-medium">Pending</span></p>
                        )}
                    </div>
                </div>

                <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                    <h2 className="text-sm font-medium mb-3">Items</h2>
                    <ul className="space-y-2">
                        {order.items.map((item) => (
                            <li key={item.id} className="text-sm text-muted-foreground">
                                <span className="text-foreground font-medium">{item.product?.name || item.productId}</span>
                                {' • '}Qty {item.quantity}
                                {' • '}Size {item.size}
                                {' • '}Color {item.color}
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </div>
    )
}
