import express from 'express'
import path from 'path'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import morgan from 'morgan'
import swaggerUi from 'swagger-ui-express'
import { errorHandler } from './middleware/errorHandler'
import routes from './routes'
import { morganStream } from './utils/morgan-stream'
import { generateOpenApiDocument } from './lib/openapi'

const app = express()

app.use(helmet())
const corsOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',')
  : '*'

app.use(cors({ origin: corsOrigins }))

app.use(morgan(':method :url :status :res[content-length] - :response-time ms', { stream: morganStream }))

app.use(express.json())
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 100, skip: () => process.env.NODE_ENV === 'test', message: { code: 429, message: '请求过于频繁，请稍后再试' } }))

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

app.get('/health/detailed', async (_req, res) => {
  const checks: Record<string, { status: string; responseTime?: string; error?: string }> = {}

  try {
    const start = Date.now()
    const { PrismaClient } = await import('./generated/prisma/client')
    const { PrismaPg } = await import('@prisma/adapter-pg')
    const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
    const prisma = new PrismaClient({ adapter })
    await prisma.$queryRaw`SELECT 1`
    await prisma.$disconnect()
    checks.database = { status: 'ok', responseTime: `${Date.now() - start}ms` }
  } catch (err: any) {
    checks.database = { status: 'error', error: err.message }
  }

  try {
    const start = Date.now()
    const { default: redis } = await import('./lib/redis')
    await redis.ping()
    checks.redis = { status: 'ok', responseTime: `${Date.now() - start}ms` }
  } catch (err: any) {
    checks.redis = { status: 'error', error: err.message }
  }

  const allOk = Object.values(checks).every((c) => c.status === 'ok')

  res.status(allOk ? 200 : 503).json({
    status: allOk ? 'ok' : 'degraded',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    checks,
  })
})

app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')))

const openApiDocument = generateOpenApiDocument()
app.get('/openapi.json', (_req, res) => res.json(openApiDocument))
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(openApiDocument))

app.use('/api/v1', routes)

app.use(errorHandler)

export default app
