import winston from 'winston'
import DailyRotateFile from 'winston-daily-rotate-file'

const isDev = process.env.NODE_ENV !== 'production'

const transports: winston.transport[] = [new winston.transports.Console()]

if (!isDev) {
  transports.push(
    new DailyRotateFile({
      filename: 'logs/application-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxFiles: '14d',
    }),
  )
}

export const logger = winston.createLogger({
  level: isDev ? 'debug' : 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    isDev
      ? winston.format.combine(winston.format.colorize(), winston.format.simple())
      : winston.format.json(),
  ),
  defaultMeta: { service: 'booknest-api' },
  transports,
})
