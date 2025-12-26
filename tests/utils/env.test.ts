import { describe, expect, it } from 'bun:test'
import { mustGetEnv } from '../../src/utils/env.ts'

describe('mustGetEnv', () => {
  it('should get environment variable', () => {
    process.env.__TEST_VALUE = 'test'
    expect(mustGetEnv('__TEST_VALUE')).toBe('test')
  })

  it('should throw error for empty environment variable', () => {
    process.env.__TEST_Empty = ''
    expect(() => mustGetEnv('__TEST_Empty')).toThrow('Missing environment variable: __TEST_Empty')
  })

  it('should throw error for non-existent environment variable', () => {
    delete process.env.__TEST_None
    expect(() => mustGetEnv('__TEST_None')).toThrow('Missing environment variable: __TEST_None')
  })
})
