import dotenv from 'dotenv'
dotenv.config()

import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient, BookStatus } from '../src/generated/prisma/client'
import { faker } from '@faker-js/faker'
import bcrypt from 'bcrypt'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

async function main() {
  // 清空数据 (按外键依赖顺序)
  await prisma.review.deleteMany()
  await prisma.book.deleteMany()
  await prisma.category.deleteMany()
  await prisma.user.deleteMany()

  // 创建测试用户 (密码: password123)
  const passwordHash = await bcrypt.hash('password123', 10)
  const user = await prisma.user.create({
    data: { email: 'test@booknest.com', passwordHash, name: '测试用户' },
  })

  // 创建分类
  const categories = await Promise.all([
    prisma.category.create({ data: { name: '科幻', color: '#3B82F6', userId: user.id } }),
    prisma.category.create({ data: { name: '文学', color: '#EF4444', userId: user.id } }),
    prisma.category.create({ data: { name: '技术', color: '#10B981', userId: user.id } }),
    prisma.category.create({ data: { name: '历史', color: '#F59E0B', userId: user.id } }),
    prisma.category.create({ data: { name: '哲学', color: '#8B5CF6', userId: user.id } }),
  ])

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
      },
    })

    // 每本书随机 0-3 条评论
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
