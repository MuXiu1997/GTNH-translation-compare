import process from 'node:process'
import { Builtins, Cli, Command, Option } from 'clipanion'
import { consola } from 'consola'
import { Action } from '~/action.ts'

const action = new Action()

abstract class BaseCommand extends Command {
  async execute() {
    try {
      await this.run()
    }
    catch (error) {
      consola.error(error)
      process.exit(1)
    }
  }

  abstract run(): Promise<void>
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
    await action.paratranzToQuestBook(this.repoPath, this.issue, this.message)
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
    await action.paratranzToLangAndZs(this.repoPath, this.issue, this.message)
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
    await action.paratranzToGtLang(this.repoPath, this.issue, this.message)
  }
}

class ToParatranzQuestBookCommand extends BaseCommand {
  static override paths = [['to-paratranz:quest-book']]
  static override usage = Command.Usage({
    description: 'Upload quest book to Paratranz',
  })

  sha = Option.String('-s,--sha', 'master', { description: 'Commit SHA or branch name' })

  async run() {
    await action.questBookToParatranz(this.sha)
  }
}

class ToParatranzLangAndZsCommand extends BaseCommand {
  static override paths = [['to-paratranz:lang-zs']]
  static override usage = Command.Usage({
    description: 'Upload lang and zs files to Paratranz',
  })

  modpackPath = Option.String({ name: 'modpack-path', required: true })

  async run() {
    await action.langAndZsToParatranz(this.modpackPath)
  }
}

class ToParatranzGtLangCommand extends BaseCommand {
  static override paths = [['to-paratranz:gt-lang']]
  static override usage = Command.Usage({
    description: 'Upload GT lang files to Paratranz',
  })

  url = Option.String({ name: 'url', required: true })

  async run() {
    await action.gtLangToParatranz(this.url)
  }
}

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

// eslint-disable-next-line antfu/no-top-level-await
await cli.runExit(process.argv.slice(2))
