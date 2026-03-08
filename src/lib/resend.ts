import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function sendSignInLink(params: {
    email: string
    verifyUrl: string
}) {
    await resend.emails.send({
        from: process.env.EMAIL_FROM || 'orders@smartprintai.com',
        to: params.email,
        subject: 'Sign in to SmartPrintAI',
        html:
            '<div style="font-family: Inter, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px 20px; background: #0a0a0a; color: #fafafa;">' +
            '<h1 style="font-size: 24px; margin: 0 0 12px;">SmartPrintAI Sign-In</h1>' +
            '<p style="color: #a1a1aa; margin: 0 0 20px;">Click the button below to securely sign in and view your order history.</p>' +
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
