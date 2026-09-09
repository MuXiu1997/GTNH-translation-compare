import { describe, expect, it } from 'bun:test'
import {
  FiletypeGuideNhPage,
  isGuideNhPageParatranzFile,
  isGuideNhPagePath,
  Languages,
} from '~/filetypes/index.ts'

const EN_PATH = 'resources/GTNH Guide Pack[gregtech]/guidenh/_en_us/items_blocks/machines.md'
const ZH_PATH = 'resources/GTNH Guide Pack[gregtech]/guidenh/_zh_cn/items_blocks/machines.md'
const CONTENT = '---\nnavigation:\n  title: Machines\n---\n# Machines 🚀\n<ItemImage id="gregtech:gt.blockmachines:1"/>\n'

describe('GuideNH pages', () => {
  it('keeps frontmatter and body as one unit with Unicode code-point offsets', () => {
    const file = new FiletypeGuideNhPage(EN_PATH, CONTENT)
    const key = `guidenh-page|${EN_PATH}`
    expect(file.properties).toEqual({
      [key]: { key, value: CONTENT, full: CONTENT, start: 0, end: [...CONTENT].length },
    })
  })

  it('uses the same key across languages and only replaces the locale directory', () => {
    const english = new FiletypeGuideNhPage(EN_PATH, CONTENT)
    const chinese = new FiletypeGuideNhPage(ZH_PATH, '机器', Languages.zh_CN)
    expect(Object.keys(chinese.properties)).toEqual(Object.keys(english.properties))
    expect(english.getTargetLanguageRelpath(Languages.zh_CN)).toBe(ZH_PATH)
    expect(chinese.getEnUsRelpath()).toBe(EN_PATH)
    expect(chinese.getTargetLanguageRelpath(Languages.zh_CN)).toBe(ZH_PATH)

    const page = new FiletypeGuideNhPage(`${EN_PATH}/_en_us/example.md`, CONTENT)
    expect(page.getTargetLanguageRelpath(Languages.ja_JP)).toBe(`${EN_PATH.replace('/_en_us/', '/_ja_jp/')}/_en_us/example.md`)
  })

  it.each(['', ' \n\t'])('does not create strings for an empty page (%j)', (content) => {
    expect(new FiletypeGuideNhPage(EN_PATH, content).properties).toEqual({})
  })

  it('recognizes nested locale pages and requires the ParaTranz JSON suffix', () => {
    expect(isGuideNhPagePath(EN_PATH)).toBe(true)
    expect(isGuideNhPagePath(ZH_PATH.replaceAll('/', '\\'))).toBe(true)
    expect(isGuideNhPageParatranzFile(`${ZH_PATH}.json`)).toBe(true)
    expect(isGuideNhPageParatranzFile(ZH_PATH)).toBe(false)
    expect(isGuideNhPagePath(`${EN_PATH}.json`)).toBe(false)
    expect(isGuideNhPagePath(EN_PATH.replace('_en_us', 'en_us'))).toBe(false)
    expect(isGuideNhPagePath('resources/gregtech/lang/en_US.lang')).toBe(false)
    expect(isGuideNhPagePath('resources/gregtech/guidenh/_en_us/icon.png')).toBe(false)
  })
})
