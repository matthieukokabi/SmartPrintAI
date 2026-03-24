import Link from 'next/link'
import { AlertTriangle, Inbox, PackageCheck, Shield } from 'lucide-react'
import { prisma } from '@/lib/prisma'
import { getReadableOrderStatus } from '@/components/order/OrderStatusTimeline'
import { readRecentSupportIntakeRecords } from '@/lib/support-intake-log'
import { requireOwnerPortalSession } from '@/lib/owner-portal-server'
import {
    ADMIN_ORDERS_DEFAULT_LIMIT,
    AdminOrderStatusFilter,
    buildAdminOrdersWhere,
    normalizeAdminOrderSearchQuery,
    normalizeAdminOrderStatusFilter,
} from '@/lib/admin-orders'

export const dynamic = 'force-dynamic'

type AdminPageProps = {
    searchParams?: {
        q?: string
        status?: string
    }
}

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

function paymentStatusLabel(status: string): string {
    const normalized = status.trim().toLowerCase()
    if (normalized === 'pending') return 'Pending'
    if (normalized === 'paid' || normalized === 'processing' || normalized === 'shipped') return 'Captured'
    return 'Captured'
}

const STATUS_FILTER_OPTIONS: Array<{ value: AdminOrderStatusFilter; label: string }> = [
    { value: 'all', label: 'All statuses' },
    { value: 'pending', label: 'Pending' },
    { value: 'paid', label: 'Paid' },
    { value: 'processing', label: 'Processing' },
    { value: 'manual_review', label: 'Manual review' },
    { value: 'fulfillment_failed', label: 'Fulfillment failed' },
    { value: 'shipped', label: 'Shipped' },
]

export default async function OwnerAdminPage({ searchParams }: AdminPageProps) {
    const session = requireOwnerPortalSession()
    const searchQuery = normalizeAdminOrderSearchQuery(searchParams?.q)
    const statusFilter = normalizeAdminOrderStatusFilter(searchParams?.status)
    const where = buildAdminOrdersWhere(searchQuery, statusFilter)

    const [orders, supportRequests] = await Promise.all([
        prisma.order.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            take: ADMIN_ORDERS_DEFAULT_LIMIT,
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

            <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <h2 className="text-sm font-semibold uppercase tracking-[0.1em] text-[#26d4b8]">Order discovery</h2>
                    <p className="text-xs text-muted-foreground">
                        Search by order id, short id, email, Stripe session, or fulfillment id.
                    </p>
                </div>
                <form method="get" className="grid gap-3 md:grid-cols-[1fr,220px,auto]">
                    <input
                        type="search"
                        name="q"
                        defaultValue={searchQuery || ''}
                        placeholder="Search order id or email"
                        className="w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm text-foreground outline-none transition focus:border-[#26d4b8]/60 focus:ring-2 focus:ring-[#26d4b8]/35"
                    />
                    <select
                        name="status"
                        defaultValue={statusFilter}
                        className="w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm text-foreground outline-none transition focus:border-[#26d4b8]/60 focus:ring-2 focus:ring-[#26d4b8]/35"
                    >
                        {STATUS_FILTER_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </select>
                    <div className="flex gap-2">
                        <button
                            type="submit"
                            className="rounded-lg bg-gradient-to-r from-[#2f6cf3] to-[#26d4b8] px-4 py-2 text-sm font-medium text-white shadow-[0_8px_28px_rgba(38,212,184,0.22)] transition hover:brightness-110"
                        >
                            Apply
                        </button>
                        {(searchQuery || statusFilter !== 'all') ? (
                            <Link
                                href="/admin"
                                className="rounded-lg border border-white/15 px-4 py-2 text-sm text-muted-foreground transition hover:border-white/25 hover:text-foreground"
                            >
                                Clear
                            </Link>
                        ) : null}
                    </div>
                </form>
                <p className="text-xs text-muted-foreground">
                    Showing {orders.length} of up to {ADMIN_ORDERS_DEFAULT_LIMIT} recent orders.
                </p>
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
                                        <th className="pb-3 pr-3 font-medium">Order ID</th>
                                        <th className="pb-3 pr-3 font-medium">Created</th>
                                        <th className="pb-3 pr-3 font-medium">Customer</th>
                                        <th className="pb-3 pr-3 font-medium">Total</th>
                                        <th className="pb-3 pr-3 font-medium">Payment</th>
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
                                            <td className="py-3 pr-3 text-xs text-muted-foreground">{order.id}</td>
                                            <td className="py-3 pr-3 text-muted-foreground">{new Date(order.createdAt).toLocaleString()}</td>
                                            <td className="py-3 pr-3 text-muted-foreground">{order.email}</td>
                                            <td className="py-3 pr-3 text-foreground">USD {order.total.toFixed(2)}</td>
                                            <td className="py-3 pr-3 text-muted-foreground">{paymentStatusLabel(order.status)}</td>
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
