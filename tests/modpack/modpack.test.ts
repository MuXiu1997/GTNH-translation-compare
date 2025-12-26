import { Buffer } from 'node:buffer'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import AdmZip from 'adm-zip'
import { afterAll, beforeAll, describe, expect, it } from 'bun:test'
import { ModPack } from '~/modpack/modpack.ts'

describe('ModPack', () => {
  let testPackPath: string
  let modsPath: string
  let scriptsPath: string

  beforeAll(() => {
    testPackPath = fs.mkdtempSync(path.join(os.tmpdir(), 'gtnh-tc-pack-test-'))
    modsPath = path.join(testPackPath, 'mods')
    scriptsPath = path.join(testPackPath, 'scripts')

    fs.mkdirSync(modsPath)
    fs.mkdirSync(scriptsPath)

    // Create a dummy mod jar
    const zip = new AdmZip()
    zip.addFile('mcmod.info', Buffer.from(JSON.stringify([{ name: 'TestMod' }]), 'utf8'))
    zip.addFile('assets/tm/lang/en_US.lang', Buffer.from('tm.key=Value', 'utf8'))
    zip.writeZip(path.join(modsPath, 'test-mod.jar'))

    // Create a dummy script
    fs.writeFileSync(path.join(scriptsPath, 'test.zs'), 'val I18N_test = "Value";', 'utf8')
  })

  afterAll(() => {
    fs.rmSync(testPackPath, { recursive: true, force: true })
  })

  it('should find lang files in mods', () => {
    const modpack = new ModPack(testPackPath)
    const langFiles = modpack.langFiles
    expect(langFiles.length).toBe(1)
    expect(langFiles[0]!.relpath).toBe('resources/TestMod[tm]/lang/en_US.lang')
    expect(langFiles[0]!.content).toBe('tm.key=Value')
  })

  it('should find script files in scripts', () => {
    const modpack = new ModPack(testPackPath)
    const scriptFiles = modpack.scriptFiles
    expect(scriptFiles.length).toBe(1)
    expect(scriptFiles[0]!.relpath).toBe('scripts/test.zs')
    expect(scriptFiles[0]!.content).toBe('val I18N_test = "Value";')
  })
})
