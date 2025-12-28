import type { AxiosCacheInstance } from 'axios-cache-interceptor'
import axios from 'axios'
import { setupCache } from 'axios-cache-interceptor'
import axiosRetry from 'axios-retry'
import { consola } from 'consola'
import { buildSQLiteCacheStorage } from './sqlite-cache-storage.ts'

export function createHttpClient(token: string, cacheDir: string): AxiosCacheInstance {
  const baseClient = axios.create({
    baseURL: 'https://paratranz.cn/api',
    headers: { Authorization: token },
    timeout: 0,
  })

  const cacheClient = setupCache(baseClient, {
    storage: buildSQLiteCacheStorage(cacheDir),
  })

  axiosRetry(cacheClient, {
    retries: 100,
    retryDelay: (retryCount, error) => {
      const delay = axiosRetry.exponentialDelay(retryCount, error)
      consola.info(`[axios-retry] Calculated delay: ${delay}ms for retry #${retryCount}`)
      return delay
    },
    retryCondition: (error) => {
      return (
        axiosRetry.isNetworkOrIdempotentRequestError(error)
        || error.response?.status === 429
        || (typeof error.response?.status === 'number' && error.response.status >= 500)
      )
    },
    onRetry: (retryCount, error) => {
      const retryAfter = error.response?.headers['retry-after']
      consola.warn(`[axios-retry] Retrying request (${retryCount}/100) due to ${error.message}${retryAfter ? `. Retry-After: ${retryAfter}` : ''}`)
    },
  })

  return cacheClient
}

