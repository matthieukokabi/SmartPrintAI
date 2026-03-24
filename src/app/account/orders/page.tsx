import Link from 'next/link'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getSessionFromCookieStore } from '@/lib/auth-session'
import { buildSignInPath } from '@/lib/auth-callback'
import { getReadableOrderStatus } from '@/components/order/OrderStatusTimeline'

export const dynamic = 'force-dynamic'

function orderLabel(id: string): string {
    return '#' + id.slice(-8).toUpperCase()
}

export default async function AccountOrdersPage() {
    const session = getSessionFromCookieStore()
    if (!session) {
        redirect(buildSignInPath('/account/orders'))
    }

    const orders = await prisma.order.findMany({
        where: {
            OR: [
                { userId: session.userId },
                { email: session.email },
            ],
        },
        include: {
            items: {
                include: {
                    product: {
                        select: { name: true },
                    },
                },
            },
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
    })

    return (
        <div className="max-w-4xl mx-auto px-4 py-10 space-y-6">
            <div className="flex items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold">Your Orders</h1>
                    <p className="text-sm text-muted-foreground mt-1">Signed in as {session.email}</p>
                </div>

                <Link
                    href="/api/auth/logout"
                    className="text-sm px-3 py-2 rounded-lg border border-white/10 hover:bg-white/5"
                >
                    Sign out
                </Link>
            </div>

            {orders.length === 0 ? (
                <div className="glass rounded-2xl p-6">
                    <p className="text-sm text-muted-foreground">No orders found for this account yet.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {orders.map((order) => (
                        <div key={order.id} className="glass rounded-2xl p-5">
                            <div className="flex items-center justify-between gap-4">
                                <div>
                                    <p className="font-semibold">{orderLabel(order.id)}</p>
                                    <p className="text-sm text-muted-foreground">{new Date(order.createdAt).toLocaleString()}</p>
                                </div>
                                <p className="text-sm px-3 py-1 rounded-full bg-white/10 border border-white/10">
                                    {getReadableOrderStatus(order.status)}
                                </p>
                            </div>

                            <div className="mt-3 text-sm text-muted-foreground space-y-1">
                                <p>
                                    Total: <span className="text-foreground font-medium">USD {order.total.toFixed(2)}</span>
                                </p>
                                <p>
                                    Items: <span className="text-foreground font-medium">{order.items.length}</span>
                                </p>
                            </div>

                            <ul className="mt-3 text-sm text-muted-foreground space-y-1">
                                {order.items.map((item) => (
                                    <li key={item.id}>
                                        <span className="text-foreground font-medium">{item.product?.name || item.productId}</span>
                                        {' • '}Qty {item.quantity}
                                        {' • '}Size {item.size}
                                        {' • '}Color {item.color}
                                    </li>
                                ))}
                            </ul>

                            <Link href={'/orders/' + order.id} className="inline-flex mt-4 text-sm text-purple-300 hover:text-purple-200">
                                View tracking
                            </Link>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
