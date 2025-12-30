import type { Filetype } from '~/filetypes/filetype.ts'
import type { TranslationFile } from '~/paratranz/types.ts'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import process from 'node:process'
import { $ } from 'bun'
import chalk from 'chalk'
import { Builtins, Cli, Command, Option } from 'clipanion'
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
  protected dryRunDir?: string

  async execute() {
    try {
      if (this.dryRun) {
        this.dryRunDir = await fs.mkdtemp(path.join(os.tmpdir(), 'gtnh-translation-compare-'))
        log.withTag('Dry Run').info(`Created temporary directory: ${chalk.yellowBright.underline(this.dryRunDir)}`)
      }
      await this.run()
    }
    catch (error) {
      log.error(error)
      process.exit(1)
    }
  }

  abstract run(): Promise<void>

  protected async paratranzToTranslation(
    repoPath: string,
    filter: ParatranzFilenameFilter,
    afterToTranslationFileCallback?: AfterToTranslationFileCallback,
    raiseWhenEmpty?: Error,
    message?: string,
    issue?: string,
  ): Promise<void> {
    const l = log.withTag(`${this.constructor.name}.paratranzToTranslation`)
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

    const translationFilepaths: string[] = []
    for (const translationFile of translationFiles) {
      if (!translationFile.relpath) {
        l.warn(`Translation file ${chalk.blueBright.bold(translationFile.name)} has empty relpath, skipping...`)
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
      l.success(`Translation file ${chalk.blueBright.bold(translationFile.name)} written to ${chalk.yellowBright.underline(translationFilepath)}`)
    }

    if (message) {
      await this.gitCommit(
        repoPath,
        translationFilepaths,
        message,
        issue,
        settings.CLOSE_ISSUE_IN_COMMIT_MESSAGE,
      )
    }
  }

  protected async uploadFile(file: Filetype): Promise<void> {
    const l = log.withTag(`${this.constructor.name}.uploadFile`)
    const paratranzFile = await this.converter.toParatranzFile(file)
    if (this.dryRun) {
      const dryRunPath = path.resolve(this.dryRunDir!, `${paratranzFile.fileName}.json`)
      await fs.mkdir(path.dirname(dryRunPath), { recursive: true })
      await fs.writeFile(dryRunPath, JSON.stringify(paratranzFile, null, 2))
      l.info(`${chalk.gray.bold('(Dry Run)')} ${this.constructor.name}.uploadFile(${chalk.blueBright.bold(paratranzFile.fileName)}) - dry run file saved to ${chalk.yellowBright.underline(dryRunPath)}`)
      return
    }
    await this.client.uploadFile(paratranzFile)
    log.withTag(`${this.constructor.name}.uploadFile`).success(`${chalk.green.bold(paratranzFile.fileName)} uploaded to Paratranz`)
  }

  private async gitCommit(
    gitRoot: string,
    paths: string[],
    message: string,
    issue?: string,
    closeIssueInCommitMessage = true,
  ): Promise<void> {
    const l = log.withTag(`${this.constructor.name}.gitCommit`)
    let commitMessage = message
    if (issue && closeIssueInCommitMessage) {
      commitMessage += `\n\nclosed #${issue}`
    }

    if (settings.CO_AUTHORED_BY) {
      const coAuthors = settings.CO_AUTHORED_BY.split('\n').filter(line => line.trim() !== '')
      if (coAuthors.length > 0) {
        commitMessage += '\n'
        for (const author of coAuthors) {
          commitMessage += `\nCo-authored-by: ${author.trim()}`
        }
      }
    }

    if (this.dryRun) {
      l.success(`${chalk.gray.bold('(Dry Run)')} Committed: ${chalk.green.underline(JSON.stringify(commitMessage))}`)
      return
    }

    await $`git config user.name "github-actions[bot]"`.cwd(gitRoot)
    await $`git config user.email "41898282+github-actions[bot]@users.noreply.github.com"`.cwd(gitRoot)
    await $`git add ${paths}`.cwd(gitRoot)
    await $`git commit -m ${commitMessage}`.cwd(gitRoot)
    l.success(`Committed: ${chalk.green.underline(JSON.stringify(commitMessage))}`)
  }
}

class FromParatranzQuestBookCommand extends BaseCommand {
  static override paths = [['from-paratranz:quest-book']]
  static override usage = Command.Usage({
    description: 'Update quest book from Paratranz',
  })

  repoPath = Option.String('-r,--repo-path', { description: 'Path to the repository', required: true })
  issue = Option.String('-i,--issue', { description: 'Issue ID' })
  message = Option.String('-m,--message', { description: 'Commit message' })

  async run() {
    const filter: ParatranzFilenameFilter = name => name === `${settings.DEFAULT_QUESTS_LANG_TARGET_REL_PATH}.json`
    await this.paratranzToTranslation(
      this.repoPath,
      filter,
      undefined,
      new Error('No quest book file found'),
      this.message ?? '[自动化] 更新 任务书',
      this.issue,
    )
  }
}

class FromParatranzLangAndZsCommand extends BaseCommand {
  static override paths = [['from-paratranz:lang-zs']]
  static override usage = Command.Usage({
    description: 'Update lang and zs files from Paratranz',
  })

  repoPath = Option.String('-r,--repo-path', { description: 'Path to the repository', required: true })
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
      this.repoPath,
      filter,
      undefined,
      new Error('No lang or zs file found'),
      this.message ?? '[自动化] 更新 语言文件 + 脚本',
      this.issue,
    )
  }
}

class FromParatranzGtLangCommand extends BaseCommand {
  static override paths = [['from-paratranz:gt-lang']]
  static override usage = Command.Usage({
    description: 'Update GT lang files from Paratranz',
  })

  repoPath = Option.String('-r,--repo-path', { description: 'Path to the repository', required: true })
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
      this.repoPath,
      filter,
      afterToTranslationFileCallback,
      new Error('No gt lang file found'),
      this.message ?? '[自动化] 更新 GT 语言文件',
      this.issue,
    )
  }
}

class ToParatranzQuestBookCommand extends BaseCommand {
  static override paths = [['to-paratranz:quest-book']]
  static override usage = Command.Usage({
    description: 'Upload quest book to Paratranz',
  })

  sha = Option.String('-s,--commit-sha', 'master', { description: 'Commit SHA or branch name' })

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

  modpackPath = Option.String('-m,--modpack-path', { description: 'Path to the modpack', required: true })

  async run() {
    const modpack = new ModPack(this.modpackPath)

    for (const file of modpack.langFiles) {
      await this.uploadFile(file)
    }
    for (const file of modpack.scriptFiles) {
      await this.uploadFile(file)
    }
  }
}

class ToParatranzGtLangCommand extends BaseCommand {
  static override paths = [['to-paratranz:gt-lang']]
  static override usage = Command.Usage({
    description: 'Upload GT lang files to Paratranz',
  })

  url = Option.String('-u,--gt-lang-url', { description: 'URL of the GT lang file', required: true })

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
