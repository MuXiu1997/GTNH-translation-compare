import { describe, expect, it } from 'bun:test'
import { ensureLf, replaceIllegalCharacters } from '../../src/utils/file.ts'

describe('file utils', () => {
  it('should replace illegal characters', () => {
    expect(replaceIllegalCharacters('foo')).toBe('foo')
    expect(replaceIllegalCharacters('foo/bar')).toBe('foo_bar')
    expect(replaceIllegalCharacters('foo\\bar')).toBe('foo_bar')
    expect(replaceIllegalCharacters('foo:bar')).toBe('foo_bar')
    expect(replaceIllegalCharacters('foo<bar')).toBe('foo_bar')
    expect(replaceIllegalCharacters('foo>bar')).toBe('foo_bar')
    expect(replaceIllegalCharacters('foo"bar')).toBe('foo_bar')
    expect(replaceIllegalCharacters('foo|bar')).toBe('foo_bar')
    expect(replaceIllegalCharacters('foo?bar')).toBe('foo_bar')
    expect(replaceIllegalCharacters('foo*bar')).toBe('foo_bar')
  })

  it('should ensure LF', () => {
    expect(ensureLf('foo')).toBe('foo')
    expect(ensureLf('foo\r\nbar')).toBe('foo\nbar')
    expect(ensureLf('foo\rbar')).toBe('foo\nbar')
  })
})
