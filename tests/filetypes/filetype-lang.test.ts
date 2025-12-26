import { describe, expect, it } from 'bun:test'
import { FiletypeLang, Languages } from '~/filetypes/index.ts'

const EN_US_RELPATH = 'test/x/en_US.lang'
const EN_US_CONTENT = [
  '#test',
  'test=test',
  '',
  'test2=test2=test2',
  'test3',
].join('\n')

const ZH_CN_RELPATH = 'test/x/zh_CN.lang'
const ZH_CN_CONTENT = [
  '#test',
  'test=测试',
  '',
  'test2=测试2=测试2',
  'test3',
].join('\n')

const JA_JP_RELPATH = 'test/x/ja_JP.lang'
const JA_JP_CONTENT = [
  '#test',
  'test=テスト',
  '',
  'test2=テスト2=テスト2',
  'test3',
].join('\n')

const KO_KR_RELPATH = 'test/x/ko_KR.lang'
const KO_KR_CONTENT = [
  '#test',
  'test=테스트',
  '',
  'test2=테스트2=테스트2',
  'test3',
].join('\n')

const PT_BR_RELPATH = 'test/x/pt_BR.lang'
const PT_BR_CONTENT = [
  '#test',
  'test=teste',
  '',
  'test2=teste2=teste2',
  'test3',
].join('\n')

describe('FiletypeLang', () => {
  const enUs = new FiletypeLang(EN_US_RELPATH, EN_US_CONTENT)
  const zhCn = new FiletypeLang(ZH_CN_RELPATH, ZH_CN_CONTENT, Languages.zh_CN)
  const jaJp = new FiletypeLang(JA_JP_RELPATH, JA_JP_CONTENT, Languages.ja_JP)
  const koKr = new FiletypeLang(KO_KR_RELPATH, KO_KR_CONTENT, Languages.ko_KR)
  const ptBr = new FiletypeLang(PT_BR_RELPATH, PT_BR_CONTENT, Languages.pt_BR)

  it('should get relpath', () => {
    expect(enUs.relpath).toBe(EN_US_RELPATH)
    expect(zhCn.relpath).toBe(ZH_CN_RELPATH)
    expect(jaJp.relpath).toBe(JA_JP_RELPATH)
    expect(koKr.relpath).toBe(KO_KR_RELPATH)
    expect(ptBr.relpath).toBe(PT_BR_RELPATH)
  })

  it('should get content', () => {
    expect(enUs.content).toBe(EN_US_CONTENT)
    expect(zhCn.content).toBe(ZH_CN_CONTENT)
    expect(jaJp.content).toBe(JA_JP_CONTENT)
    expect(koKr.content).toBe(KO_KR_CONTENT)
    expect(ptBr.content).toBe(PT_BR_CONTENT)
  })

  it('should get properties', () => {
    expect(enUs.properties).toEqual({
      'lang|test': { key: 'lang|test', value: 'test', full: 'test=test', start: 11, end: 15 },
      'lang|test2': { key: 'lang|test2', value: 'test2=test2', full: 'test2=test2=test2', start: 23, end: 34 },
    })
    expect(zhCn.properties).toEqual({
      'lang|test': { key: 'lang|test', value: '测试', full: 'test=测试', start: 11, end: 13 },
      'lang|test2': { key: 'lang|test2', value: '测试2=测试2', full: 'test2=测试2=测试2', start: 21, end: 28 },
    })
    expect(jaJp.properties).toEqual({
      'lang|test': { key: 'lang|test', value: 'テスト', full: 'test=テスト', start: 11, end: 14 },
      'lang|test2': { key: 'lang|test2', value: 'テスト2=テスト2', full: 'test2=テスト2=テスト2', start: 22, end: 31 },
    })
    expect(koKr.properties).toEqual({
      'lang|test': { key: 'lang|test', value: '테스트', full: 'test=테스트', start: 11, end: 14 },
      'lang|test2': { key: 'lang|test2', value: '테스트2=테스트2', full: 'test2=테스트2=테스트2', start: 22, end: 31 },
    })
    expect(ptBr.properties).toEqual({
      'lang|test': { key: 'lang|test', value: 'teste', full: 'test=teste', start: 11, end: 16 },
      'lang|test2': { key: 'lang|test2', value: 'teste2=teste2', full: 'test2=teste2=teste2', start: 24, end: 37 },
    })
  })

  it('should get en_US relpath', () => {
    expect(enUs.getEnUsRelpath()).toBe(EN_US_RELPATH)
    expect(zhCn.getEnUsRelpath()).toBe(EN_US_RELPATH)
    expect(jaJp.getEnUsRelpath()).toBe(EN_US_RELPATH)
    expect(koKr.getEnUsRelpath()).toBe(EN_US_RELPATH)
    expect(ptBr.getEnUsRelpath()).toBe(EN_US_RELPATH)
  })

  it('should get target language relpath', () => {
    expect(enUs.getTargetLanguageRelpath(Languages.zh_CN)).toBe(ZH_CN_RELPATH)
    expect(zhCn.getTargetLanguageRelpath(Languages.ja_JP)).toBe(JA_JP_RELPATH)
    expect(jaJp.getTargetLanguageRelpath(Languages.zh_CN)).toBe(ZH_CN_RELPATH)
    expect(koKr.getTargetLanguageRelpath(Languages.zh_CN)).toBe(ZH_CN_RELPATH)
    expect(ptBr.getTargetLanguageRelpath(Languages.zh_CN)).toBe(ZH_CN_RELPATH)
  })
})
