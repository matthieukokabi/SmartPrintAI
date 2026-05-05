/**
 * READ-ONLY recovery script for an order whose shipped product did not match
 * the customer's design (BUG-B). Builds the corrected print file with the
 * now-correct dims, prints both URLs side-by-side so a human can eyeball the
 * difference, and prints a Printful "report a problem" payload + a refund
 * email template — does NOT send anything.
 *
 * Usage:
 *   node --env-file=.env.local --import tsx scripts/recover-bad-order.ts <orderId>
 *   node --env-file=.env.local --import tsx scripts/recover-bad-order.ts <orderId> --execute   (NOT IMPLEMENTED)
 *
 * The Printful order is already fulfilled. Matt decides reprint vs refund.
 */
import { prisma } from '../src/lib/prisma'
import { buildPrintFile } from '../src/lib/print-file'

function maskEmail(email: string): string {
    if (!email.includes('@')) return '***'
    const [user, domain] = email.split('@')
    return `${user[0] ?? ''}***@${domain}`
}

async function main() {
    const orderId = process.argv[2]
    if (!orderId) {
        console.error('Usage: recover-bad-order.ts <orderId>')
        process.exit(1)
    }

    if (process.argv.includes('--execute')) {
        console.error('--execute is not implemented. This script is read-only by design.')
        process.exit(1)
    }

    const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: { items: true },
    })
    if (!order) {
        console.error(`Order ${orderId} not found`)
        process.exit(1)
    }

    console.log('========================================================')
    console.log(`Order ID:           ${order.id}`)
    console.log(`Stripe session:     ${order.stripeSessionId.slice(0, 18)}...`)
    console.log(`Created:            ${order.createdAt.toISOString()}`)
    console.log(`Customer email:     ${maskEmail(order.email)}`)
    console.log(`Status:             ${order.status}`)
    console.log(`Total:              $${order.total.toFixed(2)}`)
    console.log(`Printful order id:  ${order.printfulOrderId ?? '(none)'}`)
    console.log('========================================================')
    console.log('')

    for (const item of order.items) {
        const product = await prisma.product.findUnique({ where: { id: item.productId } })
        const design = await prisma.design.findUnique({ where: { id: item.designId } })
        if (!product || !design) {
            console.log(`! Item ${item.id}: missing product or design row`)
            continue
        }

        const numericPrintfulId = Number(product.printfulId)
        if (!Number.isFinite(numericPrintfulId) || numericPrintfulId <= 0) {
            console.log(`! Item ${item.id}: non-Printful product (${product.printfulId})`)
            continue
        }

        console.log(`---- ITEM ${item.id} ----`)
        console.log(`  product:           ${product.name} (printful=${product.printfulId})`)
        console.log(`  variant:           size=${item.size}  color=${item.color}  qty=${item.quantity}`)
        console.log(`  ORIGINAL design URL: ${design.imageUrl}`)
        console.log(`  ORIGINAL stored mockupUrl: ${item.mockupUrl ?? '(null)'}`)
        console.log('')
        console.log('  Building CORRECTED print file with current dims …')

        try {
            const printFile = await buildPrintFile({
                sourceUrl: design.imageUrl,
                printfulProductId: numericPrintfulId,
            })
            console.log(`  CORRECTED print file URL: ${printFile.url}`)
            console.log(`  CORRECTED dims:           ${printFile.widthPx}x${printFile.heightPx} @${printFile.dpi} DPI`)
            console.log(`  placement:                ${printFile.placement}`)
            console.log('')

            console.log('  ---- Printful "report problem" payload (UNSENT) ----')
            const issuesPayload = {
                method: 'POST',
                url: `https://api.printful.com/orders/${order.printfulOrderId}/issues`,
                body: {
                    item_id: item.id,
                    reason: 'wrong_image',
                    description:
                        `Order ${order.id} (Printful ${order.printfulOrderId}): printed file did not match the` +
                        ` customer's design. Pre-fix the print pipeline shipped a raw 925x336 RGBA PNG with` +
                        ` no print-area normalization; the variant's actual print area is` +
                        ` ${printFile.widthPx}x${printFile.heightPx} @${printFile.dpi} DPI. Corrected print` +
                        ` file: ${printFile.url}. Requesting reprint at Printful's expense or store credit.`,
                    files: [{ type: 'default', url: printFile.url }],
                },
            }
            console.log(JSON.stringify(issuesPayload, null, 2))
            console.log('')

            console.log('  ---- Customer email template (UNSENT) ----')
            const emailTemplate = `Hi,

Thanks for your order on smartprintai.com. We discovered a defect in our
print-file pipeline that affected your ${product.name} (order ${order.id.slice(-8).toUpperCase()})
shipped on ${order.createdAt.toISOString().slice(0, 10)}: the artwork was sent to our
fulfillment partner without the correct print-area sizing for a
${item.size} ${product.name}. We've fixed the pipeline and we'd like to
make this right.

Two options — your call:

1) Free reprint with the corrected file (no charge, ~5–10 business days
   after we confirm the reprint with Printful), OR
2) Full refund of $${item.price.toFixed(2)} (the item line) — keep the wrong
   item; we don't need it back.

Reply to this email with "REPRINT" or "REFUND" and we'll process it the
same day. Sorry for the hassle.

— SmartPrintAI`
            console.log(emailTemplate)
            console.log('')
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err)
            console.log(`  ! buildPrintFile failed: ${msg}`)
        }

        console.log('')
    }

    console.log('========================================================')
    console.log('NOTHING WAS SENT. Decide reprint vs refund and execute manually.')
    console.log('========================================================')

    await prisma.$disconnect()
}

main().catch((err) => {
    console.error(err)
    process.exit(1)
})
