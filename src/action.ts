import type { TranslationFile } from '~/paratranz/types.ts'
import { spawnSync } from 'node:child_process'
import fs from 'node:fs/promises'
import path from 'node:path'
import { consola } from 'consola'
import { FiletypeGTLang } from '~/filetypes/filetype-gt-lang.ts'
import { FiletypeLang } from '~/filetypes/filetype-lang.ts'
import { Languages } from '~/filetypes/language.ts'
import { ModPack } from '~/modpack/modpack.ts'
import { ClientWrapper } from '~/paratranz/api/index.ts'
import { ConverterCache } from '~/paratranz/converter/cache.ts'
import { Converter } from '~/paratranz/converter/index.ts'
import * as settings from '~/settings.ts'
import { ensureLf } from '~/utils/file.ts'

export type ParatranzFilenameFilter = (name: string) => boolean
export type AfterToTranslationFileCallback = (translationFile: TranslationFile) => void

export class Action {
  private readonly client: ClientWrapper
  private readonly converter: Converter

  constructor() {
    this.client = new ClientWrapper(
      settings.PARATRANZ_TOKEN,
      settings.PARATRANZ_PROJECT_ID,
      settings.PARATRANZ_CACHE_DIR,
    )
    this.converter = new Converter(
      this.client,
      new ConverterCache(settings.PARATRANZ_CACHE_DIR),
      settings.TARGET_LANG,
    )
  }

  private async paratranzToTranslation(
    filter: ParatranzFilenameFilter,
    afterToTranslationFileCallback?: AfterToTranslationFileCallback,
    raiseWhenEmpty?: Error,
    message?: string,
    repoPath?: string,
    issue?: string,
  ): Promise<void> {
    const translationFiles: TranslationFile[] = []
    const allFiles = await this.client.getAllFiles()

    for (const f of allFiles) {
      if (filter(f.name)) {
        const translationFile = await this.converter.toTranslationFile(f)
        afterToTranslationFileCallback?.(translationFile)
        translationFiles.push(translationFile)
      }
    }

    if (translationFiles.length === 0) {
      if (raiseWhenEmpty) {
        throw raiseWhenEmpty
      }
      return
    }

    if (!repoPath) {
      for (const translationFile of translationFiles) {
        consola.log('#'.repeat(80))
        consola.log(`# ${translationFile.relpath}`)
        consola.log('#'.repeat(80))
        consola.log(translationFile.content, '\n\n')
      }
      return
    }

    const translationFilepaths: string[] = []
    for (const translationFile of translationFiles) {
      if (!translationFile.relpath) {
        consola.error(`Translation file ${translationFile.name} has empty relpath, skipping...`)
        continue
      }
      const translationFilepath = path.resolve(repoPath, translationFile.relpath)
      translationFilepaths.push(translationFilepath)
      await fs.mkdir(path.dirname(translationFilepath), { recursive: true })
      try {
        await fs.writeFile(translationFilepath, translationFile.content)
      }
      catch (error: any) {
        if (error.code === 'EISDIR') {
          throw new Error(`Failed to write to ${translationFilepath}: It is a directory. Please check if relpath "${translationFile.relpath}" of file "${translationFile.name}" is correct.`)
        }
        throw error
      }
    }

    if (message) {
      this.gitCommit(
        repoPath,
        translationFilepaths,
        settings.GIT_AUTHOR,
        message,
        issue,
        settings.CLOSE_ISSUE_IN_COMMIT_MESSAGE,
      )
    }
  }

  // From Paratranz
  async paratranzToQuestBook(
    repoPath?: string,
    issue?: string,
    commitMessage = '[自动化] 更新 任务书',
  ): Promise<void> {
    const filter: ParatranzFilenameFilter = name => name === `${settings.DEFAULT_QUESTS_LANG_TARGET_REL_PATH}.json`
    await this.paratranzToTranslation(
      filter,
      undefined,
      new Error('No quest book file found'),
      commitMessage,
      repoPath,
      issue,
    )
  }

  async paratranzToLangAndZs(
    repoPath?: string,
    issue?: string,
    commitMessage = '[自动化] 更新 语言文件 + 脚本',
  ): Promise<void> {
    const filter: ParatranzFilenameFilter = (name) => {
      return (
        name.endsWith('.lang.json')
        && name !== `${settings.DEFAULT_QUESTS_LANG_TARGET_REL_PATH}.json`
        && name !== `${settings.GT_LANG_TARGET_REL_PATH}.json`
      ) || name.endsWith('.zs.json')
    }

    await this.paratranzToTranslation(
      filter,
      undefined,
      new Error('No lang or zs file found'),
      commitMessage,
      repoPath,
      issue,
    )
  }

  async paratranzToGtLang(
    repoPath?: string,
    issue?: string,
    commitMessage = '[自动化] 更新 GT 语言文件',
  ): Promise<void> {
    const filter: ParatranzFilenameFilter = name => name === `${settings.GT_LANG_TARGET_REL_PATH}.json`
    const afterToTranslationFileCallback: AfterToTranslationFileCallback = (translationFile) => {
      translationFile.content = translationFile.content.replace(
        'B:UseThisFileAsLanguageFile=false',
        'B:UseThisFileAsLanguageFile=true',
      )
    }

    await this.paratranzToTranslation(
      filter,
      afterToTranslationFileCallback,
      new Error('No gt lang file found'),
      commitMessage,
      repoPath,
      issue,
    )
  }

  // To Paratranz
  async questBookToParatranz(commitSha = 'master'): Promise<void> {
    const qbLangFileUrl = `https://raw.githubusercontent.com/${settings.GTNH_REPO}/${commitSha}/${settings.DEFAULT_QUESTS_LANG_TEMPLATE_REL_PATH}`
    const res = await fetch(qbLangFileUrl)
    if (!res.ok) {
      throw new Error(`Failed to get quest book file from ${qbLangFileUrl}`)
    }
    const text = await res.text()
    const qbLangFile = new FiletypeLang(
      settings.DEFAULT_QUESTS_LANG_EN_US_REL_PATH,
      text,
      Languages.en_US,
    )
    const qbParatranzFile = await this.converter.toParatranzFile(qbLangFile)
    await this.client.uploadFile(qbParatranzFile)
  }

  async langAndZsToParatranz(modpackPath: string): Promise<void> {
    const modpack = new ModPack(modpackPath)
    const limit = (await import('p-limit')).default(10)

    const tasks = [
      ...modpack.langFiles.map(file => limit(() => this.uploadFile(file))),
      ...modpack.scriptFiles.map(file => limit(() => this.uploadFile(file))),
    ]

    await Promise.all(tasks)
  }

  async gtLangToParatranz(gtLangUrl: string): Promise<void> {
    const res = await fetch(gtLangUrl)
    if (!res.ok) {
      throw new Error(`Failed to get gt lang file from ${gtLangUrl}`)
    }
    const text = await res.text()
    const gtLangFile = new FiletypeGTLang(
      settings.GT_LANG_TARGET_REL_PATH,
      ensureLf(text),
      Languages.en_US,
    )
    const gtParatranzFile = await this.converter.toParatranzFile(gtLangFile)
    await this.client.uploadFile(gtParatranzFile)
  }

  private async uploadFile(file: any): Promise<void> {
    const paratranzFile = await this.converter.toParatranzFile(file)
    await this.client.uploadFile(paratranzFile)
  }

  private gitCommit(
    gitRoot: string,
    paths: string[],
    author: string | null,
    message: string,
    issue?: string,
    closeIssueInCommitMessage = true,
  ): void {
    const argsAdd = ['add', ...paths]
    spawnSync('git', argsAdd, { cwd: gitRoot })

    let commitMessage = message
    if (issue && closeIssueInCommitMessage) {
      commitMessage += `\n\nclosed #${issue}`
    }

    const argsCommit = ['commit', '-m', commitMessage]
    if (author) {
      argsCommit.push('--author', author)
    }
    spawnSync('git', argsCommit, { cwd: gitRoot })
    consola.success(`Committed: ${message}`)
  }
}
