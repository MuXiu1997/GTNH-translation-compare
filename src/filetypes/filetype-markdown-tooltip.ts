import type { Language } from '~/filetypes/language.ts'
import type { Property } from '~/filetypes/property.ts'
import { Filetype } from '~/filetypes/filetype.ts'
import { Languages } from '~/filetypes/language.ts'

const MARKDOWN_TOOLTIP_PATH_RE = /(?:^|\/)lang\/[^/]+\/tooltip\/.+\.md$/

export function isMarkdownTooltipPath(relpath: string): boolean {
  return MARKDOWN_TOOLTIP_PATH_RE.test(relpath.replaceAll('\\', '/'))
}

export function isMarkdownTooltipParatranzFile(name: string): boolean {
  return name.endsWith('.json')
    && isMarkdownTooltipPath(name.slice(0, -'.json'.length))
}

export class FiletypeMarkdownTooltip extends Filetype {
  #properties?: Record<string, Property>

  constructor(
    relpath: string,
    content: string,
    private readonly language: Language = Languages.en_US,
  ) {
    super(relpath, content)
  }

  get properties(): Record<string, Property> {
    if (this.#properties === undefined) {
      this.#properties = this.parse()
    }
    return this.#properties
  }

  private parse(): Record<string, Property> {
    if (this.content === '')
      return {}

    const key = `md-tooltip|${this.relpath}`
    return {
      [key]: {
        key,
        value: this.content,
        full: this.content,
        start: 0,
        end: [...this.content].length,
      },
    }
  }

  override getEnUsRelpath(): string {
    return this.getTargetLanguageRelpath(Languages.en_US)
  }

  override getTargetLanguageRelpath(targetLanguage: Language): string {
    if (this.language === targetLanguage)
      return this.relpath

    return this.relpath.replace(
      `/lang/${this.language}/`,
      `/lang/${targetLanguage}/`,
    )
  }
}
