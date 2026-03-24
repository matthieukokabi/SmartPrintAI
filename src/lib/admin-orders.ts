import { Prisma } from '@prisma/client'

const MAX_SEARCH_LENGTH = 120

export const ADMIN_ORDERS_DEFAULT_LIMIT = 250

export type AdminOrderStatusFilter =
  | 'all'
  | 'pending'
  | 'paid'
  | 'processing'
  | 'manual_review'
  | 'fulfillment_failed'
  | 'shipped'

export function normalizeAdminOrderSearchQuery(value: string | string[] | undefined): string | null {
  const raw = Array.isArray(value) ? value[0] : value
  if (typeof raw !== 'string') {
    return null
  }

  const trimmed = raw.trim()
  if (!trimmed) {
    return null
  }

  const withoutHashPrefix = trimmed.replace(/^#+/, '')
  if (!withoutHashPrefix) {
    return null
  }

  return withoutHashPrefix.slice(0, MAX_SEARCH_LENGTH).toLowerCase()
}

export function normalizeAdminOrderStatusFilter(value: string | string[] | undefined): AdminOrderStatusFilter {
  const raw = Array.isArray(value) ? value[0] : value
  if (typeof raw !== 'string') {
    return 'all'
  }

  const normalized = raw.trim().toLowerCase()
  switch (normalized) {
    case 'pending':
    case 'paid':
    case 'processing':
    case 'manual_review':
    case 'fulfillment_failed':
    case 'shipped':
      return normalized
    default:
      return 'all'
  }
}

export function buildAdminOrdersWhere(
  query: string | null,
  statusFilter: AdminOrderStatusFilter
): Prisma.OrderWhereInput | undefined {
  const andConditions: Prisma.OrderWhereInput[] = []

  if (query) {
    andConditions.push({
      OR: [
        { id: { contains: query, mode: 'insensitive' } },
        { email: { contains: query, mode: 'insensitive' } },
        { stripeSessionId: { contains: query, mode: 'insensitive' } },
        { printfulOrderId: { contains: query, mode: 'insensitive' } },
      ],
    })
  }

  if (statusFilter !== 'all') {
    andConditions.push({ status: statusFilter })
  }

  if (andConditions.length === 0) {
    return undefined
  }

  if (andConditions.length === 1) {
    return andConditions[0]
  }

  return {
    AND: andConditions,
  }
}
