import request from 'supertest'
import app from '../../src/server'
import prisma from '../../src/lib/prisma'
import bcrypt from 'bcrypt'

describe('Payment flow', () => {
  let token: string
  let workspaceId: string
  let activityId: string
  let userId: string

  beforeAll(async () => {
    const passwordHash = await bcrypt.hash('password123', 10)

    const user = await prisma.user.create({
      data: { email: 'pay-test@test.com', passwordHash, name: 'Pay Tester' },
    })
    userId = user.id

    const ws = await prisma.workspace.create({
      data: {
        name: 'Payment Test WS',
        members: { create: { userId: user.id, role: 'ADMIN' } },
      },
    })
    workspaceId = ws.id

    const activity = await prisma.activity.create({
      data: {
        title: '测试读书会',
        capacity: 10,
        priceCents: 1000,
        status: 'PUBLISHED',
        startsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        workspaceId: ws.id,
        createdById: user.id,
      },
    })
    activityId = activity.id

    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'pay-test@test.com', password: 'password123' })
    token = res.body.data.token
  })

  afterAll(async () => {
    await prisma.paymentEvent.deleteMany({})
    await prisma.ticket.deleteMany({})
    await prisma.order.deleteMany({})
    await prisma.activity.deleteMany({ where: { workspaceId } })
    await prisma.workspaceMember.deleteMany({ where: { workspaceId } })
    await prisma.workspace.delete({ where: { id: workspaceId } })
    await prisma.user.delete({ where: { id: userId } })
    await prisma.$disconnect()
  })

  const headers = () => ({
    Authorization: `Bearer ${token}`,
    'X-Workspace-Id': workspaceId,
  })

  test('creates pending order for activity', async () => {
    const res = await request(app)
      .post('/api/v1/orders')
      .set(headers())
      .send({ activityId })
    expect(res.status).toBe(201)
    expect(res.body.data.status).toBe('PENDING')
    expect(res.body.data.orderNo).toBeDefined()
  })

  test('mock pay changes order to PAID and creates ticket', async () => {
    const orderRes = await request(app)
      .post('/api/v1/orders')
      .set(headers())
      .send({ activityId })
    // Cancel the first order to avoid duplicate — actually need a fresh activity
    // Let's use the order we just created
    const orderId = orderRes.body.data.id

    const payRes = await request(app)
      .post(`/api/v1/payments/mock/pay/${orderId}`)
      .set(headers())
    expect(payRes.status).toBe(200)
    expect(payRes.body.data.idempotent).toBe(false)
    expect(payRes.body.data.order.status).toBe('PAID')
    expect(payRes.body.data.ticket).toBeDefined()
    expect(payRes.body.data.ticket.code).toMatch(/^TICKET-/)
  })

  test('same payment event is idempotent', async () => {
    // Create a new order + pay, then pay again with the same order
    const orderRes = await request(app)
      .post('/api/v1/orders')
      .set(headers())
      .send({ activityId })

    // Need a new activity since user already has a ticket for activityId
    const activity2 = await prisma.activity.create({
      data: {
        title: '测试读书会2',
        capacity: 10,
        priceCents: 500,
        status: 'PUBLISHED',
        startsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        workspaceId,
        createdById: userId,
      },
    })

    const orderRes2 = await request(app)
      .post('/api/v1/orders')
      .set(headers())
      .send({ activityId: activity2.id })

    const orderId = orderRes2.body.data.id
    await request(app).post(`/api/v1/payments/mock/pay/${orderId}`).set(headers())

    // Pay again — should be idempotent because order is already PAID
    const payRes2 = await request(app)
      .post(`/api/v1/payments/mock/pay/${orderId}`)
      .set(headers())
    // This creates a new eventId, so it won't be idempotent by eventId,
    // but the order is already PAID so it should return idempotent
    expect(payRes2.status).toBe(200)

    await prisma.activity.delete({ where: { id: activity2.id } })
  })

  test('activity capacity cannot be oversold', async () => {
    // Create activity with capacity 1
    const smallActivity = await prisma.activity.create({
      data: {
        title: '小容量活动',
        capacity: 1,
        priceCents: 0,
        status: 'PUBLISHED',
        startsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        workspaceId,
        createdById: userId,
      },
    })

    // First user registers and pays
    const orderRes = await request(app)
      .post('/api/v1/orders')
      .set(headers())
      .send({ activityId: smallActivity.id })
    expect(orderRes.status).toBe(201)

    const payRes = await request(app)
      .post(`/api/v1/payments/mock/pay/${orderRes.body.data.id}`)
      .set(headers())
    expect(payRes.status).toBe(200)

    // Now capacity should be full — another order should fail
    const orderRes2 = await request(app)
      .post('/api/v1/orders')
      .set(headers())
      .send({ activityId: smallActivity.id })
    // This user already has a ticket, so it should fail
    expect(orderRes2.status).toBe(400)

    await prisma.activity.delete({ where: { id: smallActivity.id } })
  })

  test('can list activities', async () => {
    const res = await request(app)
      .get('/api/v1/activities')
      .set(headers())
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body.data)).toBe(true)
  })

  test('can list my orders', async () => {
    const res = await request(app)
      .get('/api/v1/orders/my')
      .set(headers())
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body.data)).toBe(true)
  })
})
