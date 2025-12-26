import type { Language } from './language.ts'
import type { Property } from './property.ts'
import { lineIterator } from '../utils/line-iterator.ts'
import { Filetype } from './filetype.ts'
import { Languages } from './language.ts'

export class FiletypeLang extends Filetype {
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
    for (const [, line, , end] of lineIterator(this.content)) {
      if (line.startsWith('#')) {
        continue
      }
      const splitIndex = line.indexOf('=')
      if (splitIndex === -1) {
        continue
      }
      const key = line.substring(0, splitIndex)
      const sKey = `lang|${key}`
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
    return this.relpath.replace(this.language, Languages.en_US)
  }

  override getTargetLanguageRelpath(targetLanguage: Language): string {
    if (this.language === targetLanguage) {
      return this.relpath
    }
    return this.relpath.replace(this.language, targetLanguage)
  }
}
