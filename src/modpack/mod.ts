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
      const modInfoRaw = new TextDecoder().decode(entry.getData())

      let modInfo: any
      try {
        modInfo = JSON.parse(modInfoRaw.trim())
      }
      catch {
        // Handle cases where description contains unescaped newlines
        // This is common in some old Minecraft mods' mcmod.info
        const escaped = this.escapeNewlinesInStrings(modInfoRaw.trim())
        modInfo = JSON.parse(escaped)
      }

      let modList: any[] = []
      if (Array.isArray(modInfo)) {
        modList = modInfo
      }
      else if (modInfo && typeof modInfo === 'object') {
        if (Array.isArray(modInfo.modList)) {
          modList = modInfo.modList
        }
        else {
          modList = [modInfo]
        }
      }

      if (modList.length > 0) {
        const firstMod = modList[0]
        const name = firstMod.name || '__no-modinfo'
        return replaceIllegalCharacters(name)
      }
      return '__no-modinfo'
    }
    catch {
      return '__no-modinfo'
    }
  }

  private escapeNewlinesInStrings(json: string): string {
    let result = ''
    let inString = false
    let isEscaped = false

    for (let i = 0; i < json.length; i++) {
      const char = json[i]!

      if (inString) {
        if (isEscaped) {
          result += char
          isEscaped = false
        }
        else if (char === '\\') {
          result += char
          isEscaped = true
        }
        else if (char === '"') {
          result += char
          inString = false
        }
        else if (char === '\n') {
          result += '\\n'
        }
        else if (char === '\r') {
          // Skip \r, we only care about \n for escaping
        }
        else {
          result += char
        }
      }
      else {
        if (char === '"') {
          inString = true
        }
        result += char
      }
    }
    return result
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
