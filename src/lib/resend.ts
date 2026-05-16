import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

function supportRecipients(): string[] {
    const primary = (process.env.SUPPORT_EMAIL || 'support@smartprintai.com').trim().toLowerCase()
    const secondary = (process.env.CONTACT_EMAIL || 'contact@smartprintai.com').trim().toLowerCase()
    return Array.from(new Set([primary, secondary].filter(Boolean)))
}

function marketingRecipients(): string[] {
    const primary = (process.env.MARKETING_EMAIL || process.env.SUPPORT_EMAIL || 'support@smartprintai.com')
        .trim()
        .toLowerCase()
    return Array.from(new Set([primary, ...supportRecipients()].filter(Boolean)))
}

const APP_URL = () => (process.env.NEXT_PUBLIC_APP_URL || 'https://smartprintai.com').replace(/\/+$/, '')

function emailShell(body: string): string {
    return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#070b16;font-family:'Inter','Helvetica Neue',Arial,sans-serif;color:#e4e4e7;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#070b16;">
<tr><td align="center" style="padding:32px 16px;">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
<!-- HEADER -->
<tr><td style="text-align:center;padding:0 0 28px;">
<h1 style="margin:0;font-size:26px;font-weight:800;background:linear-gradient(90deg,#2f6cf3,#26d4b8);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;">SmartPrintAI</h1>
<p style="margin:4px 0 0;font-size:12px;color:#71717a;">AI-Powered Custom Print on Demand</p>
</td></tr>
<!-- BODY -->
<tr><td style="background:#0b1222;border-radius:16px;padding:32px 28px;border:1px solid #1e293b;">
${body}
</td></tr>
<!-- FOOTER -->
<tr><td style="text-align:center;padding:24px 0 0;color:#52525b;font-size:11px;line-height:1.6;">
<p style="margin:0;">&copy; ${new Date().getFullYear()} SmartPrintAI. All rights reserved.</p>
<p style="margin:4px 0 0;"><a href="${APP_URL()}/privacy" style="color:#52525b;text-decoration:underline;">Privacy</a> &middot; <a href="${APP_URL()}/terms" style="color:#52525b;text-decoration:underline;">Terms</a> &middot; <a href="${APP_URL()}/support" style="color:#52525b;text-decoration:underline;">Support</a></p>
</td></tr>
</table>
</td></tr>
</table>
</body></html>`
}

function ctaButton(label: string, href: string): string {
    return `<a href="${href}" style="display:inline-block;padding:14px 28px;border-radius:10px;background:linear-gradient(90deg,#2f6cf3,#26d4b8);color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;">${label}</a>`
}

function infoBox(content: string): string {
    return `<div style="background:#111827;border:1px solid #1e293b;border-radius:10px;padding:16px 20px;margin:16px 0;">${content}</div>`
}

function codeBox(code: string): string {
    return `<div style="display:inline-block;padding:14px 24px;border-radius:10px;border:2px solid #26d4b8;background:#0d2b26;color:#5eead4;font-size:22px;font-weight:700;letter-spacing:2px;font-family:'Courier New',monospace;">${code}</div>`
}

function sectionTitle(text: string): string {
    return `<h2 style="font-size:22px;font-weight:700;margin:0 0 12px;color:#f4f4f5;">${text}</h2>`
}

function mutedText(text: string): string {
    return `<p style="color:#a1a1aa;margin:0 0 16px;font-size:14px;line-height:1.6;">${text}</p>`
}

// ────────────────────────────────────────────────────────────────
// 1. ORDER CONFIRMATION
// ────────────────────────────────────────────────────────────────
export async function sendOrderConfirmation(params: {
    email: string
    orderId: string
    items: Array<{ productId: string; quantity: number }>
    total: number
}) {
    try {
        const shortId = params.orderId.slice(-8).toUpperCase()
        const itemRows = params.items
            .map(
                (item) =>
                    `<tr><td style="padding:6px 0;color:#d4d4d8;font-size:13px;border-bottom:1px solid #1e293b;">${item.productId.slice(-8)}</td><td style="padding:6px 0;color:#d4d4d8;font-size:13px;text-align:center;border-bottom:1px solid #1e293b;">${item.quantity}</td></tr>`
            )
            .join('')

        await resend.emails.send({
            from: process.env.EMAIL_FROM || 'orders@smartprintai.com',
            to: params.email,
            subject: `Your order is confirmed — SmartPrintAI #${shortId}`,
            html: emailShell(`
${sectionTitle('✅ Order Confirmed')}
${mutedText('Your order is confirmed and being sent to production.')}
${infoBox(`
<p style="color:#a1a1aa;margin:0 0 6px;font-size:13px;">Order ID: <strong style="color:#f4f4f5;">#${shortId}</strong></p>
<p style="color:#a1a1aa;margin:0 0 6px;font-size:13px;">Items: <strong style="color:#f4f4f5;">${params.items.length}</strong></p>
<p style="color:#a1a1aa;margin:0;font-size:13px;">Total: <strong style="color:#26d4b8;font-size:17px;">$${params.total.toFixed(2)}</strong></p>
`)}
<table width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;">
<tr><th style="text-align:left;color:#71717a;font-size:11px;text-transform:uppercase;padding:6px 0;border-bottom:1px solid #1e293b;">Item</th><th style="text-align:center;color:#71717a;font-size:11px;text-transform:uppercase;padding:6px 0;border-bottom:1px solid #1e293b;">Qty</th></tr>
${itemRows}
</table>
${mutedText("We'll email you when your order ships with a tracking link. Standard delivery: 5–10 business days.")}
<div style="text-align:center;margin-top:24px;">${ctaButton('View Your Orders', `${APP_URL()}/account/orders`)}</div>
            `),
        })
    } catch (error) {
        console.error('Failed to send order confirmation email:', error)
    }
}

// ────────────────────────────────────────────────────────────────
// 1b. ORDER IN REVIEW (REQUIRES_REVIEW path)
// ────────────────────────────────────────────────────────────────
export async function sendOrderInReview(params: {
    email: string
    orderId: string
    itemSummary?: string
}) {
    const shortId = params.orderId.slice(-8).toUpperCase()
    const result = await resend.emails.send({
        from: process.env.EMAIL_FROM || 'orders@smartprintai.com',
        to: params.email,
        subject: `We're reviewing your order — SmartPrintAI #${shortId}`,
        html: emailShell(`
${sectionTitle('🔍 Your Order Is In Review')}
${mutedText('Thanks for ordering. Our team is reviewing the design for quality before sending it to production.')}
${infoBox(`
<p style="color:#a1a1aa;margin:0 0 6px;font-size:13px;">Order ID: <strong style="color:#f4f4f5;">#${shortId}</strong></p>
${params.itemSummary ? `<p style="color:#a1a1aa;margin:0;font-size:13px;">Item: <strong style="color:#f4f4f5;">${params.itemSummary}</strong></p>` : ''}
`)}
${mutedText("We'll email you again within 24 hours with status. No action needed from you right now.")}
${mutedText('Questions? <a href="' + APP_URL() + '/support" style="color:#2f6cf3;text-decoration:underline;">Contact support</a> or reply to this email.')}
        `),
    })
    if (result.error) {
        throw new Error(
            `Resend API error sending order in review: ` +
            (result.error.message ?? JSON.stringify(result.error)),
        )
    }
    return result.data
}

// ────────────────────────────────────────────────────────────────
// 2. SHIPMENT NOTIFICATION
// ────────────────────────────────────────────────────────────────
export async function sendShipmentNotification(params: {
    email: string
    orderId: string
    trackingUrl?: string | null
    trackingNumber?: string | null
    carrier?: string | null
}) {
    const shortId = params.orderId.slice(-8).toUpperCase()
    const trackingLines = [
        params.carrier ? `<p style="color:#a1a1aa;margin:0 0 6px;font-size:13px;">Carrier: <strong style="color:#f4f4f5;">${params.carrier}</strong></p>` : '',
        params.trackingNumber ? `<p style="color:#a1a1aa;margin:0;font-size:13px;">Tracking: <strong style="color:#f4f4f5;">${params.trackingNumber}</strong></p>` : '',
    ]
        .filter(Boolean)
        .join('')

    const result = await resend.emails.send({
        from: process.env.EMAIL_FROM || 'orders@smartprintai.com',
        to: params.email,
        subject: `Your order is on its way! 🚀 #${shortId}`,
        html: emailShell(`
${sectionTitle('🚀 Your Order Has Shipped!')}
${mutedText(`Order <strong style="color:#f4f4f5;">#${shortId}</strong> is on its way to you.`)}
${trackingLines ? infoBox(trackingLines) : ''}
${params.trackingUrl ? `<div style="text-align:center;margin:24px 0;">${ctaButton('Track My Shipment', params.trackingUrl)}</div>` : ''}
${mutedText('Standard delivery: 5–10 business days. Express: 2–4 business days.')}
${mutedText('Questions? <a href="' + APP_URL() + '/support" style="color:#2f6cf3;text-decoration:underline;">Contact support</a> or reply to this email.')}
        `),
    })
    if (result.error) {
        throw new Error(
            `Resend API error sending shipment notification: ` +
            (result.error.message ?? JSON.stringify(result.error)),
        )
    }
    return result.data
}

// ────────────────────────────────────────────────────────────────
// 3. SIGN-IN LINK
// ────────────────────────────────────────────────────────────────
export async function sendSignInLink(params: {
    email: string
    verifyUrl: string
}) {
    await resend.emails.send({
        from: process.env.EMAIL_FROM || 'orders@smartprintai.com',
        to: params.email,
        subject: 'Your SmartPrintAI sign-in link',
        html: emailShell(`
${sectionTitle('Sign In to SmartPrintAI')}
${mutedText('Click the button below to securely sign in and view your order history.')}
<div style="text-align:center;margin:24px 0;">${ctaButton('Sign In to SmartPrintAI', params.verifyUrl)}</div>
${infoBox(`<p style="color:#a1a1aa;margin:0;font-size:12px;">⏱ This link expires in <strong style="color:#f4f4f5;">15 minutes</strong>.<br>🔒 Never share this link with anyone.</p>`)}
${mutedText("If you didn't request this, you can safely ignore this email.")}
        `),
    })
}

// ────────────────────────────────────────────────────────────────
// 4. SUPPORT REQUEST (to team)
// ────────────────────────────────────────────────────────────────
export async function sendSupportRequest(params: {
    name: string
    email: string
    subject: string
    message: string
    orderId?: string
    requestId: string
}) {
    const recipients = supportRecipients()
    await resend.emails.send({
        from: process.env.EMAIL_FROM || 'noreply@smartprintai.com',
        to: recipients,
        subject: '[Support] ' + params.subject,
        replyTo: params.email,
        html: emailShell(`
${sectionTitle('New Support Request')}
${infoBox(`
<p style="color:#a1a1aa;margin:0 0 6px;font-size:13px;">Request ID: <strong style="color:#f4f4f5;">${params.requestId}</strong></p>
<p style="color:#a1a1aa;margin:0 0 6px;font-size:13px;">Name: <strong style="color:#f4f4f5;">${params.name}</strong></p>
<p style="color:#a1a1aa;margin:0 0 6px;font-size:13px;">Email: <strong style="color:#f4f4f5;">${params.email}</strong></p>
<p style="color:#a1a1aa;margin:0;font-size:13px;">Order ID: <strong style="color:#f4f4f5;">${params.orderId || 'Not provided'}</strong></p>
`)}
<p style="color:#71717a;font-size:11px;text-transform:uppercase;margin:16px 0 8px;">Message</p>
<div style="background:#111827;border:1px solid #1e293b;border-radius:10px;padding:16px 20px;color:#e4e4e7;white-space:pre-wrap;font-size:14px;line-height:1.6;">${params.message}</div>
        `),
    })
}

// ────────────────────────────────────────────────────────────────
// 5. SUPPORT AUTO-REPLY (to customer)
// ────────────────────────────────────────────────────────────────
export async function sendSupportAutoReply(params: {
    name: string
    email: string
    orderId?: string
}) {
    await resend.emails.send({
        from: process.env.EMAIL_FROM || 'noreply@smartprintai.com',
        to: params.email,
        subject: 'We received your support request — SmartPrintAI',
        html: emailShell(`
${sectionTitle('Support Request Received')}
${mutedText(`Hi ${params.name}, thanks for contacting SmartPrintAI support.`)}
${infoBox(`
<p style="color:#a1a1aa;margin:0 0 6px;font-size:13px;">Order ID: <strong style="color:#f4f4f5;">${params.orderId || 'Not provided'}</strong></p>
<p style="color:#a1a1aa;margin:0;font-size:13px;">Response time: <strong style="color:#26d4b8;">within 24 hours</strong></p>
`)}
${mutedText('For shipping-related requests, our target response is <strong style="color:#f4f4f5;">within 4 business hours</strong>.')}
<div style="text-align:center;margin-top:20px;">${ctaButton('Visit Support', `${APP_URL()}/support`)}</div>
        `),
    })
}

// ────────────────────────────────────────────────────────────────
// 6. DISCOUNT LEAD NOTIFICATION (internal)
// ────────────────────────────────────────────────────────────────
export async function sendDiscountLeadNotification(params: {
    email: string
    locale: string
    source: string
    couponCode: string
    requestId: string
}) {
    const recipients = marketingRecipients()
    await resend.emails.send({
        from: process.env.EMAIL_FROM || 'noreply@smartprintai.com',
        to: recipients,
        subject: '[Lead] First-order discount signup',
        replyTo: params.email,
        html:
            '<div style="font-family:sans-serif;padding:20px;background:#0a0a0a;color:#fafafa;">' +
            '<h2>New Discount Lead</h2>' +
            '<p>Request ID: ' + params.requestId + '</p>' +
            '<p>Email: ' + params.email + '</p>' +
            '<p>Locale: ' + params.locale + '</p>' +
            '<p>Source: ' + params.source + '</p>' +
            '<p>Coupon: <strong style="color:#26d4b8;">' + params.couponCode + '</strong></p>' +
            '</div>',
    })
}

// ────────────────────────────────────────────────────────────────
// 7. FIRST-ORDER COUPON EMAIL (to customer)
// ────────────────────────────────────────────────────────────────
export async function sendFirstOrderCouponEmail(params: {
    email: string
    locale: string
    couponCode: string
}) {
    const createUrl = params.locale === 'en' ? `${APP_URL()}/create` : `${APP_URL()}/${params.locale}/create`

    await resend.emails.send({
        from: process.env.EMAIL_FROM || 'noreply@smartprintai.com',
        to: params.email,
        subject: 'Your exclusive discount — SmartPrintAI',
        html: emailShell(`
${sectionTitle('Welcome to SmartPrintAI!')}
${mutedText("Here's your exclusive first-order discount code:")}
<div style="text-align:center;margin:24px 0;">${codeBox(params.couponCode)}</div>
${mutedText('Use this code at checkout. Valid for your first order only.')}
<div style="text-align:center;margin-top:24px;">${ctaButton('Start Designing', createUrl)}</div>
${mutedText('<small style="color:#71717a;">If you did not request this, you can ignore this email.</small>')}
        `),
    })
}

// ────────────────────────────────────────────────────────────────
// 8. ORDER IN PRODUCTION (NEW)
// ────────────────────────────────────────────────────────────────
export async function sendOrderInProduction(params: {
    email: string
    orderId: string
}) {
    try {
        const shortId = params.orderId.slice(-8).toUpperCase()

        await resend.emails.send({
            from: process.env.EMAIL_FROM || 'orders@smartprintai.com',
            to: params.email,
            subject: `Your SmartPrintAI order is in production 🎨 #${shortId}`,
            html: emailShell(`
${sectionTitle('🎨 Your Design Is Being Printed!')}
${mutedText(`Order <strong style="color:#f4f4f5;">#${shortId}</strong> has entered production.`)}
${infoBox(`
<p style="color:#a1a1aa;margin:0 0 6px;font-size:13px;">Status: <strong style="color:#26d4b8;">In Production</strong></p>
<p style="color:#a1a1aa;margin:0;font-size:13px;">Estimated dispatch: <strong style="color:#f4f4f5;">2–5 business days</strong></p>
`)}
${mutedText("We'll send you a tracking number as soon as your order ships.")}
<div style="text-align:center;margin-top:24px;">${ctaButton('View Order Status', `${APP_URL()}/account/orders`)}</div>
            `),
        })
    } catch (error) {
        console.error('Failed to send order in production email:', error)
    }
}
