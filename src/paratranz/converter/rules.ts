import type { NewlineForm } from './newlines.ts'
import type { Language } from '~/filetypes/language.ts'
import { dirname } from 'node:path'
import * as settings from '~/settings.ts'
import { toUnicode } from '~/utils/unicode.ts'
import { restoreNewlines } from './newlines.ts'

export interface NewlineRule {
  /** Match the file path */
  match: (relpath: string) => boolean
  /** Legacy fallback when no entry-level form can be recovered. */
  fallbackForm?: NewlineForm
  /** Optional entry-level restoration hook. */
  restore?: (text: string, form: NewlineForm | undefined) => string
  /** Optional post-processing for the entire file content after assembly */
  postProcess?: (text: string, targetLang: Language) => string
}

export class ScriptNewlineRule implements NewlineRule {
  match = (relpath: string): boolean => {
    return relpath.startsWith('scripts/')
  }

  fallbackForm: NewlineForm = '<BR>'

  restore = (text: string, form: NewlineForm | undefined): string => {
    return text.split('\n')
      .map(part => toUnicode(part))
      .join(form ?? this.fallbackForm)
  }

  postProcess = (text: string, targetLang: Language): string => {
    return text.replace(
      'val _I18N_Lang = "en_US";',
      `val _I18N_Lang = "${targetLang}";`,
    )
  }
}

export class QuestNewlineRule implements NewlineRule {
  match = (relpath: string): boolean => {
    return relpath.startsWith(dirname(settings.DEFAULT_QUESTS_LANG_TARGET_REL_PATH))
  }

  fallbackForm: NewlineForm = '%n'
}

export class GTLangNewlineRule implements NewlineRule {
  match = (relpath: string): boolean => {
    return relpath.endsWith('GregTech.lang')
  }

  fallbackForm: NewlineForm = '<BR>'
}

export class NewlineRules {
  private static readonly all: NewlineRule[] = [
    new ScriptNewlineRule(),
    new QuestNewlineRule(),
    new GTLangNewlineRule(),
  ]

  static find(relpath: string): NewlineRule | undefined {
    return this.all.find(rule => rule.match(relpath))
  }

  static restoreValue(
    relpath: string,
    text: string,
    form: NewlineForm | undefined,
  ): string {
    const rule = this.find(relpath)
    const resolvedForm = form ?? rule?.fallbackForm
    return rule?.restore
      ? rule.restore(text, resolvedForm)
      : restoreNewlines(text, resolvedForm)
  }
}
