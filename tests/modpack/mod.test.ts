import { Buffer } from 'node:buffer'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import AdmZip from 'adm-zip'
import { afterAll, beforeAll, describe, expect, it } from 'bun:test'
import { Mod } from '~/modpack/mod.ts'

describe('Mod', () => {
  let tempDir: string
  let testJarPath: string

  beforeAll(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gtnh-tc-test-'))
    testJarPath = path.join(tempDir, 'test-mod.jar')

    // Create a dummy jar for testing
    const zip = new AdmZip()
    zip.addFile('mcmod.info', Buffer.from(JSON.stringify([
      { name: 'Test Mod' },
    ]), 'utf8'))
    zip.addFile('assets/testmod/lang/en_US.lang', Buffer.from('test.key=Test Value', 'utf8'))
    zip.writeZip(testJarPath)
  })

  afterAll(() => {
    fs.rmSync(tempDir, { recursive: true, force: true })
  })

  it('should correctly parse mod name', () => {
    const mod = new Mod(testJarPath)
    expect(mod.modName).toBe('Test Mod')
  })

  it('should correctly find lang files', () => {
    const mod = new Mod(testJarPath)
    expect(mod.langFiles).toEqual({
      'assets/testmod/lang/en_US.lang': 'test.key=Test Value',
    })
  })

  it('should handle missing mcmod.info', () => {
    const emptyZip = new AdmZip()
    const emptyJarPath = path.join(tempDir, 'empty.jar')
    emptyZip.writeZip(emptyJarPath)

    const mod = new Mod(emptyJarPath)
    expect(mod.modName).toBe('__no-modinfo')

    fs.unlinkSync(emptyJarPath)
  })
})
