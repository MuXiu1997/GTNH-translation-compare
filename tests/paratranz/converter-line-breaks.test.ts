import type { ParatranzFile } from '~/paratranz/types.ts'
import { describe, expect, it } from 'bun:test'
import { FiletypeLang, Languages } from '~/filetypes/index.ts'
import {
  collectLineBreakFormsFromContexts,
  LINE_BREAK_FORMS,
  lineBreakOptionsForKey,
  normalizeLineBreaks,
  resolveLineBreakForm,
  restoreLineBreaks,
  sniffLineBreak,
} from '~/paratranz/converter/line-breaks.ts'

function setupEnv(): void {
  process.env.PARATRANZ_TOKEN ??= 'test-token'
  process.env.PARATRANZ_PROJECT_ID ??= '1'
}

describe('line break conversion helpers', () => {
  it('keeps supported line break forms in one exported list', () => {
    expect(LINE_BREAK_FORMS).toEqual(['<BR>', '<br>', '[br]', '\\\\n', '\\n', '%n', 'LF'])
  })

  it('sniffs, normalizes, and restores supported line break forms', () => {
    expect(sniffLineBreak('a<BR>b')).toBe('<BR>')
    expect(sniffLineBreak('a<br>b')).toBe('<br>')
    expect(sniffLineBreak('a[br]b')).toBe('[br]')
    expect(sniffLineBreak('a\\\\nb')).toBe('\\\\n')
    expect(sniffLineBreak('a\\nb')).toBe('\\n')
    expect(sniffLineBreak('a\\\\\\nb')).toBe('\\\\n')
    expect(sniffLineBreak('a%nb')).toBeUndefined()
    expect(sniffLineBreak('a%nb', { allowPercentN: true })).toBe('%n')
    expect(sniffLineBreak('a%%nb', { allowPercentN: true })).toBeUndefined()
    expect(sniffLineBreak('a%%%nb', { allowPercentN: true })).toBe('%n')
    expect(sniffLineBreak(String.raw`a\\\nb`)).toBe('\\\\n')
    expect(sniffLineBreak('a\nb')).toBe('LF')

    for (const value of ['a<BR>b', 'a<br>b', 'a[br]b', 'a\\\\nb', 'a\\nb', 'a\nb'])
      expect(normalizeLineBreaks(value)).toBe('a\nb')
    expect(normalizeLineBreaks('a%nb')).toBe('a%nb')
    expect(normalizeLineBreaks('a%nb', { allowPercentN: true })).toBe('a\nb')
    expect(normalizeLineBreaks('a%%nb', { allowPercentN: true })).toBe('a%%nb')
    expect(normalizeLineBreaks('a%%%nb', { allowPercentN: true })).toBe('a%%\nb')
    expect(normalizeLineBreaks('a\\\\\\nb')).toBe('a\\\nb')
    expect(normalizeLineBreaks(String.raw`a\\\nb`)).toBe('a\\\nb')

    expect(restoreLineBreaks('a\nb', '<BR>')).toBe('a<BR>b')
    expect(restoreLineBreaks('a\nb', '<br>')).toBe('a<br>b')
    expect(restoreLineBreaks('a\nb', '[br]')).toBe('a[br]b')
    expect(restoreLineBreaks('a\nb', '\\\\n')).toBe('a\\\\nb')
    expect(restoreLineBreaks('a\nb', '\\n')).toBe('a\\nb')
    expect(restoreLineBreaks('a\nb', '%n')).toBe('a%nb')
    expect(restoreLineBreaks('a\nb', 'LF')).toBe('a\nb')
  })

  it('uses research page BR fallback before file fallback', () => {
    expect(resolveLineBreakForm({ default: '\\n', entries: {} }, 'lang|foo.research_page.1', undefined)).toBe('<BR>')
    expect(resolveLineBreakForm({ default: '\\n', entries: {} }, 'lang|foo.research.page.1', undefined)).toBe('<BR>')
  })

  it('reads encoded context markers and current raw markers', () => {
    const forms = collectLineBreakFormsFromContexts([
      { key: 'upper', context: '@gtnh-line-break-form=<BR>-UP' },
      { key: 'upperReturnedFromParatranz', context: '@gtnh-line-break-form=<br>-UP' },
      { key: 'lower', context: '@gtnh-line-break-form=<br>' },
      { key: 'current', context: '@gtnh-line-break-form=[br]' },
    ])
    expect(forms.entries.upper).toBe('<BR>')
    expect(forms.entries.upperReturnedFromParatranz).toBe('<BR>')
    expect(forms.entries.lower).toBe('<br>')
    expect(forms.entries.current).toBe('[br]')
  })

  it('enables percent-n only for betterquesting.quest keys', () => {
    expect(lineBreakOptionsForKey('foo.bar').allowPercentN).toBe(false)
    expect(lineBreakOptionsForKey('betterquesting.quest.42').allowPercentN).toBe(true)
    expect(lineBreakOptionsForKey('BetterQuesting.Quest.42').allowPercentN).toBe(true)

    expect(collectLineBreakFormsFromContexts([
      { key: 'current', context: '@gtnh-line-break-form=%n' },
    ]).entries.current).toBeUndefined()
    expect(collectLineBreakFormsFromContexts([
      { key: 'betterquesting.quest.current', context: '@gtnh-line-break-form=%n' },
    ]).entries['betterquesting.quest.current']).toBe('%n')
  })
})

describe('Converter entry-level line break handling', () => {
  it('round-trips mixed line break forms per entry', async () => {
    setupEnv()
    const { Converter } = await import('~/paratranz/converter/index.ts')

    const file = new FiletypeLang(
      'config/txloader/load/example/lang/en_US.lang',
      [
        'a=one\\ntwo',
        'b=one<BR>two',
        'c=one<br>two',
        'd=one[br]two',
        'e=one\\\\ntwo',
      ].join('\n'),
      Languages.en_US,
    )

    let uploaded: ParatranzFile
    const client: any = {
      findFileIdByName: async () => undefined,
      getFile: async () => ({ id: 1, name: uploaded.fileName, modifiedAt: null, extra: uploaded.fileExtra }),
      getStrings: async () => uploaded.stringItems.map(item => ({
        ...item,
        translation: '甲\n乙',
      })),
    }
    const cache: any = {
      get: () => undefined,
      set: () => {},
    }
    const converter = new Converter(client, cache, Languages.zh_CN)
    uploaded = await converter.toParatranzFile(file)

    expect(uploaded.stringItems.map(item => item.original)).toEqual([
      'one\ntwo',
      'one\ntwo',
      'one\ntwo',
      'one\ntwo',
      'one\ntwo',
    ])
    expect((uploaded.fileExtra as any).newlines).toBeUndefined()
    expect((uploaded.fileExtra as any).enUsRelpath).toBeUndefined()
    expect((uploaded.fileExtra as any).targetRelpath).toBeUndefined()
    expect(uploaded.stringItems.map(item => item.context)).toEqual([
      '@gtnh-line-break-form=\\n',
      '@gtnh-line-break-form=<BR>-UP',
      '@gtnh-line-break-form=<br>',
      '@gtnh-line-break-form=[br]',
      '@gtnh-line-break-form=\\\\n',
    ])
    expect(uploaded.stringItems.every(item => !item.context?.includes('one'))).toBe(true)

    const downloaded = await converter.toTranslationFile({
      id: 1,
      name: uploaded.fileName,
      modifiedAt: null,
      extra: uploaded.fileExtra,
    })

    expect(downloaded.content).toBe([
      'a=甲\\n乙',
      'b=甲<BR>乙',
      'c=甲<br>乙',
      'd=甲[br]乙',
      'e=甲\\\\n乙',
    ].join('\n'))
  })

  it('uses percent-n only for betterquesting.quest keys', async () => {
    setupEnv()
    const { Converter } = await import('~/paratranz/converter/index.ts')

    const file = new FiletypeLang(
      'config/txloader/load/example/lang/en_US.lang',
      [
        'betterquesting.quest.1=one%ntwo',
        'a=one%ntwo',
      ].join('\n'),
      Languages.en_US,
    )

    const cache: any = {
      get: () => undefined,
      set: () => {},
    }
    const uploadClient: any = {
      findFileIdByName: async () => undefined,
    }
    const converter = new Converter(uploadClient, cache, Languages.zh_CN)
    const uploaded = await converter.toParatranzFile(file)

    expect(uploaded.stringItems[0]!.key).toBe('lang|betterquesting.quest.1')
    expect(uploaded.stringItems[0]!.original).toBe('one\ntwo')
    expect(uploaded.stringItems[0]!.context).toBe('@gtnh-line-break-form=%n')
    expect(uploaded.stringItems[1]!.key).toBe('lang|a')
    expect(uploaded.stringItems[1]!.original).toBe('one%ntwo')
    expect(uploaded.stringItems[1]!.context).toBeUndefined()

    const downloadClient: any = {
      getFile: async () => ({
        id: 1,
        name: uploaded.fileName,
        modifiedAt: null,
        extra: uploaded.fileExtra,
      }),
      getStrings: async () => uploaded.stringItems.map(item => ({
        ...item,
        translation: '甲\n乙',
      })),
    }
    const downloadConverter = new Converter(downloadClient, cache, Languages.zh_CN)
    const downloaded = await downloadConverter.toTranslationFile({
      id: 1,
      name: uploaded.fileName,
      modifiedAt: null,
      extra: uploaded.fileExtra,
    })

    expect(downloaded.content).toBe([
      'betterquesting.quest.1=甲%n乙',
      'a=甲\\n乙',
    ].join('\n'))
  })

  it('uses fallback line break context when original has no line break', async () => {
    setupEnv()
    const { Converter } = await import('~/paratranz/converter/index.ts')

    const file = new FiletypeLang(
      'GregTech.lang',
      'a=plain',
      Languages.en_US,
    )

    const cache: any = {
      get: () => undefined,
      set: () => {},
    }
    const uploadClient: any = {
      findFileIdByName: async () => undefined,
    }
    const converter = new Converter(uploadClient, cache, Languages.zh_CN)
    const uploaded = await converter.toParatranzFile(file)

    expect(uploaded.stringItems[0]!.original).toBe('plain')
    expect(uploaded.stringItems[0]!.context).toBe('@gtnh-line-break-form=<BR>-UP')
    expect(uploaded.stringItems[0]!.context).not.toContain('a=plain')
  })

  it('uses context markers instead of inferring line breaks from fileExtra original', async () => {
    setupEnv()
    const { Converter } = await import('~/paratranz/converter/index.ts')

    const file = new FiletypeLang(
      'config/txloader/load/example/lang/en_US.lang',
      'a=one<BR>two',
      Languages.en_US,
    )

    const cache: any = {
      get: () => undefined,
      set: () => {},
    }
    const uploadClient: any = {
      findFileIdByName: async () => undefined,
    }
    const uploadConverter = new Converter(uploadClient, cache, Languages.zh_CN)
    const uploaded = await uploadConverter.toParatranzFile(file)

    const downloadClient: any = {
      getFile: async () => ({ id: 1, name: uploaded.fileName, modifiedAt: null, extra: uploaded.fileExtra }),
      getStrings: async () => uploaded.stringItems.map(item => ({
        ...item,
        context: '@gtnh-line-break-form=<br>',
        translation: '甲\n乙',
      })),
    }
    const downloadConverter = new Converter(downloadClient, cache, Languages.zh_CN)

    const downloaded = await downloadConverter.toTranslationFile({
      id: 1,
      name: uploaded.fileName,
      modifiedAt: null,
      extra: uploaded.fileExtra,
    })

    expect(downloaded.content).toBe('a=甲<br>乙')
  })
})
