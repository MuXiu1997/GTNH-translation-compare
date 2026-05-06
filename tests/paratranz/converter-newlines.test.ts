import type { ParatranzFile } from '~/paratranz/types.ts'
import { describe, expect, it } from 'bun:test'
import { FiletypeLang, Languages } from '~/filetypes/index.ts'
import {
  normalizeNewlines,
  resolveNewlineForm,
  restoreNewlines,
  sniffNewline,
} from '~/paratranz/converter/newlines.ts'

function setupEnv(): void {
  process.env.PARATRANZ_TOKEN ??= 'test-token'
  process.env.PARATRANZ_PROJECT_ID ??= '1'
}

describe('newline conversion helpers', () => {
  it('sniffs, normalizes, and restores supported newline forms', () => {
    expect(sniffNewline('a<BR>b')).toBe('<BR>')
    expect(sniffNewline('a<br>b')).toBe('<br>')
    expect(sniffNewline('a\\\\nb')).toBe('\\\\n')
    expect(sniffNewline('a\\nb')).toBe('\\n')
    expect(sniffNewline('a%nb')).toBe('%n')
    expect(sniffNewline('a\nb')).toBe('LF')

    for (const value of ['a<BR>b', 'a<br>b', 'a\\\\nb', 'a\\nb', 'a%nb', 'a\nb'])
      expect(normalizeNewlines(value)).toBe('a\nb')

    expect(restoreNewlines('a\nb', '<BR>')).toBe('a<BR>b')
    expect(restoreNewlines('a\nb', '<br>')).toBe('a<br>b')
    expect(restoreNewlines('a\nb', '\\\\n')).toBe('a\\\\nb')
    expect(restoreNewlines('a\nb', '\\n')).toBe('a\\nb')
    expect(restoreNewlines('a\nb', '%n')).toBe('a%nb')
    expect(restoreNewlines('a\nb', 'LF')).toBe('a\nb')
  })

  it('uses research page BR fallback before file fallback', () => {
    expect(resolveNewlineForm({ default: '\\n', entries: {} }, 'lang|foo.research_page.1', undefined)).toBe('<BR>')
    expect(resolveNewlineForm({ default: '\\n', entries: {} }, 'lang|foo.research.page.1', undefined)).toBe('<BR>')
  })
})

describe('Converter entry-level newline handling', () => {
  it('round-trips mixed newline forms per entry', async () => {
    setupEnv()
    const { Converter } = await import('~/paratranz/converter/index.ts')

    const file = new FiletypeLang(
      'config/txloader/load/example/lang/en_US.lang',
      [
        'a=one\\ntwo',
        'b=one<BR>two',
        'c=one<br>two',
        'd=one%ntwo',
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
      '@gtnh-newline-form=\\n',
      '@gtnh-newline-form=<BR>',
      '@gtnh-newline-form=<br>',
      '@gtnh-newline-form=%n',
      '@gtnh-newline-form=\\\\n',
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
      'd=甲%n乙',
      'e=甲\\\\n乙',
    ].join('\n'))
  })

  it('recovers entry-level forms from original content when context is absent', async () => {
    setupEnv()
    const { Converter } = await import('~/paratranz/converter/index.ts')

    const file = new FiletypeLang(
      'config/txloader/load/example/lang/en_US.lang',
      [
        'a=one\\ntwo',
        'b=one<BR>two',
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
    const uploadConverter = new Converter(uploadClient, cache, Languages.zh_CN)
    const uploaded = await uploadConverter.toParatranzFile(file)
    const legacyStringItems = uploaded.stringItems.map(({ context: _, ...item }) => item)

    const downloadClient: any = {
      getFile: async () => ({ id: 1, name: uploaded.fileName, modifiedAt: null, extra: uploaded.fileExtra }),
      getStrings: async () => legacyStringItems.map(item => ({
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
      'a=甲\\n乙',
      'b=甲<BR>乙',
    ].join('\n'))
  })
})
