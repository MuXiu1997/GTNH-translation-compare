import { describe, expect, it } from 'bun:test'
import { FiletypeScript, Languages } from '../../src/filetypes/index.ts'

const RELPATH = 'test/x/test.zs'
const CONTENT = [
  '// test',
  'val I18N_test_0 = "test";',
  'val I18N_test_1 = "test=test";',
  'val I18N_test_测试 = "测试";',
  'val I18N_test2=テスト2 = "テスト2";',
].join('\n')

describe('FiletypeScript', () => {
  const script = new FiletypeScript(RELPATH, CONTENT)

  it('should get relpath', () => {
    expect(script.relpath).toBe(RELPATH)
  })

  it('should get content', () => {
    expect(script.content).toBe(CONTENT)
  })

  it('should get properties', () => {
    expect(script.properties).toEqual({
      'script|I18N_test_0': {
        key: 'script|I18N_test_0',
        value: 'test',
        full: 'val I18N_test_0 = "test";',
        start: 27,
        end: 31,
      },
      'script|I18N_test_1': {
        key: 'script|I18N_test_1',
        value: 'test=test',
        full: 'val I18N_test_1 = "test=test";',
        start: 53,
        end: 62,
      },
      'script|I18N_test_测试': {
        key: 'script|I18N_test_测试',
        value: '测试',
        full: 'val I18N_test_测试 = "测试";',
        start: 85,
        end: 87,
      },
      'script|I18N_test2=テスト2': {
        key: 'script|I18N_test2=テスト2',
        value: 'テスト2',
        full: 'val I18N_test2=テスト2 = "テスト2";',
        start: 113,
        end: 117,
      },
    })
  })

  it('should get en_US relpath', () => {
    expect(script.getEnUsRelpath()).toBe(RELPATH)
  })

  it('should get target language relpath', () => {
    expect(script.getTargetLanguageRelpath(Languages.zh_CN)).toBe(RELPATH)
  })
})
