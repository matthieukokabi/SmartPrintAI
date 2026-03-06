import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { randomUUID } from 'crypto'

let s3: S3Client | null = null

function getS3Client() {
    if (!s3 && process.env.STORAGE_ENDPOINT) {
        s3 = new S3Client({
            endpoint: process.env.STORAGE_ENDPOINT,
            region: 'auto',
            credentials: {
                accessKeyId: process.env.STORAGE_ACCESS_KEY!,
                secretAccessKey: process.env.STORAGE_SECRET_KEY!,
            },
            forcePathStyle: true,
        })
    }
    return s3
}

export async function uploadBase64Image(base64Data: string): Promise<string> {
    const client = getS3Client()

    // If no storage configured, save as data URL temporarily
    if (!client) {
        console.warn('No storage configured — returning base64 data URL')
        return base64Data
    }

    const base64 = base64Data.replace(/^data:image\/\w+;base64,/, '')
    const buffer = Buffer.from(base64, 'base64')

    const key = `designs/${randomUUID()}.png`

    await client.send(
        new PutObjectCommand({
            Bucket: process.env.STORAGE_BUCKET!,
            Key: key,
            Body: buffer,
            ContentType: 'image/png',
        })
    )

    return `${process.env.STORAGE_PUBLIC_URL}/${key}`
}
