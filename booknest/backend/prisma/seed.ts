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

  // 创建 20 本书（中文书名 + 冷色自然封面）
  const bookSeeds = [
    { title: '寂静的春天', author: '蕾切尔·卡逊', cat: 0, status: BookStatus.FINISHED, pages: 368, cover: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=400&h=560&fit=crop' },
    { title: '瓦尔登湖', author: '亨利·梭罗', cat: 1, status: BookStatus.READING, pages: 312, cover: 'https://images.unsplash.com/photo-1439066615861-d1af74d74000?w=400&h=560&fit=crop' },
    { title: '挪威的森林', author: '村上春树', cat: 1, status: BookStatus.OWNED, pages: 384, cover: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=400&h=560&fit=crop' },
    { title: '雪国', author: '川端康成', cat: 1, status: BookStatus.WISHLIST, pages: 184, cover: 'https://images.unsplash.com/photo-1491002052546-bf38f186af56?w=400&h=560&fit=crop' },
    { title: '三体', author: '刘慈欣', cat: 0, status: BookStatus.FINISHED, pages: 302, cover: 'https://images.unsplash.com/photo-1462331940025-496dfbfc7564?w=400&h=560&fit=crop' },
    { title: '银河帝国', author: '艾萨克·阿西莫夫', cat: 0, status: BookStatus.READING, pages: 268, cover: 'https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?w=400&h=560&fit=crop' },
    { title: '黑客与画家', author: '保罗·格雷厄姆', cat: 2, status: BookStatus.OWNED, pages: 264, cover: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=560&fit=crop' },
    { title: '代码大全', author: '史蒂夫·麦康奈尔', cat: 2, status: BookStatus.FINISHED, pages: 960, cover: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=400&h=560&fit=crop' },
    { title: '设计模式', author: 'GoF', cat: 2, status: BookStatus.WISHLIST, pages: 416, cover: 'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=400&h=560&fit=crop' },
    { title: '人类简史', author: '尤瓦尔·赫拉利', cat: 3, status: BookStatus.READING, pages: 440, cover: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=400&h=560&fit=crop' },
    { title: '万历十五年', author: '黄仁宇', cat: 3, status: BookStatus.OWNED, pages: 320, cover: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=400&h=560&fit=crop' },
    { title: '枪炮、病菌与钢铁', author: '贾雷德·戴蒙德', cat: 3, status: BookStatus.FINISHED, pages: 528, cover: 'https://images.unsplash.com/photo-1472214103451-9374bd1c798e?w=400&h=560&fit=crop' },
    { title: '苏菲的世界', author: '乔斯坦·贾德', cat: 4, status: BookStatus.OWNED, pages: 535, cover: 'https://images.unsplash.com/photo-1500534314263-a834e46e13c7?w=400&h=560&fit=crop' },
    { title: '存在与时间', author: '马丁·海德格尔', cat: 4, status: BookStatus.WISHLIST, pages: 487, cover: 'https://images.unsplash.com/photo-1507400492013-162706c8c05e?w=400&h=560&fit=crop' },
    { title: '月亮与六便士', author: '毛姆', cat: 1, status: BookStatus.READING, pages: 272, cover: 'https://images.unsplash.com/photo-1532693322450-2f6e2a07a5e2?w=400&h=560&fit=crop' },
    { title: '百年孤独', author: '加西亚·马尔克斯', cat: 1, status: BookStatus.FINISHED, pages: 360, cover: 'https://images.unsplash.com/photo-1500534623283-312aade485b7?w=400&h=560&fit=crop' },
    { title: '深度学习', author: 'Ian Goodfellow', cat: 2, status: BookStatus.READING, pages: 800, cover: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=400&h=560&fit=crop' },
    { title: '沙丘', author: '弗兰克·赫伯特', cat: 0, status: BookStatus.OWNED, pages: 412, cover: 'https://images.unsplash.com/photo-1509316785289-025f5b846b35?w=400&h=560&fit=crop' },
    { title: '禅与摩托车维修艺术', author: '罗伯特·波西格', cat: 4, status: BookStatus.FINISHED, pages: 430, cover: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=400&h=560&fit=crop' },
    { title: '国富论', author: '亚当·斯密', cat: 3, status: BookStatus.WISHLIST, pages: 1152, cover: 'https://images.unsplash.com/photo-1475924156734-496f6cac6ec1?w=400&h=560&fit=crop' },
  ]

  for (const seed of bookSeeds) {
    const book = await prisma.book.create({
      data: {
        title: seed.title,
        author: seed.author,
        pageCount: seed.pages,
        status: seed.status,
        coverUrl: seed.cover,
        categoryId: categories[seed.cat].id,
        userId: user.id,
        workspaceId: workspace.id,
      },
    })

    const reviewCount = faker.number.int({ min: 0, max: 2 })
    for (let j = 0; j < reviewCount; j++) {
      await prisma.review.create({
        data: {
          rating: faker.number.int({ min: 3, max: 5 }),
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
