import type { Language } from '~/filetypes/language.ts'
import type { Property } from '~/filetypes/property.ts'
import { Filetype } from '~/filetypes/filetype.ts'
import { Languages } from '~/filetypes/language.ts'

const GUIDENH_PAGE_PATH_RE = /(?:^|\/)guidenh\/_[a-z]{2}_[a-z]{2}\/.+\.md$/

export function isGuideNhPagePath(relpath: string): boolean {
  return GUIDENH_PAGE_PATH_RE.test(relpath.replaceAll('\\', '/'))
}

export function isGuideNhPageParatranzFile(name: string): boolean {
  return name.endsWith('.json') && isGuideNhPagePath(name.slice(0, -'.json'.length))
}

export class FiletypeGuideNhPage extends Filetype {
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
      // Keep the frontmatter, tags and body together, matching GTNH-Translations.
      const key = `guidenh-page|${this.getEnUsRelpath()}`
      this.#properties = this.content.trim() === ''
        ? {}
        : {
            [key]: {
              key,
              value: this.content,
              full: this.content,
              start: 0,
              end: [...this.content].length,
            },
          }
    }
    return this.#properties
  }

  override getEnUsRelpath(): string {
    return this.getTargetLanguageRelpath(Languages.en_US)
  }

  override getTargetLanguageRelpath(targetLanguage: Language): string {
    return this.relpath.replace(
      `/guidenh/_${this.language.toLowerCase()}/`,
      `/guidenh/_${targetLanguage.toLowerCase()}/`,
    )
  }
}
