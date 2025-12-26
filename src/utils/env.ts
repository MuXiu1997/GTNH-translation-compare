import { env } from 'node:process'

/**
 * Get an environment variable, or raise an exception if it is not set.
 * @param key The environment variable key
 * @returns The environment variable value
 */
export function mustGetEnv(key: string): string {
  const value = env[key]
  if (!value) {
    throw new Error(`Missing environment variable: ${key}`)
  }
  return value
}
