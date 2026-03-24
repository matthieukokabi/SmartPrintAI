import Link from 'next/link'
import { AlertTriangle, Inbox, PackageCheck, Shield } from 'lucide-react'
import { prisma } from '@/lib/prisma'
import { getReadableOrderStatus } from '@/components/order/OrderStatusTimeline'
import { readRecentSupportIntakeRecords } from '@/lib/support-intake-log'
import { requireOwnerPortalSession } from '@/lib/owner-portal-server'

export const dynamic = 'force-dynamic'

function orderLabel(id: string): string {
    return `#${id.slice(-8).toUpperCase()}`
}

function statusBadgeClasses(status: string): string {
    const normalized = status.trim().toLowerCase()
    if (normalized === 'manual_review' || normalized === 'fulfillment_failed') {
        return 'border-amber-400/30 bg-amber-500/10 text-amber-200'
    }
    if (normalized === 'processing' || normalized === 'shipped') {
        return 'border-[#26d4b8]/30 bg-[#26d4b8]/10 text-[#8ef0dd]'
    }
    return 'border-white/10 bg-white/5 text-muted-foreground'
}

export default async function OwnerAdminPage() {
    const session = requireOwnerPortalSession()

    const [orders, supportRequests] = await Promise.all([
        prisma.order.findMany({
            orderBy: { createdAt: 'desc' },
            take: 75,
            include: {
                items: {
                    select: {
                        id: true,
                    },
                },
            },
        }),
        readRecentSupportIntakeRecords(50),
    ])

    const attentionOrders = orders.filter((order) => {
        const normalized = order.status.trim().toLowerCase()
        return normalized === 'manual_review'
            || normalized === 'fulfillment_failed'
            || (normalized === 'processing' && !order.printfulOrderId)
    })
    const processingOrders = orders.filter((order) => order.status.trim().toLowerCase() === 'processing')
    const paidWithoutFulfillment = orders.filter((order) => {
        const normalized = order.status.trim().toLowerCase()
        return (normalized === 'paid' || normalized === 'processing') && !order.printfulOrderId
    })

    return (
        <div className="mx-auto w-full max-w-7xl px-4 py-10 space-y-8">
            <header className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-6 md:flex-row md:items-center md:justify-between">
                <div className="space-y-1">
                    <p className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-[#26d4b8]">
                        <Shield className="h-4 w-4" />
                        Owner Operations
                    </p>
                    <h1 className="text-2xl font-semibold text-foreground md:text-3xl">SmartPrintAI Operations Portal</h1>
                    <p className="text-sm text-muted-foreground">
                        Signed in as <span className="text-foreground">{session.email}</span>
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <Link
                        href="/account/orders"
                        className="rounded-lg border border-white/15 px-4 py-2 text-sm text-muted-foreground transition hover:border-white/25 hover:text-foreground"
                    >
                        Customer view
                    </Link>
                    <Link
                        href="/api/auth/logout"
                        className="rounded-lg bg-gradient-to-r from-[#2f6cf3] to-[#26d4b8] px-4 py-2 text-sm font-medium text-white shadow-[0_8px_28px_rgba(38,212,184,0.22)] transition hover:brightness-110"
                    >
                        Sign out
                    </Link>
                </div>
            </header>

            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <article className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                    <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Recent orders</p>
                    <p className="mt-2 text-3xl font-semibold text-foreground">{orders.length}</p>
                    <p className="mt-1 text-xs text-muted-foreground">Last 75 orders</p>
                </article>
                <article className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                    <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Needs attention</p>
                    <p className="mt-2 text-3xl font-semibold text-amber-200">{attentionOrders.length}</p>
                    <p className="mt-1 text-xs text-muted-foreground">Manual review, fulfillment failure, or missing handoff</p>
                </article>
                <article className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                    <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">In production</p>
                    <p className="mt-2 text-3xl font-semibold text-[#8ef0dd]">{processingOrders.length}</p>
                    <p className="mt-1 text-xs text-muted-foreground">Processing status active</p>
                </article>
                <article className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                    <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Support requests</p>
                    <p className="mt-2 text-3xl font-semibold text-foreground">{supportRequests.length}</p>
                    <p className="mt-1 text-xs text-muted-foreground">Recent intake log entries</p>
                </article>
            </section>

            <section className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.03] p-6">
                <h2 className="text-sm font-semibold uppercase tracking-[0.1em] text-[#26d4b8]">Orders requiring owner check</h2>
                {attentionOrders.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No high-priority operational flags in the latest order window.</p>
                ) : (
                    <ul className="space-y-2">
                        {attentionOrders.slice(0, 12).map((order) => (
                            <li key={order.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/20 px-4 py-3">
                                <div className="space-y-0.5">
                                    <p className="text-sm font-medium text-foreground">{orderLabel(order.id)} • {order.email}</p>
                                    <p className="text-xs text-muted-foreground">{new Date(order.createdAt).toLocaleString()}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className={`rounded-full border px-3 py-1 text-xs ${statusBadgeClasses(order.status)}`}>
                                        {getReadableOrderStatus(order.status)}
                                    </span>
                                    <Link href={`/admin/orders/${order.id}`} className="rounded-md border border-white/15 px-3 py-1.5 text-xs text-foreground transition hover:border-[#26d4b8]/50">
                                        Open
                                    </Link>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </section>

            <section className="grid gap-6 xl:grid-cols-[2fr,1fr]">
                <article className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
                    <div className="mb-4 flex items-center gap-2">
                        <PackageCheck className="h-4 w-4 text-[#26d4b8]" />
                        <h2 className="text-sm font-semibold uppercase tracking-[0.1em] text-[#26d4b8]">Recent orders</h2>
                    </div>
                    {orders.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No orders available.</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[760px] text-left text-sm">
                                <thead className="text-xs uppercase tracking-[0.08em] text-muted-foreground">
                                    <tr>
                                        <th className="pb-3 pr-3 font-medium">Order</th>
                                        <th className="pb-3 pr-3 font-medium">Created</th>
                                        <th className="pb-3 pr-3 font-medium">Customer</th>
                                        <th className="pb-3 pr-3 font-medium">Total</th>
                                        <th className="pb-3 pr-3 font-medium">Status</th>
                                        <th className="pb-3 pr-3 font-medium">Fulfillment</th>
                                        <th className="pb-3 font-medium">Items</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/10">
                                    {orders.map((order) => (
                                        <tr key={order.id}>
                                            <td className="py-3 pr-3">
                                                <Link href={`/admin/orders/${order.id}`} className="font-medium text-foreground hover:text-[#8ef0dd]">
                                                    {orderLabel(order.id)}
                                                </Link>
                                            </td>
                                            <td className="py-3 pr-3 text-muted-foreground">{new Date(order.createdAt).toLocaleString()}</td>
                                            <td className="py-3 pr-3 text-muted-foreground">{order.email}</td>
                                            <td className="py-3 pr-3 text-foreground">USD {order.total.toFixed(2)}</td>
                                            <td className="py-3 pr-3">
                                                <span className={`inline-flex rounded-full border px-3 py-1 text-xs ${statusBadgeClasses(order.status)}`}>
                                                    {getReadableOrderStatus(order.status)}
                                                </span>
                                            </td>
                                            <td className="py-3 pr-3 text-muted-foreground">
                                                {order.printfulOrderId || 'Pending'}
                                            </td>
                                            <td className="py-3 text-muted-foreground">{order.items.length}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </article>

                <aside className="space-y-6">
                    <article className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
                        <div className="mb-3 flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4 text-amber-300" />
                            <h2 className="text-sm font-semibold uppercase tracking-[0.1em] text-amber-200">Operational watch</h2>
                        </div>
                        <ul className="space-y-2 text-sm text-muted-foreground">
                            <li>Processing without fulfillment ID: <span className="text-foreground">{paidWithoutFulfillment.length}</span></li>
                            <li>Manual review orders: <span className="text-foreground">{orders.filter((order) => order.status.trim().toLowerCase() === 'manual_review').length}</span></li>
                            <li>Fulfillment failures: <span className="text-foreground">{orders.filter((order) => order.status.trim().toLowerCase() === 'fulfillment_failed').length}</span></li>
                        </ul>
                    </article>

                    <article className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
                        <div className="mb-3 flex items-center gap-2">
                            <Inbox className="h-4 w-4 text-[#26d4b8]" />
                            <h2 className="text-sm font-semibold uppercase tracking-[0.1em] text-[#26d4b8]">Recent support intake</h2>
                        </div>
                        {supportRequests.length === 0 ? (
                            <p className="text-sm text-muted-foreground">No stored support submissions yet.</p>
                        ) : (
                            <ul className="space-y-3">
                                {supportRequests.slice(0, 12).map((entry) => (
                                    <li key={`${entry.requestId}:${entry.createdAt}`} className="rounded-xl border border-white/10 bg-black/20 p-3 text-sm">
                                        <p className="font-medium text-foreground">{entry.subject}</p>
                                        <p className="text-xs text-muted-foreground">{entry.email}</p>
                                        <p className="mt-1 text-xs text-muted-foreground">
                                            {new Date(entry.createdAt).toLocaleString()}
                                            {entry.orderId ? ` • Order ${entry.orderId}` : ''}
                                        </p>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </article>
                </aside>
            </section>
        </div>
    )
}
