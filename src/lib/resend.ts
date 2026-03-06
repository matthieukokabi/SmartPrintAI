import { Resend } from 'resend'

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

export async function sendOrderConfirmation(params: {
    email: string
    orderId: string
    items: any[]
    total: number
}) {
    if (!resend) {
        console.log('📧 [DEV] Order confirmation email would be sent to:', params.email)
        return
    }

    await resend.emails.send({
        from: process.env.EMAIL_FROM || 'orders@smartprintai.com',
        to: params.email,
        subject: `Order Confirmed — SmartPrintAI #${params.orderId.slice(0, 8)}`,
        html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #7C3AED;">🎨 Your order is confirmed!</h1>
        <p>Thank you for your order. Your custom design is being printed right now.</p>
        <p><strong>Order ID:</strong> ${params.orderId}</p>
        <p><strong>Total:</strong> $${params.total.toFixed(2)}</p>
        <p><strong>Items:</strong> ${params.items.length} item(s)</p>
        <hr />
        <p>You'll receive a tracking number once your order ships (typically 3–7 business days).</p>
        <p>— The SmartPrintAI Team</p>
      </div>
    `,
    })
}
