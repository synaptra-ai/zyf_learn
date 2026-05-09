import express from 'express'
import path from 'path'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import morgan from 'morgan'
import { errorHandler } from './middleware/errorHandler'
import routes from './routes'
import { morganStream } from './utils/morgan-stream'

const app = express()

app.use(helmet())
const corsOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',')
  : '*'

app.use(cors({ origin: corsOrigins }))

app.use(morgan(':method :url :status :res[content-length] - :response-time ms', { stream: morganStream }))

app.use(express.json())
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 100, message: { code: 429, message: '请求过于频繁，请稍后再试' } }))

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')))

app.use('/api/v1', routes)

app.use(errorHandler)

export default app
