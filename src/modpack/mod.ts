import type { Buffer } from 'node:buffer'
import AdmZip from 'adm-zip'
import { ensureLf, replaceIllegalCharacters } from '~/utils/file.ts'

export class Mod {
  readonly #jar: AdmZip
  #modName?: string
  #langFiles?: Record<string, string>

  constructor(jarPathOrBuffer: string | Buffer) {
    this.#jar = new AdmZip(jarPathOrBuffer)
  }

  get modName(): string {
    if (this.#modName === undefined) {
      this.#modName = this.parseModName()
    }
    return this.#modName
  }

  private parseModName(): string {
    try {
      const entry = this.#jar.getEntry('mcmod.info')
      if (!entry) {
        return '__no-modinfo'
      }
      const modInfoJson = new TextDecoder().decode(entry.getData())
      const modInfo = JSON.parse(modInfoJson.trim())
      let modList = modInfo
      if (modInfo && typeof modInfo === 'object' && !Array.isArray(modInfo)) {
        modList = modInfo.modList || []
      }
      if (!Array.isArray(modList) || modList.length === 0) {
        return '__no-modinfo'
      }
      const firstModName = modList[0].name || '__no-modinfo'
      return replaceIllegalCharacters(firstModName)
    }
    catch {
      return '__no-modinfo'
    }
  }

  get langFiles(): Record<string, string> {
    if (this.#langFiles === undefined) {
      this.#langFiles = this.parseLangFiles()
    }
    return this.#langFiles
  }

  private parseLangFiles(): Record<string, string> {
    const langFiles: Record<string, string> = {}
    const entries = this.#jar.getEntries()
    const decoder = new TextDecoder()
    for (const entry of entries) {
      const name = entry.entryName
      // Python: if f.endswith("en_US.lang") and len(f.split("/")) == 4:
      // This usually matches assets/<modid>/lang/en_US.lang
      if (name.endsWith('en_US.lang') && name.split('/').length === 4) {
        const content = decoder.decode(entry.getData())
        langFiles[name] = ensureLf(content)
      }
    }
    return langFiles
  }
}
