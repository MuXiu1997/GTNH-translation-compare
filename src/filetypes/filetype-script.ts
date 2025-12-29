import type { Language } from '~/filetypes/language.ts'
import type { Property } from '~/filetypes/property.ts'
import { Filetype } from '~/filetypes/filetype.ts'
import { Languages } from '~/filetypes/language.ts'
import { lineIterator } from '~/utils/line-iterator.ts'
import { codePointLength } from '~/utils/unicode.ts'

const PATTERN = /^(?<full>val (?<key>I18N.*?) ?= ?"(?<value>.+?)";)$/
const decoder = new TextDecoder()
// 'v'(0x76), 'a'(0x61), 'l'(0x6C), ' '(0x20), 'I'(0x49), '1'(0x31), '8'(0x38), 'N'(0x4E)
const PREFIX = new Uint8Array([0x76, 0x61, 0x6C, 0x20, 0x49, 0x31, 0x38, 0x4E])

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

    const contentBytes = new TextEncoder().encode(this.content)
    for (const [, bytes, start] of lineIterator(contentBytes)) {
      if (bytes.length < PREFIX.length)
        continue

      let matchPrefix = true
      for (let i = 0; i < PREFIX.length; i++) {
        if (bytes[i] !== PREFIX[i]) {
          matchPrefix = false
          break
        }
      }
      if (!matchPrefix)
        continue

      const line = decoder.decode(bytes)
      const match = line.match(PATTERN)
      if (!match || !match.groups) {
        continue
      }
      const key = match.groups.key!
      const sKey = `script|${key}`
      const value = match.groups.value!
      const full = match.groups.full!

      // Find value start in bytes for efficient code point counting
      // We look for the first '"' after '='
      const splitByteIndex = bytes.indexOf(0x3D) // '='
      const quoteByteIndex = bytes.indexOf(0x22, splitByteIndex) // '"'

      let valueCpOffset = 0
      for (let i = 0; i <= quoteByteIndex; i++) {
        if ((bytes[i]! & 0xC0) !== 0x80) {
          valueCpOffset++
        }
      }

      properties[sKey] = {
        key: sKey,
        value,
        full,
        start: start + valueCpOffset,
        end: start + valueCpOffset + codePointLength(value),
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
