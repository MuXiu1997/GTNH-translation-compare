import { dirname } from 'node:path'
import * as settings from '~/settings.ts'
import { toUnicode } from '~/utils/unicode.ts'

export interface NewlineRule {
  /** 匹配文件路径 */
  match: (relpath: string) => boolean
  /** 导入 Paratranz 时的转换 (占位符 -> \n) */
  toParatranz: (text: string) => string
  /** 从 Paratranz 导出时的转换 (\n -> 占位符) */
  fromParatranz: (text: string) => string
}

export class ScriptNewlineRule implements NewlineRule {
  match(relpath: string): boolean {
    return relpath.startsWith('scripts/')
  }

  toParatranz(text: string): string {
    return text.replaceAll('<BR>', '\n')
  }

  fromParatranz(text: string): string {
    // Convert each part separated by \n to unicode, then join back with <BR>
    return text.split('\n')
      .map(part => toUnicode(part))
      .join('<BR>')
  }
}

export class QuestNewlineRule implements NewlineRule {
  match(relpath: string): boolean {
    return relpath.startsWith(dirname(settings.DEFAULT_QUESTS_LANG_TARGET_REL_PATH))
  }

  toParatranz(text: string): string {
    return text.replaceAll('%n', '\n')
  }

  fromParatranz(text: string): string {
    return text.replaceAll('\n', '%n')
  }
}

export class GTLangNewlineRule implements NewlineRule {
  match(relpath: string): boolean {
    return relpath.endsWith('GregTech.lang')
  }

  toParatranz(text: string): string {
    return text.replaceAll('<BR>', '\n')
  }

  fromParatranz(text: string): string {
    return text.replaceAll('\n', '<BR>')
  }
}

export class NewlineRuleManager {
  private static rules: NewlineRule[] = [
    new ScriptNewlineRule(),
    new QuestNewlineRule(),
    new GTLangNewlineRule(),
  ]

  static getRule(relpath: string): NewlineRule | undefined {
    return this.rules.find(rule => rule.match(relpath))
  }
}
