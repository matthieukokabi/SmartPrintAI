import IORedis from 'ioredis'
import { NextRequest } from 'next/server'

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6380'
const redis = new IORedis(redisUrl, {
    maxRetriesPerRequest: 1,
    lazyConnect: true,
})

export type RateLimitResult = {
    allowed: boolean
    limit: number
    remaining: number
    resetInSec: number
}

function normalizeIp(value: string): string {
    const trimmed = value.trim()
    if (!trimmed) return 'unknown'
    if (trimmed.length > 120) return trimmed.slice(0, 120)
    return trimmed
}

export function getRequestClientIp(req: NextRequest): string {
    const xForwardedFor = req.headers.get('x-forwarded-for')
    if (xForwardedFor) {
        return normalizeIp(xForwardedFor.split(',')[0] || 'unknown')
    }

    const xRealIp = req.headers.get('x-real-ip')
    if (xRealIp) {
        return normalizeIp(xRealIp)
    }

    return 'unknown'
}

export async function rateLimitByKey(key: string, limit: number, windowSec: number): Promise<RateLimitResult> {
    try {
        await redis.connect().catch(() => undefined)

        const count = await redis.incr(key)
        if (count === 1) {
            await redis.expire(key, windowSec)
        }

        const ttl = await redis.ttl(key)
        const resetInSec = ttl > 0 ? ttl : windowSec

        return {
            allowed: count <= limit,
            limit,
            remaining: Math.max(0, limit - count),
            resetInSec,
        }
    } catch {
        // Fail-open to avoid blocking production requests if Redis is unavailable.
        return {
            allowed: true,
            limit,
            remaining: limit,
            resetInSec: windowSec,
        }
    }
}

export async function rateLimitRequest(
    req: NextRequest,
    routeKey: string,
    limit: number,
    windowSec: number
): Promise<RateLimitResult> {
    const ip = getRequestClientIp(req)
    const key = `ratelimit:${routeKey}:${ip}`
    return rateLimitByKey(key, limit, windowSec)
}
