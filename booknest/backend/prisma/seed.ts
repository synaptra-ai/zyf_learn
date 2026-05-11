import dotenv from 'dotenv'
dotenv.config()

import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient, BookStatus } from '../src/generated/prisma/client'
import { faker } from '@faker-js/faker'
import bcrypt from 'bcrypt'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

async function main() {
  await prisma.review.deleteMany()
  await prisma.book.deleteMany()
  await prisma.invitation.deleteMany()
  await prisma.auditLog.deleteMany()
  await prisma.workspaceMember.deleteMany()
  await prisma.workspace.deleteMany()
  await prisma.category.deleteMany()
  await prisma.user.deleteMany()

  const passwordHash = await bcrypt.hash('password123', 10)

  // 创建测试用户
  const user = await prisma.user.create({
    data: { email: 'test@booknest.com', passwordHash, name: '测试用户' },
  })

  const e2eUserA = await prisma.user.create({
    data: { email: 'e2e-a@booknest.com', passwordHash, name: 'E2E User A' },
  })
  const e2eUserB = await prisma.user.create({
    data: { email: 'e2e-b@booknest.com', passwordHash, name: 'E2E User B' },
  })

  // 为每个用户创建默认 Workspace
  const workspace = await prisma.workspace.create({
    data: {
      name: `${user.name} 的个人书架`,
      members: { create: { userId: user.id, role: 'OWNER' } },
    },
  })

  const e2eWorkspaceA = await prisma.workspace.create({
    data: {
      name: `${e2eUserA.name} 的个人书架`,
      members: { create: { userId: e2eUserA.id, role: 'OWNER' } },
    },
  })

  await prisma.workspace.create({
    data: {
      name: `${e2eUserB.name} 的个人书架`,
      members: { create: { userId: e2eUserB.id, role: 'OWNER' } },
    },
  })

  // 创建分类
  const categories = await Promise.all([
    prisma.category.create({ data: { name: '科幻', color: '#3B82F6', userId: user.id, workspaceId: workspace.id } }),
    prisma.category.create({ data: { name: '文学', color: '#EF4444', userId: user.id, workspaceId: workspace.id } }),
    prisma.category.create({ data: { name: '技术', color: '#10B981', userId: user.id, workspaceId: workspace.id } }),
    prisma.category.create({ data: { name: '历史', color: '#F59E0B', userId: user.id, workspaceId: workspace.id } }),
    prisma.category.create({ data: { name: '哲学', color: '#8B5CF6', userId: user.id, workspaceId: workspace.id } }),
  ])

  // E2E 用户 A 的分类和书籍
  const e2eCategory = await prisma.category.create({ data: { name: '技术', color: '#3B82F6', userId: e2eUserA.id, workspaceId: e2eWorkspaceA.id } })
  await prisma.book.create({
    data: {
      title: 'E2E Seed Book',
      author: 'BookNest Tester',
      status: BookStatus.READING,
      pageCount: 300,
      categoryId: e2eCategory.id,
      userId: e2eUserA.id,
      workspaceId: e2eWorkspaceA.id,
    },
  })

  // E2E 用户 B 的私有书籍
  const e2eWorkspaceB = await prisma.workspace.findFirst({ where: { members: { some: { userId: e2eUserB.id } } } })
  await prisma.book.create({
    data: {
      title: 'Private Book B',
      author: 'Another User',
      status: BookStatus.OWNED,
      userId: e2eUserB.id,
      workspaceId: e2eWorkspaceB!.id,
    },
  })

  // 创建 25 本书
  const statuses = [BookStatus.OWNED, BookStatus.READING, BookStatus.FINISHED, BookStatus.WISHLIST]
  for (let i = 0; i < 25; i++) {
    const book = await prisma.book.create({
      data: {
        title: faker.lorem.words(3),
        author: faker.person.fullName(),
        isbn: faker.string.numeric(13),
        pageCount: faker.number.int({ min: 100, max: 800 }),
        description: faker.lorem.paragraph(),
        status: statuses[faker.number.int({ min: 0, max: 3 })],
        categoryId: categories[faker.number.int({ min: 0, max: 4 })].id,
        userId: user.id,
        workspaceId: workspace.id,
      },
    })

    const reviewCount = faker.number.int({ min: 0, max: 3 })
    for (let j = 0; j < reviewCount; j++) {
      await prisma.review.create({
        data: {
          rating: faker.number.int({ min: 1, max: 5 }),
          text: faker.lorem.sentences(2),
          bookId: book.id,
          userId: user.id,
        },
      })
    }
  }

  console.log('Seed data created successfully!')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
