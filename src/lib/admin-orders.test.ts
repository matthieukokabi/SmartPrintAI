import { describe, expect, it } from 'vitest'
import {
  buildAdminOrdersWhere,
  normalizeAdminOrderSearchQuery,
  normalizeAdminOrderStatusFilter,
} from '@/lib/admin-orders'

describe('admin order helpers', () => {
  it('normalizes order search query and strips hash prefix', () => {
    expect(normalizeAdminOrderSearchQuery('  #TVKIVXXW  ')).toBe('tvkivxxw')
    expect(normalizeAdminOrderSearchQuery('')).toBeNull()
    expect(normalizeAdminOrderSearchQuery(undefined)).toBeNull()
  })

  it('normalizes status filter to allowed values', () => {
    expect(normalizeAdminOrderStatusFilter('PROCESSING')).toBe('processing')
    expect(normalizeAdminOrderStatusFilter('unknown')).toBe('all')
    expect(normalizeAdminOrderStatusFilter(undefined)).toBe('all')
  })

  it('builds where input with search and status conditions', () => {
    const where = buildAdminOrdersWhere('tvkivxxw', 'processing')
    expect(where).toEqual({
      AND: [
        {
          OR: [
            { id: { contains: 'tvkivxxw', mode: 'insensitive' } },
            { email: { contains: 'tvkivxxw', mode: 'insensitive' } },
            { stripeSessionId: { contains: 'tvkivxxw', mode: 'insensitive' } },
            { printfulOrderId: { contains: 'tvkivxxw', mode: 'insensitive' } },
          ],
        },
        { status: 'processing' },
      ],
    })
  })

  it('returns undefined when no filters are provided', () => {
    expect(buildAdminOrdersWhere(null, 'all')).toBeUndefined()
  })
})
