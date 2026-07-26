import { describe, expect, it } from 'bun:test'
import {
  FiletypeMarkdownTooltip,
  isMarkdownTooltipParatranzFile,
  isMarkdownTooltipPath,
  Languages,
} from '~/filetypes/index.ts'

const EN_US_RELPATH = 'resources/GregTech[gregtech]/lang/en_US/tooltip/bec-ionode.md'
const ZH_CN_RELPATH = 'resources/GregTech[gregtech]/lang/zh_CN/tooltip/bec-ionode.md'
const CONTENT = [
  'Teleports items into the {gold:{item:gregtech:gt.blockmachines:15756}}.',
  'Status: 🚀',
].join('\n')

describe('FiletypeMarkdownTooltip', () => {
  it('treats the complete document as one translation unit', () => {
    const file = new FiletypeMarkdownTooltip(EN_US_RELPATH, CONTENT)
    const key = `md-tooltip|${EN_US_RELPATH}`

    expect(file.properties).toEqual({
      [key]: {
        key,
        value: CONTENT,
        full: CONTENT,
        start: 0,
        end: [...CONTENT].length,
      },
    })
  })

  it('does not create a translation unit for an empty document', () => {
    expect(new FiletypeMarkdownTooltip(EN_US_RELPATH, '').properties).toEqual({})
  })

  it('maps source and target language paths', () => {
    const enUs = new FiletypeMarkdownTooltip(EN_US_RELPATH, CONTENT)
    const zhCn = new FiletypeMarkdownTooltip(ZH_CN_RELPATH, CONTENT, Languages.zh_CN)

    expect(enUs.getTargetLanguageRelpath(Languages.zh_CN)).toBe(ZH_CN_RELPATH)
    expect(zhCn.getEnUsRelpath()).toBe(EN_US_RELPATH)
  })
})

describe('markdown tooltip path detection', () => {
  it('accepts nested tooltip markdown paths in any locale', () => {
    expect(isMarkdownTooltipPath(EN_US_RELPATH)).toBe(true)
    expect(isMarkdownTooltipPath(
      'resources/GregTech[gregtech]/lang/zh_CN/tooltip/bec-ionode/max-parallels.md',
    )).toBe(true)
  })

  it('distinguishes local markdown paths from ParaTranz file names', () => {
    expect(isMarkdownTooltipPath(`${ZH_CN_RELPATH}.json`)).toBe(false)
    expect(isMarkdownTooltipParatranzFile(`${ZH_CN_RELPATH}.json`)).toBe(true)
    expect(isMarkdownTooltipParatranzFile(ZH_CN_RELPATH)).toBe(false)
    expect(isMarkdownTooltipParatranzFile('resources/Test[test]/lang/zh_CN.lang.json')).toBe(false)
  })
})
