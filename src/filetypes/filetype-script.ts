import type { Language } from '~/filetypes/language.ts'
import type { Property } from '~/filetypes/property.ts'
import { Filetype } from '~/filetypes/filetype.ts'
import { Languages } from '~/filetypes/language.ts'
import { lineIterator } from '~/utils/line-iterator.ts'

const PATTERN = /^(?<full>val (?<key>I18N.*?) ?= ?"(?<value>.+?)";)$/

export class FiletypeScript extends Filetype {
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
    for (const [, line, start] of lineIterator(this.content)) {
      if (!line.startsWith('val I18N')) {
        continue
      }
      const match = line.match(PATTERN)
      if (!match || !match.groups) {
        continue
      }
      const key = match.groups.key!
      const sKey = `script|${key}`
      const value = match.groups.value!
      const full = match.groups.full!

      const valueStart = line.indexOf(`"${value}"`) + 1

      properties[sKey] = {
        key: sKey,
        value,
        full,
        start: start + valueStart,
        end: start + valueStart + value.length,
      }
    }
    return properties
  }

  override getEnUsRelpath(): string {
    return this.relpath
  }

  override getTargetLanguageRelpath(_targetLanguage: Language): string {
    return this.relpath
  }
}
