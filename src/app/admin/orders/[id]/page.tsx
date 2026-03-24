import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, ClipboardList } from 'lucide-react'
import { prisma } from '@/lib/prisma'
import { getReadableOrderStatus } from '@/components/order/OrderStatusTimeline'
import { requireOwnerPortalSession } from '@/lib/owner-portal-server'

export const dynamic = 'force-dynamic'

type PageProps = {
    params: {
        id: string
    }
}

function orderLabel(id: string): string {
    return `#${id.slice(-8).toUpperCase()}`
}

function formatCurrency(value: number): string {
    return `USD ${value.toFixed(2)}`
}

function stringifyJson(value: unknown): string {
    try {
        return JSON.stringify(value, null, 2)
    } catch {
        return 'Unavailable'
    }
}

export default async function OwnerOrderDetailPage({ params }: PageProps) {
    requireOwnerPortalSession()

    if (!/^[A-Za-z0-9_-]{1,191}$/.test(params.id)) {
        notFound()
    }

    const order = await prisma.order.findUnique({
        where: { id: params.id },
        include: {
            items: {
                include: {
                    product: {
                        select: {
                            name: true,
                            printfulId: true,
                        },
                    },
                    design: {
                        select: {
                            id: true,
                            prompt: true,
                            imageUrl: true,
                            status: true,
                        },
                    },
                },
            },
        },
    })

    if (!order) {
        notFound()
    }

    return (
        <div className="mx-auto w-full max-w-6xl px-4 py-10 space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="space-y-1">
                    <Link href="/admin" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
                        <ArrowLeft className="h-4 w-4" />
                        Back to operations portal
                    </Link>
                    <h1 className="text-2xl font-semibold text-foreground">Order {orderLabel(order.id)}</h1>
                    <p className="text-sm text-muted-foreground">{new Date(order.createdAt).toLocaleString()}</p>
                </div>
                <div className="rounded-full border border-[#26d4b8]/40 bg-[#26d4b8]/10 px-4 py-2 text-sm text-[#8ef0dd]">
                    {getReadableOrderStatus(order.status)}
                </div>
            </div>

            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <article className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                    <p className="text-xs uppercase tracking-[0.08em] text-muted-foreground">Payment</p>
                    <p className="mt-1 text-sm text-foreground">{order.stripeSessionId}</p>
                </article>
                <article className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                    <p className="text-xs uppercase tracking-[0.08em] text-muted-foreground">Fulfillment</p>
                    <p className="mt-1 text-sm text-foreground">{order.printfulOrderId || 'Pending'}</p>
                </article>
                <article className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                    <p className="text-xs uppercase tracking-[0.08em] text-muted-foreground">Customer</p>
                    <p className="mt-1 text-sm text-foreground">{order.email}</p>
                </article>
                <article className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                    <p className="text-xs uppercase tracking-[0.08em] text-muted-foreground">Totals</p>
                    <p className="mt-1 text-sm text-foreground">
                        {formatCurrency(order.total)} ({order.items.length} item{order.items.length === 1 ? '' : 's'})
                    </p>
                </article>
            </section>

            <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 space-y-4">
                <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                        <ClipboardList className="h-4 w-4 text-[#26d4b8]" />
                        <h2 className="text-sm font-semibold uppercase tracking-[0.1em] text-[#26d4b8]">Line items</h2>
                    </div>
                    <Link href={`/orders/${order.id}`} className="text-xs text-muted-foreground hover:text-foreground">
                        Open customer tracking page
                    </Link>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full min-w-[860px] text-left text-sm">
                        <thead className="text-xs uppercase tracking-[0.08em] text-muted-foreground">
                            <tr>
                                <th className="pb-3 pr-3 font-medium">Product</th>
                                <th className="pb-3 pr-3 font-medium">Provider SKU</th>
                                <th className="pb-3 pr-3 font-medium">Design</th>
                                <th className="pb-3 pr-3 font-medium">Size</th>
                                <th className="pb-3 pr-3 font-medium">Color</th>
                                <th className="pb-3 pr-3 font-medium">Qty</th>
                                <th className="pb-3 font-medium">Unit price</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/10">
                            {order.items.map((item) => (
                                <tr key={item.id}>
                                    <td className="py-3 pr-3 text-foreground">{item.product?.name || item.productId}</td>
                                    <td className="py-3 pr-3 text-muted-foreground">{item.product?.printfulId || item.productId}</td>
                                    <td className="py-3 pr-3 text-muted-foreground">
                                        <div className="max-w-[280px] space-y-1">
                                            <p className="truncate">{item.designId}</p>
                                            <p className="truncate text-xs">{item.design?.prompt || 'Prompt unavailable'}</p>
                                            {item.design?.imageUrl ? (
                                                <a
                                                    href={item.design.imageUrl}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="text-xs text-[#8ef0dd] hover:text-[#b6fff1]"
                                                >
                                                    Open design image
                                                </a>
                                            ) : null}
                                        </div>
                                    </td>
                                    <td className="py-3 pr-3 text-muted-foreground">{item.size}</td>
                                    <td className="py-3 pr-3 text-muted-foreground">{item.color}</td>
                                    <td className="py-3 pr-3 text-muted-foreground">{item.quantity}</td>
                                    <td className="py-3 text-muted-foreground">{formatCurrency(item.price)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>

            <section className="grid gap-6 lg:grid-cols-2">
                <article className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 space-y-3">
                    <h2 className="text-sm font-semibold uppercase tracking-[0.1em] text-[#26d4b8]">Financial breakdown</h2>
                    <dl className="space-y-2 text-sm">
                        <div className="flex items-center justify-between gap-4">
                            <dt className="text-muted-foreground">Subtotal</dt>
                            <dd className="text-foreground">{formatCurrency(order.subtotal)}</dd>
                        </div>
                        <div className="flex items-center justify-between gap-4">
                            <dt className="text-muted-foreground">Shipping</dt>
                            <dd className="text-foreground">{formatCurrency(order.shippingCost)}</dd>
                        </div>
                        <div className="flex items-center justify-between gap-4">
                            <dt className="text-muted-foreground">Total</dt>
                            <dd className="text-foreground font-semibold">{formatCurrency(order.total)}</dd>
                        </div>
                        <div className="flex items-center justify-between gap-4">
                            <dt className="text-muted-foreground">Last updated</dt>
                            <dd className="text-foreground">{new Date(order.updatedAt).toLocaleString()}</dd>
                        </div>
                    </dl>
                </article>

                <article className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 space-y-3">
                    <h2 className="text-sm font-semibold uppercase tracking-[0.1em] text-[#26d4b8]">Shipping address payload</h2>
                    <pre className="overflow-x-auto rounded-xl border border-white/10 bg-black/20 p-4 text-xs text-muted-foreground">
                        {stringifyJson(order.shippingAddress)}
                    </pre>
                </article>
            </section>
        </div>
    )
}
