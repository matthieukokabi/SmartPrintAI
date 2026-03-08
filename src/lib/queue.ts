import { Queue, Worker, type Job } from 'bullmq'
import IORedis from 'ioredis'
import type { DesignStyle } from '@/types'

export type ImageJobData = {
    prompt: string
    style?: DesignStyle
    designId?: string
}

export type ImageJobResult = {
    imageUrl: string
    designId?: string
}

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6380'
const connection = new IORedis(redisUrl, {
    maxRetriesPerRequest: null,
})

type QueueConnection = NonNullable<ConstructorParameters<typeof Queue>[1]>['connection']

// BullMQ may bundle a different ioredis type than the app dependency.
const bullConnection = connection as unknown as QueueConnection

export const imageQueue = new Queue<ImageJobData, ImageJobResult>('image-processing', {
    connection: bullConnection,
})

export function createImageWorker(
    processor: (job: Job<ImageJobData, ImageJobResult>) => Promise<ImageJobResult>
) {
    return new Worker<ImageJobData, ImageJobResult>('image-processing', processor, {
        connection: bullConnection,
        concurrency: 2,
    })
}
