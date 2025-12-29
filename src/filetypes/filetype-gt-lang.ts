import type { Language } from '~/filetypes/language.ts'
import type { Property } from '~/filetypes/property.ts'
import { Filetype } from '~/filetypes/filetype.ts'
import { Languages } from '~/filetypes/language.ts'
import { lineIterator } from '~/utils/line-iterator.ts'

const decoder = new TextDecoder()

export class FiletypeGTLang extends Filetype {
  #properties?: Record<string, Property>

  constructor(
    relpath: string,
    content: string,
    private readonly language: Language = Languages.en_US,
  ) {
    super(relpath, content)
  }

  get properties(): Record<string, Property> {
    if (!this.#properties) {
      this.#properties = this.parse()
    }
    return this.#properties
  }

  private parse(): Record<string, Property> {
    const properties: Record<string, Property> = {}
    let inLanguagefileCategory = false

    const contentBytes = new TextEncoder().encode(this.content)
    for (const [, bytes, start, end] of lineIterator(contentBytes)) {
      if (bytes.length === 0 || bytes[0] === 0x23) // 0x23 is '#'
        continue

      // Quick byte-level checks for category transitions
      if (!inLanguagefileCategory) {
        const line = decoder.decode(bytes).trim()
        if (line.startsWith('languagefile {')) {
          inLanguagefileCategory = true
        }
        continue
      }

      if (bytes[0] === 0x7D) { // 0x7D is '}'
        const line = decoder.decode(bytes).trim()
        if (line.startsWith('}')) {
          break
        }
      }

      const splitByteIndex = bytes.indexOf(0x3D) // '='
      if (splitByteIndex === -1) {
        continue
      }

      // Calculate code point offset from bytes
      let valueCpOffset = 0
      for (let i = 0; i <= splitByteIndex; i++) {
        if ((bytes[i]! & 0xC0) !== 0x80) {
          valueCpOffset++
        }
      }

      const key = decoder.decode(bytes.subarray(0, splitByteIndex))
      const sKey = `gt-lang|${key}`
      const value = decoder.decode(bytes.subarray(splitByteIndex + 1))
      const full = decoder.decode(bytes)

      properties[sKey] = {
        key: sKey,
        value,
        full,
        start: start + valueCpOffset,
        end,
      }
    }
    return properties
  }

  override getEnUsRelpath(): string {
    if (this.language === Languages.en_US) {
      return this.relpath
    }
    return this.relpath.replace('GregTech', 'GregTech_US')
  }

  override getTargetLanguageRelpath(targetLanguage: Language): string {
    if (this.language === targetLanguage) {
      return this.relpath
    }
    if (targetLanguage === Languages.en_US) {
      return this.getEnUsRelpath()
    }
    return this.getEnUsRelpath().replace('GregTech_US', 'GregTech')
  }
}
