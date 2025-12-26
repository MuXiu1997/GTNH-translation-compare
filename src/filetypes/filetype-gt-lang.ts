import type { Language } from './language.ts'
import type { Property } from './property.ts'
import { lineIterator } from '../utils/line-iterator.ts'
import { Filetype } from './filetype.ts'
import { Languages } from './language.ts'

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
    for (const [, line, , end] of lineIterator(this.content)) {
      if (!inLanguagefileCategory) {
        if (line.startsWith('languagefile {')) {
          inLanguagefileCategory = true
        }
        continue
      }

      if (line.startsWith('}')) {
        break
      }

      const splitIndex = line.indexOf('=')
      if (splitIndex === -1) {
        continue
      }
      const key = line.substring(0, splitIndex)
      const sKey = `gt-lang|${key}`
      const value = line.substring(splitIndex + 1)
      const full = line
      properties[sKey] = {
        key: sKey,
        value,
        full,
        start: end - value.length,
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
