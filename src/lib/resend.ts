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

export async function sendSignInLink(params: {
    email: string
    verifyUrl: string
    context?: 'owner_portal' | 'customer_orders'
}) {
    const ownerContext = params.context === 'owner_portal'
    const subject = ownerContext ? 'Owner portal sign in - SmartPrintAI' : 'Sign in to SmartPrintAI'
    const heading = ownerContext ? 'SmartPrintAI Owner Sign-In' : 'SmartPrintAI Sign-In'
    const copy = ownerContext
        ? 'Click the button below to securely sign in to the owner operations portal.'
        : 'Click the button below to securely sign in and view your order history.'

    await resend.emails.send({
        from: process.env.EMAIL_FROM || 'orders@smartprintai.com',
        to: params.email,
        subject,
        html:
            '<div style="font-family: Inter, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px 20px; background: #0a0a0a; color: #fafafa;">' +
            '<h1 style="font-size: 24px; margin: 0 0 12px;">' + heading + '</h1>' +
            '<p style="color: #a1a1aa; margin: 0 0 20px;">' + copy + '</p>' +
            '<a href="' + params.verifyUrl + '" style="display: inline-block; padding: 12px 18px; border-radius: 10px; background: linear-gradient(90deg, #9333ea, #ec4899); color: #ffffff; text-decoration: none; font-weight: 600;">Sign In</a>' +
            '<p style="color: #71717a; margin-top: 20px; font-size: 12px;">This link expires in 15 minutes.</p>' +
            '</div>',
    })
}

export async function sendOrderConfirmation(params: {
    email: string
    orderId: string
    items: Array<{ productId: string; quantity: number }>
    total: number
}) {
    try {
        await resend.emails.send({
            from: process.env.EMAIL_FROM || 'orders@smartprintai.com',
            to: params.email,
            subject: 'Order Confirmed - SmartPrintAI #' + params.orderId.slice(-8).toUpperCase(),
            html:
                '<div style="font-family: Inter, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; background: #0a0a0a; color: #fafafa;">' +
                '<div style="text-align: center; margin-bottom: 32px;">' +
                '<h1 style="font-size: 28px; margin: 0;">SmartPrintAI</h1>' +
                '<p style="color: #a78bfa; font-size: 14px; margin-top: 4px;">Your design is being printed.</p>' +
                '</div>' +
                '<div style="background: #171717; border-radius: 12px; padding: 24px; border: 1px solid #262626;">' +
                '<h2 style="font-size: 20px; margin: 0 0 16px;">Order Confirmed</h2>' +
                '<p style="color: #a1a1aa; margin: 0 0 8px;">Order ID: <strong style="color: #fafafa;">#' + params.orderId.slice(-8).toUpperCase() + '</strong></p>' +
                '<p style="color: #a1a1aa; margin: 0 0 8px;">Items: <strong style="color: #fafafa;">' + String(params.items.length) + '</strong></p>' +
                '<p style="color: #a1a1aa; margin: 0;">Total: <strong style="color: #a78bfa; font-size: 18px;">USD ' + params.total.toFixed(2) + '</strong></p>' +
                '</div>' +
                '<div style="margin-top: 24px; text-align: center; color: #71717a; font-size: 13px;">' +
                '<p>Your items are being produced and will ship within 3-7 business days.</p>' +
                '<p>You will receive a tracking number when your order ships.</p>' +
                '</div>' +
                '<div style="margin-top: 32px; text-align: center; color: #52525b; font-size: 12px;">' +
                '<p>SmartPrintAI - AI-Powered Custom Print</p>' +
                '</div>' +
                '</div>',
        })
    } catch (error) {
        console.error('Failed to send order confirmation email:', error)
    }
}

export async function sendShipmentNotification(params: {
    email: string
    orderId: string
    trackingUrl?: string | null
    trackingNumber?: string | null
    carrier?: string | null
}) {
    try {
        const hasTrackingLink = !!params.trackingUrl
        const trackingDetails =
            (params.carrier ? 'Carrier: <strong style="color: #fafafa;">' + params.carrier + '</strong><br />' : '') +
            (params.trackingNumber ? 'Tracking number: <strong style="color: #fafafa;">' + params.trackingNumber + '</strong>' : '')

        await resend.emails.send({
            from: process.env.EMAIL_FROM || 'orders@smartprintai.com',
            to: params.email,
            subject: 'Your SmartPrintAI order has shipped #' + params.orderId.slice(-8).toUpperCase(),
            html:
                '<div style="font-family: Inter, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; background: #0a0a0a; color: #fafafa;">' +
                '<div style="text-align: center; margin-bottom: 32px;">' +
                '<h1 style="font-size: 28px; margin: 0;">SmartPrintAI</h1>' +
                '<p style="color: #a78bfa; font-size: 14px; margin-top: 4px;">Your order is on the way.</p>' +
                '</div>' +
                '<div style="background: #171717; border-radius: 12px; padding: 24px; border: 1px solid #262626;">' +
                '<h2 style="font-size: 20px; margin: 0 0 16px;">Order Shipped</h2>' +
                '<p style="color: #a1a1aa; margin: 0 0 12px;">Order ID: <strong style="color: #fafafa;">#' + params.orderId.slice(-8).toUpperCase() + '</strong></p>' +
                (trackingDetails.length > 0
                    ? '<p style="color: #a1a1aa; margin: 0 0 14px;">' + trackingDetails + '</p>'
                    : '<p style="color: #a1a1aa; margin: 0 0 14px;">Tracking details will appear soon in your carrier portal.</p>') +
                (hasTrackingLink
                    ? '<a href="' + params.trackingUrl + '" style="display: inline-block; padding: 12px 18px; border-radius: 10px; background: linear-gradient(90deg, #9333ea, #ec4899); color: #ffffff; text-decoration: none; font-weight: 600;">Track shipment</a>'
                    : '') +
                '</div>' +
                '<div style="margin-top: 28px; text-align: center; color: #71717a; font-size: 13px;">' +
                '<p>Thanks for ordering with SmartPrintAI.</p>' +
                '</div>' +
                '</div>',
        })
    } catch (error) {
        console.error('Failed to send shipment notification email:', error)
    }
}

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
        html:
            '<div style="font-family: Inter, sans-serif; max-width: 680px; margin: 0 auto; padding: 32px 20px; background: #0a0a0a; color: #fafafa;">' +
            '<h1 style="font-size: 22px; margin: 0 0 16px;">New Support Request</h1>' +
            '<p style="margin: 0 0 8px; color: #a1a1aa;">Request ID: <strong style="color: #fafafa;">' + params.requestId + '</strong></p>' +
            '<p style="margin: 0 0 8px; color: #a1a1aa;">Name: <strong style="color: #fafafa;">' + params.name + '</strong></p>' +
            '<p style="margin: 0 0 8px; color: #a1a1aa;">Email: <strong style="color: #fafafa;">' + params.email + '</strong></p>' +
            '<p style="margin: 0 0 8px; color: #a1a1aa;">Order ID: <strong style="color: #fafafa;">' + (params.orderId || 'Not provided') + '</strong></p>' +
            '<p style="margin: 0 0 16px; color: #a1a1aa;">Subject: <strong style="color: #fafafa;">' + params.subject + '</strong></p>' +
            '<div style="background: #171717; border: 1px solid #262626; border-radius: 12px; padding: 16px; color: #e4e4e7; white-space: pre-wrap;">' + params.message + '</div>' +
            '</div>',
    })
}

export async function sendSupportAutoReply(params: {
    name: string
    email: string
    orderId?: string
}) {
    await resend.emails.send({
        from: process.env.EMAIL_FROM || 'noreply@smartprintai.com',
        to: params.email,
        subject: 'We received your support request - SmartPrintAI',
        html:
            '<div style="font-family: Inter, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; background: #0a0a0a; color: #fafafa;">' +
            '<h1 style="font-size: 24px; margin: 0 0 12px;">Support request received</h1>' +
            '<p style="color: #a1a1aa; margin: 0 0 10px;">Hi ' + params.name + ',</p>' +
            '<p style="color: #a1a1aa; margin: 0 0 10px;">Thanks for contacting SmartPrintAI support. Our team responds within <strong style="color: #fafafa;">24 business hours</strong>.</p>' +
            '<p style="color: #a1a1aa; margin: 0 0 10px;">For shipping-related requests, our target response is <strong style="color: #fafafa;">within 4 business hours</strong>.</p>' +
            '<p style="color: #a1a1aa; margin: 0 0 0;">Order ID: <strong style="color: #fafafa;">' + (params.orderId || 'Not provided') + '</strong></p>' +
            '</div>',
    })
}

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
            '<div style="font-family: Inter, sans-serif; max-width: 680px; margin: 0 auto; padding: 32px 20px; background: #0a0a0a; color: #fafafa;">' +
            '<h1 style="font-size: 22px; margin: 0 0 16px;">New Discount Lead</h1>' +
            '<p style="margin: 0 0 8px; color: #a1a1aa;">Request ID: <strong style="color: #fafafa;">' + params.requestId + '</strong></p>' +
            '<p style="margin: 0 0 8px; color: #a1a1aa;">Email: <strong style="color: #fafafa;">' + params.email + '</strong></p>' +
            '<p style="margin: 0 0 8px; color: #a1a1aa;">Locale: <strong style="color: #fafafa;">' + params.locale + '</strong></p>' +
            '<p style="margin: 0 0 8px; color: #a1a1aa;">Source: <strong style="color: #fafafa;">' + params.source + '</strong></p>' +
            '<p style="margin: 0 0 0; color: #a1a1aa;">Coupon sent: <strong style="color: #a78bfa;">' + params.couponCode + '</strong></p>' +
            '</div>',
    })
}

export async function sendFirstOrderCouponEmail(params: {
    email: string
    locale: string
    couponCode: string
}) {
    const appBase = (process.env.NEXT_PUBLIC_APP_URL || 'https://smartprintai.com').replace(/\/+$/, '')
    const createUrl = params.locale === 'en' ? `${appBase}/create` : `${appBase}/${params.locale}/create`

    await resend.emails.send({
        from: process.env.EMAIL_FROM || 'noreply@smartprintai.com',
        to: params.email,
        subject: 'Your SmartPrintAI first-order code',
        html:
            '<div style="font-family: Inter, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; background: #0a0a0a; color: #fafafa;">' +
            '<h1 style="font-size: 26px; margin: 0 0 12px;">Welcome to SmartPrintAI</h1>' +
            '<p style="color: #a1a1aa; margin: 0 0 14px;">Here is your first-order discount code:</p>' +
            '<div style="display: inline-block; padding: 12px 16px; border-radius: 10px; border: 1px solid #4ade80; background: #052e16; color: #bbf7d0; font-size: 20px; font-weight: 700; letter-spacing: 1px;">' +
            params.couponCode +
            '</div>' +
            '<p style="color: #a1a1aa; margin: 16px 0 20px;">Use this code during checkout. Offer valid for your first order only.</p>' +
            '<a href="' + createUrl + '" style="display: inline-block; padding: 12px 18px; border-radius: 10px; background: linear-gradient(90deg, #9333ea, #ec4899); color: #ffffff; text-decoration: none; font-weight: 600;">Start creating</a>' +
            '<p style="color: #71717a; margin-top: 24px; font-size: 12px;">If you did not request this, you can ignore this email.</p>' +
            '</div>',
    })
}
