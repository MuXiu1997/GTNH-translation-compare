import { describe, expect, it } from 'bun:test'
import { toUnicode } from '~/utils/unicode.ts'

describe('unicode utils', () => {
  it('should convert to unicode', () => {
    expect(toUnicode('foo')).toBe('\\u0066\\u006f\\u006f')
    expect(toUnicode('foo bar')).toBe('\\u0066\\u006f\\u006f\\u0020\\u0062\\u0061\\u0072')
    expect(toUnicode('foo bar baz')).toBe('\\u0066\\u006f\\u006f\\u0020\\u0062\\u0061\\u0072\\u0020\\u0062\\u0061\\u007a')
    expect(toUnicode('张三')).toBe('\\u5f20\\u4e09')
    expect(toUnicode('张三 李四')).toBe('\\u5f20\\u4e09\\u0020\\u674e\\u56db')
    expect(toUnicode('张三 李四 王五')).toBe('\\u5f20\\u4e09\\u0020\\u674e\\u56db\\u0020\\u738b\\u4e94')
    expect(toUnicode('foo\nbar')).toBe('\\u0066\\u006f\\u006f\\u000a\\u0062\\u0061\\u0072')
    expect(toUnicode('🚀')).toBe('\\ud83d\\ude80')
    expect(toUnicode('hello world, 你好世界')).toBe(
      '\\u0068\\u0065\\u006c\\u006c\\u006f'
      + '\\u0020'
      + '\\u0077\\u006f\\u0072\\u006c\\u0064\\'
      + 'u002c\\u0020'
      + '\\u4f60\\u597d\\u4e16\\u754c',
    )
  })
})
