import type { TranslationFile } from '~/paratranz/types.ts'
import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { $ } from 'bun'
import { Builtins, Cli, Command, Option } from 'clipanion'
import { consola } from 'consola'
import { FiletypeGTLang } from '~/filetypes/filetype-gt-lang.ts'
import { FiletypeLang } from '~/filetypes/filetype-lang.ts'
import { Languages } from '~/filetypes/language.ts'
import { log } from '~/log'
import { ModPack } from '~/modpack/modpack.ts'
import { ClientWrapper } from '~/paratranz/api/index.ts'
import { ConverterCache } from '~/paratranz/converter/cache.ts'
import { Converter } from '~/paratranz/converter/index.ts'
import * as settings from '~/settings.ts'
import { ensureLf } from '~/utils/file.ts'

export type ParatranzFilenameFilter = (name: string) => boolean
export type AfterToTranslationFileCallback = (translationFile: TranslationFile) => void

abstract class BaseCommand extends Command {
  protected readonly client = new ClientWrapper(
    settings.PARATRANZ_TOKEN,
    settings.PARATRANZ_PROJECT_ID,
    settings.PARATRANZ_CACHE_DIR,
  )

  protected readonly converter = new Converter(
    this.client,
    new ConverterCache(settings.PARATRANZ_CACHE_DIR),
    settings.TARGET_LANG,
  )

  dryRun = Option.Boolean('--dry-run', false, { description: 'Do not upload/commit changes' })

  async execute() {
    try {
      await this.run()
    }
    catch (error) {
      log.error(error)
      process.exit(1)
    }
  }

  abstract run(): Promise<void>

  protected async paratranzToTranslation(
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

      if (this.dryRun) {
        log.info(`[Dry Run] Writing file: ${translationFilepath}`)
        continue
      }

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
      await this.gitCommit(
        repoPath,
        translationFilepaths,
        settings.GIT_AUTHOR,
        message,
        issue,
        settings.CLOSE_ISSUE_IN_COMMIT_MESSAGE,
      )
    }
  }

  protected async uploadFile(file: any): Promise<void> {
    const paratranzFile = await this.converter.toParatranzFile(file)
    if (this.dryRun) {
      const dryRunPath = path.resolve(process.cwd(), '.dry-run.local', `${paratranzFile.fileName}.json`)
      await fs.mkdir(path.dirname(dryRunPath), { recursive: true })
      await fs.writeFile(dryRunPath, JSON.stringify(paratranzFile, null, 2))
      log.info(`[Dry Run] Writing Paratranz file: ${dryRunPath}`)
      return
    }
    await this.client.uploadFile(paratranzFile)
  }

  private async gitCommit(
    gitRoot: string,
    paths: string[],
    author: string | null,
    message: string,
    issue?: string,
    closeIssueInCommitMessage = true,
  ): Promise<void> {
    if (this.dryRun) {
      log.info(`[Dry Run] Git commit: ${message}`)
      return
    }

    await $`git add ${paths}`.cwd(gitRoot)

    let commitMessage = message
    if (issue && closeIssueInCommitMessage) {
      commitMessage += `\n\nclosed #${issue}`
    }

    const argsCommit = ['commit', '-m', commitMessage]
    if (author) {
      argsCommit.push('--author', author)
    }
    await $`git ${argsCommit}`.cwd(gitRoot)
    consola.success(`Committed: ${message}`)
  }
}

class FromParatranzQuestBookCommand extends BaseCommand {
  static override paths = [['from-paratranz:quest-book']]
  static override usage = Command.Usage({
    description: 'Update quest book from Paratranz',
  })

  repoPath = Option.String('-r,--repo-path', { description: 'Path to the repository' })
  issue = Option.String('-i,--issue', { description: 'Issue ID' })
  message = Option.String('-m,--message', { description: 'Commit message' })

  async run() {
    const filter: ParatranzFilenameFilter = name => name === `${settings.DEFAULT_QUESTS_LANG_TARGET_REL_PATH}.json`
    await this.paratranzToTranslation(
      filter,
      undefined,
      new Error('No quest book file found'),
      this.message ?? '[自动化] 更新 任务书',
      this.repoPath,
      this.issue,
    )
  }
}

class FromParatranzLangAndZsCommand extends BaseCommand {
  static override paths = [['from-paratranz:lang-zs']]
  static override usage = Command.Usage({
    description: 'Update lang and zs files from Paratranz',
  })

  repoPath = Option.String('-r,--repo-path', { description: 'Path to the repository' })
  issue = Option.String('-i,--issue', { description: 'Issue ID' })
  message = Option.String('-m,--message', { description: 'Commit message' })

  async run() {
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
      this.message ?? '[自动化] 更新 语言文件 + 脚本',
      this.repoPath,
      this.issue,
    )
  }
}

class FromParatranzGtLangCommand extends BaseCommand {
  static override paths = [['from-paratranz:gt-lang']]
  static override usage = Command.Usage({
    description: 'Update GT lang files from Paratranz',
  })

  repoPath = Option.String('-r,--repo-path', { description: 'Path to the repository' })
  issue = Option.String('-i,--issue', { description: 'Issue ID' })
  message = Option.String('-m,--message', { description: 'Commit message' })

  async run() {
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
      this.message ?? '[自动化] 更新 GT 语言文件',
      this.repoPath,
      this.issue,
    )
  }
}

class ToParatranzQuestBookCommand extends BaseCommand {
  static override paths = [['to-paratranz:quest-book']]
  static override usage = Command.Usage({
    description: 'Upload quest book to Paratranz',
  })

  sha = Option.String('-s,--sha', 'master', { description: 'Commit SHA or branch name' })

  async run() {
    const qbLangFileUrl = `https://raw.githubusercontent.com/${settings.GTNH_REPO}/${this.sha}/${settings.DEFAULT_QUESTS_LANG_TEMPLATE_REL_PATH}`
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
    await this.uploadFile(qbLangFile)
  }
}

class ToParatranzLangAndZsCommand extends BaseCommand {
  static override paths = [['to-paratranz:lang-zs']]
  static override usage = Command.Usage({
    description: 'Upload lang and zs files to Paratranz',
  })

  modpackPath = Option.String({ name: 'modpack-path', required: true })

  async run() {
    const modpack = new ModPack(this.modpackPath)
    const limit = (await import('p-limit')).default(10)

    const tasks = [
      ...modpack.langFiles.map(file => limit(() => this.uploadFile(file))),
      ...modpack.scriptFiles.map(file => limit(() => this.uploadFile(file))),
    ]

    await Promise.all(tasks)
  }
}

class ToParatranzGtLangCommand extends BaseCommand {
  static override paths = [['to-paratranz:gt-lang']]
  static override usage = Command.Usage({
    description: 'Upload GT lang files to Paratranz',
  })

  url = Option.String({ name: 'url', required: true })

  async run() {
    const res = await fetch(this.url)
    if (!res.ok) {
      throw new Error(`Failed to get gt lang file from ${this.url}`)
    }
    const text = await res.text()
    const gtLangFile = new FiletypeGTLang(
      settings.GT_LANG_TARGET_REL_PATH,
      ensureLf(text),
      Languages.en_US,
    )
    await this.uploadFile(gtLangFile)
  }
}

export async function run() {
  const cli = new Cli({
    binaryLabel: 'gtnh-translation-compare',
    binaryName: 'gtnh-translation-compare',
    binaryVersion: '1.0.0',
  })

  cli.register(FromParatranzQuestBookCommand)
  cli.register(FromParatranzLangAndZsCommand)
  cli.register(FromParatranzGtLangCommand)
  cli.register(ToParatranzQuestBookCommand)
  cli.register(ToParatranzLangAndZsCommand)
  cli.register(ToParatranzGtLangCommand)
  cli.register(Builtins.HelpCommand)
  cli.register(Builtins.VersionCommand)

  await cli.runExit(process.argv.slice(2))
}
