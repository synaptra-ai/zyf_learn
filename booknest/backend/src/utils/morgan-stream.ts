import { logger } from './logger'
import type { StreamOptions } from 'morgan'

export const morganStream: StreamOptions = {
  write: (message: string) => {
    logger.http(message.trim())
  },
}
