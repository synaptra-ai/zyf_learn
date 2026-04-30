import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import { errorHandler } from './middleware/errorHandler'
import routes from './routes'

const app = express()

app.use(helmet())
app.use(cors())
app.use(express.json())

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

app.use('/api/v1', routes)

app.use(errorHandler)

export default app
