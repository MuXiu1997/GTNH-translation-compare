import type { Language } from './language.ts'
import type { Property } from './property.ts'

export abstract class Filetype {
  constructor(
    public readonly relpath: string,
    public readonly content: string,
  ) {}

  abstract get properties(): Record<string, Property>

  abstract getEnUsRelpath(): string

  abstract getTargetLanguageRelpath(targetLanguage: Language): string
}
