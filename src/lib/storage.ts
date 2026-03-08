import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { randomUUID } from 'crypto'

const s3 = new S3Client({
    endpoint: process.env.STORAGE_ENDPOINT,
    region: 'auto',
    credentials: {
        accessKeyId: process.env.STORAGE_ACCESS_KEY!,
        secretAccessKey: process.env.STORAGE_SECRET_KEY!,
    },
    forcePathStyle: true,
})

export async function uploadBase64Image(base64Data: string): Promise<string> {
    const base64 = base64Data.replace(/^data:image\/\w+;base64,/, '')
    const buffer = Buffer.from(base64, 'base64')
    const key = `designs/${randomUUID()}.png`

    await s3.send(new PutObjectCommand({
        Bucket: process.env.STORAGE_BUCKET!,
        Key: key,
        Body: buffer,
        ContentType: 'image/png',
        ACL: 'public-read',
    }))

    return `${process.env.STORAGE_PUBLIC_URL}/${key}`
}

export async function uploadBuffer(buffer: Buffer, mimeType: string): Promise<string> {
    const ext = mimeType.split('/')[1]
    const key = `designs/${randomUUID()}.${ext}`

    await s3.send(new PutObjectCommand({
        Bucket: process.env.STORAGE_BUCKET!,
        Key: key,
        Body: buffer,
        ContentType: mimeType,
        ACL: 'public-read',
    }))

    return `${process.env.STORAGE_PUBLIC_URL}/${key}`
}
