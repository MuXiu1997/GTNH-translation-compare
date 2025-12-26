import { describe, expect, it } from 'bun:test'
import { FiletypeGTLang, Languages } from '~/filetypes/index.ts'

const EN_US_RELPATH = 'GregTech_US.lang'
const EN_US_CONTENT = [
  '# Configuration file',
  '',
  'enablelangfile {',
  '    B:UseThisFileAsLanguageFile=false',
  '}',
  '',
  '',
  'languagefile {',
  '    S:test=test',
  '}',
  '',
].join('\n')

const ZH_CN_RELPATH = 'GregTech.lang'
const ZH_CN_CONTENT = [
  '# Configuration file',
  '',
  'enablelangfile {',
  '    S:Language=en_US',
  '    B:UseThisFileAsLanguageFile=true',
  '}',
  '',
  '',
  'languagefile {',
  '    S:test=测试',
  '}',
  '',
].join('\n')

const JA_JP_RELPATH = 'GregTech.lang'
const JA_JP_CONTENT = [
  '# Configuration file',
  '',
  'enablelangfile {',
  '    S:Language=en_US',
  '    B:UseThisFileAsLanguageFile=true',
  '}',
  '',
  '',
  'languagefile {',
  '    S:test=テスト',
  '}',
  '',
].join('\n')

const KO_KR_RELPATH = 'GregTech.lang'
const KO_KR_CONTENT = [
  '# Configuration file',
  '',
  'enablelangfile {',
  '    S:Language=en_US',
  '    B:UseThisFileAsLanguageFile=true',
  '}',
  '',
  '',
  'languagefile {',
  '    S:test=테스트',
  '}',
  '',
].join('\n')

const PT_BR_RELPATH = 'GregTech.lang'
const PT_BR_CONTENT = [
  '# Configuration file',
  '',
  'enablelangfile {',
  '    S:Language=en_US',
  '    B:UseThisFileAsLanguageFile=true',
  '}',
  '',
  '',
  'languagefile {',
  '    S:test=teste',
  '}',
  '',
].join('\n')

describe('FiletypeGTLang', () => {
  const enUs = new FiletypeGTLang(EN_US_RELPATH, EN_US_CONTENT)
  const zhCn = new FiletypeGTLang(ZH_CN_RELPATH, ZH_CN_CONTENT, Languages.zh_CN)
  const jaJp = new FiletypeGTLang(JA_JP_RELPATH, JA_JP_CONTENT, Languages.ja_JP)
  const koKr = new FiletypeGTLang(KO_KR_RELPATH, KO_KR_CONTENT, Languages.ko_KR)
  const ptBr = new FiletypeGTLang(PT_BR_RELPATH, PT_BR_CONTENT, Languages.pt_BR)

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
      'gt-lang|    S:test': { key: 'gt-lang|    S:test', value: 'test', full: '    S:test=test', start: 107, end: 111 },
    })
    expect(zhCn.properties).toEqual({
      'gt-lang|    S:test': { key: 'gt-lang|    S:test', value: '测试', full: '    S:test=测试', start: 127, end: 129 },
    })
    expect(jaJp.properties).toEqual({
      'gt-lang|    S:test': { key: 'gt-lang|    S:test', value: 'テスト', full: '    S:test=テスト', start: 127, end: 130 },
    })
    expect(koKr.properties).toEqual({
      'gt-lang|    S:test': { key: 'gt-lang|    S:test', value: '테스트', full: '    S:test=테스트', start: 127, end: 130 },
    })
    expect(ptBr.properties).toEqual({
      'gt-lang|    S:test': { key: 'gt-lang|    S:test', value: 'teste', full: '    S:test=teste', start: 127, end: 132 },
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
