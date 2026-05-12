import dayjs from 'dayjs'

const getTimestamp = () => dayjs().format('YYYY-MM-DD HH:mm:ss')

export const logger = {
  info: (message: string, meta?: unknown) => {
    console.log(`[INFO] [${getTimestamp()}] ${message}`)
    if (meta) console.dir(meta, { depth: null, colors: true })
  },

  // [추가] 경고 로그 (warn)
  warn: (message: string, meta?: unknown) => {
    console.warn(`[WARN] [${getTimestamp()}] ${message}`)
    if (meta) console.dir(meta, { depth: null, colors: true })
  },

  error: (message: string, meta?: unknown) => {
    console.error(`[ERROR] [${getTimestamp()}] ${message}`)
    if (meta) console.dir(meta, { depth: null, colors: true })
  },

  debug: (message: string, meta?: unknown) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[DEBUG] [${getTimestamp()}] ${message}`)
      if (meta) console.dir(meta, { depth: null, colors: true })
    }
  },
}
