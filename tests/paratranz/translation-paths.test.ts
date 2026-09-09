import { describe, expect, it } from 'bun:test'
import {
  convertAndDedupeTranslationFiles,
  guideNhPageToLocalRelpath,
  markdownTooltipToLocalRelpath,
} from '~/paratranz/translation-paths.ts'

describe('markdownTooltipToLocalRelpath', () => {
  it('maps a bracketed resource folder to the bare mod domain', () => {
    expect(markdownTooltipToLocalRelpath(
      'resources/GregTech[gregtech]/lang/zh_CN/tooltip/bec-ionode.md',
    )).toBe(
      'config/txloader/load/gregtech/lang/zh_CN/tooltip/bec-ionode.md',
    )
  })

  it('preserves nested tooltip paths', () => {
    expect(markdownTooltipToLocalRelpath(
      'resources/GregTech[gregtech]/lang/zh_CN/tooltip/bec-ionode/max-parallels.md',
    )).toBe(
      'config/txloader/load/gregtech/lang/zh_CN/tooltip/bec-ionode/max-parallels.md',
    )
  })

  it('removes ParaTranz duplicate suffixes before extracting the domain', () => {
    expect(markdownTooltipToLocalRelpath(
      'resources/GregTech[gregtech](+2)/lang/zh_CN/tooltip/bec-ionode.md',
    )).toBe(
      'config/txloader/load/gregtech/lang/zh_CN/tooltip/bec-ionode.md',
    )
  })

  it('accepts an already bare resource domain', () => {
    expect(markdownTooltipToLocalRelpath(
      'resources/gregtech/lang/zh_CN/tooltip/bec-ionode.md',
    )).toBe(
      'config/txloader/load/gregtech/lang/zh_CN/tooltip/bec-ionode.md',
    )
  })

  it('is idempotent for an existing TXLoader load path', () => {
    const relpath = 'config/txloader/load/gregtech/lang/zh_CN/tooltip/bec-ionode.md'
    expect(markdownTooltipToLocalRelpath(relpath)).toBe(relpath)
  })

  it('rejects a resource folder without an extractable domain', () => {
    expect(() => markdownTooltipToLocalRelpath(
      'resources/Greg Tech/lang/zh_CN/tooltip/bec-ionode.md',
    )).toThrow('mod domain')
  })

  it('rejects an invalid domain inside a bracketed resource folder', () => {
    expect(() => markdownTooltipToLocalRelpath(
      'resources/GregTech[bad domain]/lang/zh_CN/tooltip/bec-ionode.md',
    )).toThrow('mod domain')
  })

  it('rejects an existing TXLoader path that is not a markdown tooltip', () => {
    expect(() => markdownTooltipToLocalRelpath(
      'config/txloader/load/gregtech/lang/zh_CN/readme.md',
    )).toThrow('markdown tooltip')
  })
})

describe('guideNhPageToLocalRelpath', () => {
  const target = 'config/txloader/load/gregtech/guidenh/_zh_cn/items_blocks/machines.md'

  it('preserves the namespace, lowercase locale, and nested page path', () => {
    expect(guideNhPageToLocalRelpath(
      'resources/GTNH Guide Pack[gregtech]/guidenh/_zh_cn/items_blocks/machines.md',
    )).toBe(target)
    expect(guideNhPageToLocalRelpath(
      'resources/gregtech/guidenh/_zh_cn/items_blocks/machines.md',
    )).toBe(target)
    expect(guideNhPageToLocalRelpath(target)).toBe(target)
  })

  it('normalizes duplicate suffixes and Windows separators before mapping', () => {
    expect(guideNhPageToLocalRelpath(
      'resources\\GTNH Guide Pack[gregtech](+2)\\guidenh\\_zh_cn\\items_blocks\\machines.md',
    )).toBe(target)
  })

  it.each([
    'resources/GTNH Guide Pack[bad domain]/guidenh/_zh_cn/index.md',
    'resources/gregtech/guidenh/zh_cn/index.md',
    'resources/gregtech/guidenh/_zh_cn/index.md.json',
    'resources/gregtech/guidenh/_zh_cn/../../index.md',
    'config/txloader/load/gregtech/lang/zh_CN.lang',
    '/resources/gregtech/guidenh/_zh_cn/index.md',
  ])('rejects invalid guide output path %s', (relpath) => {
    expect(() => guideNhPageToLocalRelpath(relpath)).toThrow()
  })
})

describe('convertAndDedupeTranslationFiles', () => {
  const toLocalRelpath = (relpath: string): string => {
    return `config/txloader/load/${relpath
      .replace(/^resources\//, '')
      .replace(/\(\+\d+\)/g, '')}`
  }

  it('deduplicates case-insensitive collisions after path conversion', () => {
    const files = [
      {
        relpath: 'resources/BetterQuesting[CB4BQ]/lang/es_ES.lang',
        content: 'English fallback',
      },
      {
        relpath: 'resources/BetterQuesting[cb4bq](+1)/lang/es_ES.lang',
        content: 'Traducción',
      },
    ]

    expect(convertAndDedupeTranslationFiles(files, toLocalRelpath)).toEqual([
      {
        relpath: 'config/txloader/load/BetterQuesting[cb4bq]/lang/es_ES.lang',
        content: 'Traducción',
      },
    ])
  })

  it('prefers a path without a duplicate suffix when local paths are identical', () => {
    const canonical = {
      relpath: 'resources/TestMod[testmod]/lang/zh_CN.lang',
      content: 'canonical',
    }
    const duplicate = {
      relpath: 'resources/TestMod[testmod](+2)/lang/zh_CN.lang',
      content: 'duplicate',
    }

    expect(convertAndDedupeTranslationFiles(
      [duplicate, canonical],
      toLocalRelpath,
    )).toEqual([
      {
        relpath: 'config/txloader/load/TestMod[testmod]/lang/zh_CN.lang',
        content: 'canonical',
      },
    ])
  })

  it('does not collapse distinct final paths', () => {
    const files = [
      { relpath: 'resources/A[a]/lang/zh_CN.lang', content: 'A' },
      { relpath: 'resources/B[b]/lang/zh_CN.lang', content: 'B' },
    ]

    expect(convertAndDedupeTranslationFiles(files, toLocalRelpath)).toHaveLength(2)
  })
})
