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

  // 创建 20 本书（中文书名 + 阅读氛围场景图）
  const bookSeeds = [
    { title: '寂静的春天', author: '蕾切尔·卡逊', cat: 0, status: BookStatus.FINISHED, pages: 368, cover: 'https://images.unsplash.com/photo-1507842217343-583bb7270b66?w=400&h=560&fit=crop' },
    { title: '瓦尔登湖', author: '亨利·梭罗', cat: 1, status: BookStatus.READING, pages: 312, cover: 'https://images.unsplash.com/photo-1476234251651-f353703a034d?w=400&h=560&fit=crop' },
    { title: '挪威的森林', author: '村上春树', cat: 1, status: BookStatus.OWNED, pages: 384, cover: 'https://images.unsplash.com/photo-1521587760476-6c12a4b040da?w=400&h=560&fit=crop' },
    { title: '雪国', author: '川端康成', cat: 1, status: BookStatus.WISHLIST, pages: 184, cover: 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=400&h=560&fit=crop' },
    { title: '三体', author: '刘慈欣', cat: 0, status: BookStatus.FINISHED, pages: 302, cover: 'https://images.unsplash.com/photo-1495446815901-a7297e633e8d?w=400&h=560&fit=crop' },
    { title: '银河帝国', author: '艾萨克·阿西莫夫', cat: 0, status: BookStatus.READING, pages: 268, cover: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=400&h=560&fit=crop' },
    { title: '黑客与画家', author: '保罗·格雷厄姆', cat: 2, status: BookStatus.OWNED, pages: 264, cover: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=400&h=560&fit=crop' },
    { title: '代码大全', author: '史蒂夫·麦康奈尔', cat: 2, status: BookStatus.FINISHED, pages: 960, cover: 'https://images.unsplash.com/photo-1509021436665-8f07dbf5bf1d?w=400&h=560&fit=crop' },
    { title: '设计模式', author: 'GoF', cat: 2, status: BookStatus.WISHLIST, pages: 416, cover: 'https://images.unsplash.com/photo-1471107340929-a87cd0f5b5f3?w=400&h=560&fit=crop' },
    { title: '人类简史', author: '尤瓦尔·赫拉利', cat: 3, status: BookStatus.READING, pages: 440, cover: 'https://images.unsplash.com/photo-1524578271613-d550eacf6090?w=400&h=560&fit=crop' },
    { title: '万历十五年', author: '黄仁宇', cat: 3, status: BookStatus.OWNED, pages: 320, cover: 'https://images.unsplash.com/photo-1521737711867-e3b97375f902?w=400&h=560&fit=crop' },
    { title: '枪炮、病菌与钢铁', author: '贾雷德·戴蒙德', cat: 3, status: BookStatus.FINISHED, pages: 528, cover: 'https://images.unsplash.com/photo-1519682577862-22b62b24e493?w=400&h=560&fit=crop' },
    { title: '苏菲的世界', author: '乔斯坦·贾德', cat: 4, status: BookStatus.OWNED, pages: 535, cover: 'https://images.unsplash.com/photo-1477346611705-65d1883cee1e?w=400&h=560&fit=crop' },
    { title: '存在与时间', author: '马丁·海德格尔', cat: 4, status: BookStatus.WISHLIST, pages: 487, cover: 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=400&h=560&fit=crop' },
    { title: '月亮与六便士', author: '毛姆', cat: 1, status: BookStatus.READING, pages: 272, cover: 'https://images.unsplash.com/photo-1506880018603-83d5b814b5a6?w=400&h=560&fit=crop' },
    { title: '百年孤独', author: '加西亚·马尔克斯', cat: 1, status: BookStatus.FINISHED, pages: 360, cover: 'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?w=400&h=560&fit=crop' },
    { title: '深度学习', author: 'Ian Goodfellow', cat: 2, status: BookStatus.READING, pages: 800, cover: 'https://images.unsplash.com/photo-1532012197267-da84d127e765?w=400&h=560&fit=crop' },
    { title: '沙丘', author: '弗兰克·赫伯特', cat: 0, status: BookStatus.OWNED, pages: 412, cover: 'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?w=400&h=560&fit=crop' },
    { title: '禅与摩托车维修艺术', author: '罗伯特·波西格', cat: 4, status: BookStatus.FINISHED, pages: 430, cover: 'https://images.unsplash.com/photo-1519791883288-dc8bd696e667?w=400&h=560&fit=crop' },
    { title: '国富论', author: '亚当·斯密', cat: 3, status: BookStatus.WISHLIST, pages: 1152, cover: 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=400&h=560&fit=crop' },
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

  // ===== Reading Behavior Seed Data =====
  console.log('🌱 Seeding reading behavior data...')

  // Get all workspace members for reading goals
  const members = await prisma.workspaceMember.findMany({
    where: { workspaceId: workspace.id },
  })

  // Create reading goals for all members
  for (const member of members) {
    await prisma.readingGoal.upsert({
      where: { userId_workspaceId: { userId: member.userId, workspaceId: member.workspaceId } },
      update: {},
      create: {
        userId: member.userId,
        workspaceId: member.workspaceId,
        dailyGoalMinutes: 30,
      },
    })
  }

  // Get books for first workspace
  const readingBooks = await prisma.book.findMany({
    where: { workspaceId: workspace.id },
    take: 5,
  })

  // Create sample reading sessions for the past 7 days
  const now = new Date()

  for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
    const day = new Date(now)
    day.setDate(day.getDate() - dayOffset)
    day.setHours(0, 0, 0, 0)

    // Each day: 1-3 sessions on random books
    const sessionsCount = dayOffset === 0 ? 1 : Math.floor(Math.random() * 3) + 1
    for (let s = 0; s < sessionsCount && s < readingBooks.length; s++) {
      const book = readingBooks[s]
      const duration = Math.floor(Math.random() * 40) + 10 // 10-50 min
      const startTime = new Date(day)
      startTime.setHours(8 + s * 4, Math.floor(Math.random() * 30))

      await prisma.readingSession.create({
        data: {
          userId: user.id,
          bookId: book.id,
          workspaceId: workspace.id,
          startTime,
          endTime: new Date(startTime.getTime() + duration * 60000),
          durationMinutes: duration,
        },
      })
    }

    // Upsert daily summary
    const dayStart = new Date(day)
    const dayEnd = new Date(day.getTime() + 86400000)
    const daySessions = await prisma.readingSession.findMany({
      where: {
        userId: user.id,
        workspaceId: workspace.id,
        startTime: { gte: dayStart, lt: dayEnd },
      },
    })
    const totalMin = daySessions.reduce((sum: number, s: any) => sum + s.durationMinutes, 0)
    const bookIds = [...new Set(daySessions.map((s: any) => s.bookId))]

    const yesterday = new Date(day)
    yesterday.setDate(yesterday.getDate() - 1)
    const yesterdaySummary = await prisma.dailyReadingSummary.findUnique({
      where: { userId_workspaceId_date: { userId: user.id, workspaceId: workspace.id, date: yesterday } },
    })

    await prisma.dailyReadingSummary.upsert({
      where: { userId_workspaceId_date: { userId: user.id, workspaceId: workspace.id, date: day } },
      update: {},
      create: {
        userId: user.id,
        workspaceId: workspace.id,
        date: day,
        totalMinutes: totalMin,
        streakDays: yesterdaySummary ? yesterdaySummary.streakDays + 1 : 1,
        goalMet: totalMin >= 30,
        bookCount: bookIds.length,
      },
    })
  }

  // Update some books with reading progress
  for (const book of readingBooks.slice(0, 3)) {
    await prisma.book.update({
      where: { id: book.id },
      data: {
        readingProgress: Math.floor(Math.random() * 80) + 10,
        totalReadingMinutes: Math.floor(Math.random() * 200) + 30,
        lastReadAt: new Date(),
      },
    })
  }

  console.log('Seed data created successfully!')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
