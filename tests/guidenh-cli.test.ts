import type { OfflineState } from './support/paratranz-offline.ts'
import { Buffer } from 'node:buffer'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import AdmZip from 'adm-zip'
import { afterEach, beforeEach, describe, expect, it } from 'bun:test'

const SOURCE = [
  '---',
  'navigation:',
  '  title: Machines',
  '  parent: index.md',
  '---',
  '# Machines 🚀',
  '<ItemImage id="gregtech:gt.blockmachines:1"/>',
  'A<br>B [br] C',
  '$$\\nu + \\nabla x$$',
  '```js',
  'print("one\\ntwo")',
  '```',
  '',
].join('\n')
const TRANSLATION = SOURCE.replaceAll('Machines', '机器')
const SOURCE_PATH = 'resources/GTNH Guide Pack[gregtech]/guidenh/_en_us/items_blocks/machines.md'
const TARGET_PATH = 'resources/GTNH Guide Pack[gregtech]/guidenh/_zh_cn/items_blocks/machines.md'

describe('GuideNH CLI round-trip with an offline ParaTranz adapter', () => {
  let root: string
  let statePath: string

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'gtnh-guide-cli-'))
    statePath = path.join(root, 'api-state.json')
    fs.writeFileSync(statePath, JSON.stringify({ files: [], requests: [] }))
    fs.mkdirSync(path.join(root, 'pack/config/guidenh'), { recursive: true })
  })

  afterEach(() => fs.rmSync(root, { recursive: true, force: true }))

  function readState(): OfflineState {
    return JSON.parse(fs.readFileSync(statePath, 'utf8'))
  }

  function writePack(source: string): void {
    const zip = new AdmZip()
    zip.addFile('assets/gregtech/guidenh/_en_us/items_blocks/machines.md', Buffer.from(source))
    zip.addFile('assets/gregtech/guidenh/_en_us/index.md', Buffer.from('# Guide\nSecond line'))
    zip.addFile('assets/gregtech/guidenh/_en_us/empty.md', Buffer.from(' \n'))
    zip.addFile('assets/gregtech/guidenh/_zh_cn/index.md', Buffer.from('# Existing Chinese page'))
    zip.addFile('assets/gregtech/lang/en_us.lang', Buffer.from('ponder.label=Overview\n'))
    zip.writeZip(path.join(root, 'pack/config/guidenh/DefaultGuide.zip'))
  }

  async function runCli(...args: string[]): Promise<string> {
    const child = Bun.spawn([
      process.execPath,
      '--preload',
      './tests/support/paratranz-offline.ts',
      'src/index.ts',
      ...args,
    ], {
      cwd: path.resolve(import.meta.dir, '..'),
      // Never inherit the developer's production credentials or cache.
      env: {
        PATH: process.env.PATH,
        PARATRANZ_TOKEN: 'offline-test-token',
        PARATRANZ_PROJECT_ID: '1',
        TARGET_LANG: 'zh_CN',
        PARATRANZ_OFFLINE_STATE: statePath,
        PARATRANZ_CACHE_DIR: path.join(root, 'cache'),
      },
      stdout: 'pipe',
      stderr: 'pipe',
    })
    const [stdout, stderr, exitCode] = await Promise.all([
      new Response(child.stdout).text(),
      new Response(child.stderr).text(),
      child.exited,
    ])
    if (exitCode !== 0)
      throw new Error(`CLI failed (${exitCode}):\n${stdout}\n${stderr}`)
    return stdout + stderr
  }

  it('extracts, uploads, preserves translations on repeat sync and writes loadable locale files', async () => {
    writePack(SOURCE)
    const uploadOutput = await runCli('to-paratranz:lang-zs', '--modpack-path', path.join(root, 'pack'))
    expect(uploadOutput).toContain('Skipping source file with no strings')
    const state = readState()
    expect(state.files).toHaveLength(3)
    const page = state.files.find(file => file.name === `${TARGET_PATH}.json`)!
    expect(page.strings).toEqual([{
      key: `guidenh-page|${SOURCE_PATH}`,
      original: SOURCE,
      context: '@gtnh-line-break-form=LF',
      translation: '',
    }])
    expect(page.extra?.original).toBe(SOURCE)

    for (const file of state.files) {
      file.strings[0]!.translation = file === page
        ? TRANSLATION
        : file.name.endsWith('.lang.json') ? '概览' : '# 指南\\n第二行'
      file.strings[0]!.stage = 1
    }
    fs.writeFileSync(statePath, JSON.stringify(state))

    await runCli('to-paratranz:lang-zs', '--modpack-path', path.join(root, 'pack'))
    expect(readState().files.find(file => file.id === page.id)!.strings[0]!.translation).toBe(TRANSLATION)
    expect(readState().files.find(file => file.id === page.id)!.strings[0]!.stage).toBe(1)

    const output = path.join(root, 'output')
    await runCli('from-paratranz:lang-zs', '--repo-path', output)
    expect(fs.readFileSync(path.join(output, 'config/txloader/load/gregtech/guidenh/_zh_cn/items_blocks/machines.md'), 'utf8')).toBe(TRANSLATION)
    expect(fs.readFileSync(path.join(output, 'config/txloader/load/gregtech/guidenh/_zh_cn/index.md'), 'utf8')).toBe('# 指南\n第二行')
    expect(fs.readFileSync(path.join(output, 'resources/GTNH Guide Pack[gregtech]/lang/zh_CN.lang'), 'utf8')).toBe('ponder.label=概览\n')
    expect(fs.existsSync(path.join(output, 'config/txloader/load/gregtech/guidenh/_zh_cn/empty.md'))).toBe(false)

    // The source-update API retains the old translation and resets its stage.
    // The current downloader exports any nonempty translation, including stage 0.
    writePack(SOURCE.replace('A<br>B', 'Updated<br>B'))
    await runCli('to-paratranz:lang-zs', '--modpack-path', path.join(root, 'pack'))
    const updated = readState().files.find(file => file.id === page.id)!
    expect(updated.strings[0]!.key).toBe(`guidenh-page|${SOURCE_PATH}`)
    expect(updated.strings[0]!.original).toBe(SOURCE.replace('A<br>B', 'Updated<br>B'))
    expect(updated.strings[0]!.translation).toBe(TRANSLATION)
    expect(updated.strings[0]!.stage).toBe(0)
    const unchanged = readState().files.find(file => file.name.endsWith('/index.md.json'))!
    expect(unchanged.strings[0]!.translation).toBe('# 指南\\n第二行')
    expect(unchanged.strings[0]!.stage).toBe(1)
    await runCli('from-paratranz:lang-zs', '--repo-path', output)
    expect(fs.readFileSync(path.join(output, 'config/txloader/load/gregtech/guidenh/_zh_cn/items_blocks/machines.md'), 'utf8')).toBe(TRANSLATION)
  }, 15000)

  it('retries rate-limited uploads and finishes the remaining files', async () => {
    writePack(SOURCE)
    const state = readState()
    state.failure = { request: 'POST projects/1/files', status: 429, remaining: 2 }
    fs.writeFileSync(statePath, JSON.stringify(state))

    await runCli('to-paratranz:lang-zs', '--modpack-path', path.join(root, 'pack'))
    const uploaded = readState()
    expect(uploaded.failure?.remaining).toBe(0)
    expect(uploaded.files).toHaveLength(3)
    expect(uploaded.requests.filter(request => request === 'POST projects/1/files')).toHaveLength(5)
    expect(uploaded.files.every(file => file.extra?.original)).toBe(true)
  }, 15000)

  it('repairs a partial upload on rerun without changing source files', async () => {
    writePack(SOURCE)
    const state = readState()
    // Fail after the first file is created, before its reconstruction metadata is saved.
    state.failure = { request: 'PUT projects/1/files/1', status: 400, remaining: 1 }
    fs.writeFileSync(statePath, JSON.stringify(state))
    await expect(runCli('to-paratranz:lang-zs', '--modpack-path', path.join(root, 'pack'))).rejects.toThrow('CLI failed')

    const partial = readState()
    expect(partial.files).toHaveLength(1)
    expect(partial.files[0]!.extra).toBeUndefined()
    partial.files[0]!.strings[0]!.translation = '保留已有译文'
    partial.files[0]!.strings[0]!.stage = 1
    fs.writeFileSync(statePath, JSON.stringify(partial))

    await runCli('to-paratranz:lang-zs', '--modpack-path', path.join(root, 'pack'))
    const repaired = readState()
    expect(repaired.files).toHaveLength(3)
    expect(repaired.files.every(file => file.extra?.original)).toBe(true)
    expect(repaired.files[0]!.strings[0]!.translation).toBe('保留已有译文')
    expect(repaired.files[0]!.strings[0]!.stage).toBe(1)
    expect(repaired.requests).toContain('POST projects/1/files/1')
  }, 15000)
})
