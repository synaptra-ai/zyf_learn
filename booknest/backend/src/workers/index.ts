import dotenv from 'dotenv'
dotenv.config()

import { logger } from '@/utils/logger'
import { Worker, queueConnection } from '@/lib/queue'
import { handleExpireOrderJob } from './order.worker'
import { handleBookImportJob } from './import.worker'

new Worker(
  'order',
  async (job) => {
    if (job.name === 'expire-order') {
      await handleExpireOrderJob(job.data)
    }
  },
  { connection: queueConnection },
)

new Worker(
  'import',
  async (job) => {
    if (job.name === 'book-import') {
      await handleBookImportJob(job.data)
    }
  },
  { connection: queueConnection },
)

logger.info('BullMQ workers started')
