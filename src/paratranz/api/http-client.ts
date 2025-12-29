import type { AxiosError } from 'axios'
import type { AxiosCacheInstance } from 'axios-cache-interceptor'
import axios from 'axios'
import { setupCache } from 'axios-cache-interceptor'
import axiosRetry from 'axios-retry'
import chalk from 'chalk'
import { get } from 'lodash-es'
import { log } from '~/log'
import { buildSQLiteCacheStorage } from './sqlite-cache-storage.ts'

const axiosRetryLog = log.withTag('axios-retry')

function getRequestInfo(error: AxiosError) {
  const method = get(error, 'config.method', 'unknown').toUpperCase()
  const url = get(error, 'config.url', 'unknown')
  return { method, url }
}

function logRetryDelay(error: AxiosError, delay: number, retryCount: number) {
  const { method, url } = getRequestInfo(error)
  let message = ''
  message += chalk.cyan.bold(`[${method}]`)
  message += ' '
  message += chalk.blue.underline(url)
  message += ' - '
  message += 'Calculated delay: '
  message += chalk.yellow(`${delay.toFixed(2)}ms`)
  message += ' for retry #'
  message += chalk.green(retryCount)
  axiosRetryLog.debug(message)
}

function logRetry(error: AxiosError, retryCount: number, retries: number) {
  const { method, url } = getRequestInfo(error)
  const retryAfter = get(error, 'response.headers.retry-after', undefined)
  let message = ''
  message += chalk.cyan.bold(`[${method}]`)
  message += ' '
  message += chalk.blue.underline(url)
  message += ' - '
  message += 'Retrying request ('
  message += chalk.green(`${retryCount}/${retries}`)
  message += ') due to '
  message += chalk.red(error.message)
  if (retryAfter) {
    message += ', Retry-After: '
    message += chalk.yellow(retryAfter)
  }
  axiosRetryLog.warn(message)
}

export function createHttpClient(token: string, cacheDir: string): AxiosCacheInstance {
  const retries = 100

  const baseClient = axios.create({
    baseURL: 'https://paratranz.cn/api',
    headers: { Authorization: token },
    timeout: 0,
  })

  const cacheClient = setupCache(baseClient, {
    storage: buildSQLiteCacheStorage(cacheDir),
  })

  axiosRetry(cacheClient, {
    retries,
    retryDelay: (retryCount, error) => {
      const delay = axiosRetry.exponentialDelay(retryCount, error)
      logRetryDelay(error, delay, retryCount)
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
      logRetry(error, retryCount, retries)
    },
  })

  return cacheClient
}
