import type { Language } from '~/filetypes/language.ts'
import type { Property } from '~/filetypes/property.ts'

export abstract class Filetype {
  constructor(
    public readonly relpath: string,
    public readonly content: string,
  ) {}

  abstract get properties(): Record<string, Property>

  abstract getEnUsRelpath(): string

  abstract getTargetLanguageRelpath(targetLanguage: Language): string
}
