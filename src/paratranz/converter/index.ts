import type { Filetype } from '~/filetypes/filetype.ts'
import type { Language } from '~/filetypes/language.ts'
import type { ClientWrapper } from '~/paratranz/api/index.ts'
import type { ConverterCache } from '~/paratranz/converter/cache.ts'
import type { File, ParatranzFile, StringItem, TranslationFile } from '~/paratranz/types.ts'
import { consola } from 'consola'
import { FileExtraSchema } from '~/paratranz/types.ts'
import { toUnicode } from '~/utils/unicode.ts'

export class Converter {
  constructor(
    private readonly client: ClientWrapper,
    private readonly cache: ConverterCache,
    private readonly targetLang: Language,
  ) {}

  async toTranslationFile(paratranzFile: File): Promise<TranslationFile> {
    const cached = this.cache.get(paratranzFile)
    if (cached) {
      consola.info(`cache hit: ${paratranzFile.name}`)
      return cached
    }

    const translationFile = await this.toTranslationFileUncached(paratranzFile)
    this.cache.set(paratranzFile, translationFile)
    consola.info(`cache miss: ${paratranzFile.name}`)
    return translationFile
  }

  private async toTranslationFileUncached(paratranzFile: File): Promise<TranslationFile> {
    const fullFile = await this.client.getFile(paratranzFile.id)
    const fileExtra = FileExtraSchema.parse(fullFile.extra)
    const originalContent = [...fileExtra.original]
    const stringItems = await this.client.getStrings(paratranzFile.id)
    const stringItemsMap = new Map(stringItems.map(item => [item.key, item]))

    const sortedProperties = Object.entries(fileExtra.properties)
      .sort(([, a], [, b]) => a.start - b.start)

    const isScript = fileExtra.targetRelpath.startsWith('scripts/')
    const result = []
    let lastEnd = 0

    for (const [key, prop] of sortedProperties) {
      const stringItem = stringItemsMap.get(key)
      if (!stringItem)
        continue

      result.push(...originalContent.slice(lastEnd, prop.start))

      let translation = stringItem.translation
      if (translation) {
        if (isScript) {
          // Convert each part separated by <BR> to unicode, then join back with <BR>
          translation = translation.split('<BR>')
            .map(part => toUnicode(part))
            .join('<BR>')
        }
        result.push(...translation)
      }
      else {
        result.push(...originalContent.slice(prop.start, prop.end))
      }
      lastEnd = prop.end
    }
    result.push(...originalContent.slice(lastEnd))

    let resultString = result.join('')
    if (isScript) {
      resultString = resultString.replace(
        'val _I18N_Lang = "en_US";',
        `val _I18N_Lang = "${this.targetLang}";`,
      )
    }

    return {
      name: paratranzFile.name,
      relpath: fileExtra.targetRelpath || paratranzFile.name.replace(/\.json$/, ''),
      content: resultString,
    }
  }

  async toParatranzFile(file: Filetype): Promise<ParatranzFile> {
    const targetRelpath = file.getTargetLanguageRelpath(this.targetLang)
    const fileName = `${targetRelpath}.json`

    const stringItems: StringItem[] = Object.values(file.properties).map(p => ({
      key: p.key,
      original: p.value,
      context: p.full,
      translation: '',
    }))

    const paratranzProperties: Record<string, { key: string, start: number, end: number }> = {}
    for (const [key, p] of Object.entries(file.properties)) {
      paratranzProperties[key] = {
        key: p.key,
        start: p.start,
        end: p.end,
      }
    }

    const fileExtra = {
      original: file.content,
      properties: paratranzProperties,
      enUsRelpath: file.getEnUsRelpath(),
      targetRelpath,
    }

    consola.info(`toParatranzFile: ${fileName}`)
    return {
      fileName,
      fileExtra,
      stringItems,
    }
  }
}

