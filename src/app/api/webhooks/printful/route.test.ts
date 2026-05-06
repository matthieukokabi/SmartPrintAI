import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  prisma: {
    order: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
  },
  printful: {
    getOrder: vi.fn(),
  },
}))

vi.mock('@/lib/prisma', () => ({
  prisma: mocks.prisma,
}))

vi.mock('@/lib/printful', () => ({
  printful: mocks.printful,
}))

import { POST } from './route'

function createRequest(body: string, headers: HeadersInit = {}) {
  return new NextRequest('http://localhost:3100/api/webhooks/printful', {
    method: 'POST',
    body,
    headers,
  })
}

const FULFILLED_PAYLOAD = JSON.stringify({
  type: 'order_updated',
  data: {
    order: { id: 155944590, external_id: 'cmoe4tawg0000rvl2o02v9twv' },
  },
})

const PENDING_PAYLOAD = JSON.stringify({
  type: 'order_updated',
  data: { order: { id: 155944590, external_id: 'cmoe4tawg0000rvl2o02v9twv' } },
})

const SHIPPED_PAYLOAD = JSON.stringify({
  type: 'package_shipped',
  data: { order: { id: 155944590, external_id: 'cmoe4tawg0000rvl2o02v9twv' } },
})

describe('/api/webhooks/printful POST (verify-by-refetch)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('A. returns 400 when body is not valid JSON', async () => {
    const res = await POST(createRequest('not json'))
    expect(res.status).toBe(400)
    expect(mocks.printful.getOrder).not.toHaveBeenCalled()
    expect(mocks.prisma.order.findFirst).not.toHaveBeenCalled()
    expect(mocks.prisma.order.update).not.toHaveBeenCalled()
  })

  it('B. returns 200 (ignored) when envelope has no order id', async () => {
    const res = await POST(
      createRequest('{"type":"package_shipped","data":{}}'),
    )
    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toEqual({ ok: true, ignored: true })
    expect(mocks.printful.getOrder).not.toHaveBeenCalled()
    expect(mocks.prisma.order.update).not.toHaveBeenCalled()
  })

  it('C. fulfilled event flips status and appends to internalNotes', async () => {
    mocks.printful.getOrder.mockResolvedValue({
      id: 155944590,
      external_id: 'cmoe4tawg0000rvl2o02v9twv',
      status: 'fulfilled',
      shipping: 'STANDARD',
      shipments: [
        {
          id: 1,
          carrier: 'USPS',
          tracking_number: '9400111899560000000001',
          tracking_url: 'https://tools.usps.com/track?9400111899560000000001',
        },
      ],
    })
    mocks.prisma.order.findFirst.mockResolvedValue({
      id: 'cmoe4tawg0000rvl2o02v9twv',
      status: 'REPRINT_REQUESTED',
      printfulOrderId: '155944590',
      internalNotes: 'prior note',
    })
    mocks.prisma.order.update.mockResolvedValue({ id: 'cmoe4tawg0000rvl2o02v9twv' })

    const res = await POST(createRequest(SHIPPED_PAYLOAD))

    expect(res.status).toBe(200)
    expect(mocks.printful.getOrder).toHaveBeenCalledWith(155944590)
    expect(mocks.prisma.order.update).toHaveBeenCalledTimes(1)

    const updateArg = mocks.prisma.order.update.mock.calls[0][0]
    expect(updateArg).toEqual(
      expect.objectContaining({
        where: { id: 'cmoe4tawg0000rvl2o02v9twv' },
        data: expect.objectContaining({
          status: 'fulfilled',
          internalNotes: expect.stringContaining('webhook=package_shipped'),
        }),
      }),
    )
    const notes = updateArg.data.internalNotes as string
    expect(notes).toContain('printful_status=fulfilled')
    expect(notes).toContain('tracking=USPS:9400111899560000000001')
    expect(notes).toContain('prior note')
    expect(notes).toContain('local_status_before=REPRINT_REQUESTED')
    expect(notes).toContain('local_status_after=fulfilled')
  })

  it('D. unmappable status (pending) does NOT flip status', async () => {
    mocks.printful.getOrder.mockResolvedValue({
      id: 155944590,
      external_id: 'cmoe4tawg0000rvl2o02v9twv',
      status: 'pending',
      shipping: 'STANDARD',
      shipments: [],
    })
    mocks.prisma.order.findFirst.mockResolvedValue({
      id: 'cmoe4tawg0000rvl2o02v9twv',
      status: 'processing',
      printfulOrderId: '155944590',
      internalNotes: null,
    })
    mocks.prisma.order.update.mockResolvedValue({ id: 'cmoe4tawg0000rvl2o02v9twv' })

    const res = await POST(createRequest(PENDING_PAYLOAD))

    expect(res.status).toBe(200)
    expect(mocks.prisma.order.update).toHaveBeenCalledTimes(1)

    const updateArg = mocks.prisma.order.update.mock.calls[0][0]
    expect(updateArg.data.internalNotes).toEqual(
      expect.stringContaining('printful_status=pending'),
    )
    // Conservatively: do NOT touch status when Printful state is unmappable.
    expect(Object.keys(updateArg.data)).not.toContain('status')
    expect(updateArg.data.internalNotes).toEqual(
      expect.stringContaining('local_status_after=processing'),
    )
  })

  it('E. returns 200 (no-write) when no local order is found', async () => {
    mocks.printful.getOrder.mockResolvedValue({
      id: 155944590,
      external_id: null,
      status: 'fulfilled',
      shipping: 'STANDARD',
      shipments: [],
    })
    mocks.prisma.order.findFirst.mockResolvedValue(null)

    const res = await POST(createRequest(FULFILLED_PAYLOAD))

    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toEqual({ ok: true, noLocalOrder: true })
    expect(mocks.prisma.order.update).not.toHaveBeenCalled()
  })

  it('F. returns 200 (no-write) when printful.getOrder throws', async () => {
    mocks.printful.getOrder.mockRejectedValue(new Error('500 oops'))

    const res = await POST(createRequest(FULFILLED_PAYLOAD))

    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toEqual({ ok: true, refetchFailed: true })
    expect(mocks.prisma.order.findFirst).not.toHaveBeenCalled()
    expect(mocks.prisma.order.update).not.toHaveBeenCalled()
  })
})
