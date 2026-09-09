import { Buffer } from 'node:buffer'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import AdmZip from 'adm-zip'
import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { FiletypeGuideNhPage, FiletypeLang } from '~/filetypes/index.ts'
import { ModPack } from '~/modpack/modpack.ts'

describe('bundled GuideNH pack', () => {
  let root: string

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'gtnh-guide-pack-'))
    fs.mkdirSync(path.join(root, 'config/guidenh'), { recursive: true })
  })

  afterEach(() => fs.rmSync(root, { recursive: true, force: true }))

  it('reads English pages and Ponder labels, excluding translations and other assets', () => {
    const zip = new AdmZip()
    const entries = {
      'assets/gregtech/guidenh/_en_us/items_blocks/machines.md': '\uFEFF# Machines 🚀\r\nDetail\r\n',
      'assets/gregtech/guidenh/_zh_cn/items_blocks/machines.md': '# 机器',
      'assets/gregtech/guidenh/_ja_jp/items_blocks/machines.md': '# 機械',
      'assets/appliedenergistics2/guidenh/_en_us/index.md': '# AE2',
      'assets/gregtech/lang/en_us.lang': '\uFEFFgregtech.ponder.label=Overview\r\n',
      'assets/gregtech/lang/zh_cn.lang': 'gregtech.ponder.label=概览',
      'assets/gregtech/guidenh/_en_us/empty.md': '',
      'assets/gregtech/guidenh/_en_us/icon.png': 'not text',
      'assets/gregtech/guidenh/assets/scene.json': '{}',
      'assets/gregtech/guidenh/index.md': '# Shared page',
      'docs/guidenh/_en_us/readme.md': '# Not a resource',
      'pack.mcmeta': '{}',
    }
    for (const [name, content] of Object.entries(entries))
      zip.addFile(name, Buffer.from(content))
    zip.writeZip(path.join(root, 'config/guidenh/DefaultGuide.zip'))

    const files = new ModPack(root).langFiles
    expect(files.map(file => file.relpath).sort()).toEqual([
      'resources/GTNH Guide Pack[appliedenergistics2]/guidenh/_en_us/index.md',
      'resources/GTNH Guide Pack[gregtech]/guidenh/_en_us/empty.md',
      'resources/GTNH Guide Pack[gregtech]/guidenh/_en_us/items_blocks/machines.md',
      'resources/GTNH Guide Pack[gregtech]/lang/en_US.lang',
    ])
    const page = files.find(file => file.relpath.endsWith('machines.md'))!
    expect(page).toBeInstanceOf(FiletypeGuideNhPage)
    expect(page.content).toBe('# Machines 🚀\nDetail\n')
    expect(files.find(file => file.relpath.endsWith('empty.md'))!.properties).toEqual({})
    const labels = files.find(file => file.relpath.endsWith('.lang'))!
    expect(labels).toBeInstanceOf(FiletypeLang)
    expect(labels.content).toBe('gregtech.ponder.label=Overview\n')
  })

  it('still reads extra lang files when an older pack has no guide ZIP', () => {
    fs.writeFileSync(path.join(root, 'config/en_US.lang'), 'test=Extra')
    const files = new ModPack(root, ['config/en_US.lang']).langFiles
    expect(files.map(file => file.relpath)).toEqual(['config/en_US.lang'])
  })

  it('reports a corrupt guide ZIP instead of silently omitting its translations', () => {
    fs.writeFileSync(path.join(root, 'config/guidenh/DefaultGuide.zip'), 'not a zip')
    expect(() => new ModPack(root).langFiles).toThrow()
  })
})
