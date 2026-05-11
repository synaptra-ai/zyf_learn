import dotenv from 'dotenv'
dotenv.config()

import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../src/generated/prisma/client'
import bcrypt from 'bcrypt'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

async function main() {
  await prisma.review.deleteMany()
  await prisma.book.deleteMany()
  await prisma.category.deleteMany()
  await prisma.user.deleteMany()

  const passwordHash = await bcrypt.hash('password123', 10)

  const userA = await prisma.user.create({
    data: {
      email: 'e2e-a@booknest.com',
      passwordHash,
      name: 'E2E User A',
    },
  })

  const userB = await prisma.user.create({
    data: {
      email: 'e2e-b@booknest.com',
      passwordHash,
      name: 'E2E User B',
    },
  })

  const category = await prisma.category.create({
    data: {
      name: '技术',
      color: '#3B82F6',
      userId: userA.id,
    },
  })

  await prisma.book.create({
    data: {
      title: 'E2E Seed Book',
      author: 'BookNest Tester',
      status: 'READING',
      pageCount: 300,
      categoryId: category.id,
      userId: userA.id,
    },
  })

  await prisma.book.create({
    data: {
      title: 'Private Book B',
      author: 'Another User',
      status: 'OWNED',
      userId: userB.id,
    },
  })

  console.log('E2E seed completed')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
