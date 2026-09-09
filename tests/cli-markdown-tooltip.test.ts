import { describe, expect, it } from 'bun:test'

function setupEnv(): void {
  process.env.PARATRANZ_TOKEN ??= 'test-token'
  process.env.PARATRANZ_PROJECT_ID ??= '1'
}

describe('lang and zs command markdown tooltip routing', () => {
  it('includes markdown tooltip ParaTranz files in the download filter', async () => {
    setupEnv()
    const { isLangAndZsParatranzFile } = await import('~/cli.ts')

    expect(isLangAndZsParatranzFile(
      'resources/GregTech[gregtech]/lang/zh_CN/tooltip/bec-ionode.md.json',
    )).toBe(true)
    expect(isLangAndZsParatranzFile(
      'resources/GregTech[gregtech]/lang/zh_CN/readme.md.json',
    )).toBe(false)
  })

  it('maps only markdown tooltips to the bare-domain TXLoader path', async () => {
    setupEnv()
    const { langAndZsLocalRelpath } = await import('~/cli.ts')

    expect(langAndZsLocalRelpath(
      'resources/GregTech[gregtech]/lang/zh_CN/tooltip/bec-ionode.md',
    )).toBe(
      'config/txloader/load/gregtech/lang/zh_CN/tooltip/bec-ionode.md',
    )
    expect(langAndZsLocalRelpath(
      'resources/GregTech[gregtech]/lang/zh_CN.lang',
    )).toBe(
      'resources/GregTech[gregtech]/lang/zh_CN.lang',
    )
    expect(langAndZsLocalRelpath('scripts/example.zs')).toBe('scripts/example.zs')
  })

  it('routes GuideNH pages through the existing lang-zs commands', async () => {
    setupEnv()
    const { isLangAndZsParatranzFile, langAndZsLocalRelpath } = await import('~/cli.ts')
    const relpath = 'resources/GTNH Guide Pack[gregtech]/guidenh/_zh_cn/items_blocks/machines.md'
    expect(isLangAndZsParatranzFile(`${relpath}.json`)).toBe(true)
    expect(isLangAndZsParatranzFile(relpath)).toBe(false)
    expect(langAndZsLocalRelpath(relpath)).toBe('config/txloader/load/gregtech/guidenh/_zh_cn/items_blocks/machines.md')
    // Ponder labels still use the existing resources -> forceload release path.
    const labels = 'resources/GTNH Guide Pack[gregtech]/lang/zh_CN.lang'
    expect(isLangAndZsParatranzFile(`${labels}.json`)).toBe(true)
    expect(langAndZsLocalRelpath(labels)).toBe(labels)
  })
})
