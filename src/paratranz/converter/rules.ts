import type { LineBreakForm } from './line-breaks.ts'
import type { Language } from '~/filetypes/language.ts'
import { dirname } from 'node:path'
import * as settings from '~/settings.ts'
import { toUnicode } from '~/utils/unicode.ts'
import { restoreLineBreaks } from './line-breaks.ts'

export interface LineBreakRule {
  /** Match the file path */
  match: (relpath: string) => boolean
  /** Legacy fallback when no entry-level form can be recovered. */
  fallbackForm?: LineBreakForm
  /** Optional entry-level restoration hook. */
  restore?: (text: string, form: LineBreakForm | undefined) => string
  /** Optional post-processing for the entire file content after assembly */
  postProcess?: (text: string, targetLang: Language) => string
}

export class ScriptLineBreakRule implements LineBreakRule {
  match = (relpath: string): boolean => {
    return relpath.startsWith('scripts/')
  }

  fallbackForm: LineBreakForm = '<BR>'

  restore = (text: string, form: LineBreakForm | undefined): string => {
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

export class QuestLineBreakRule implements LineBreakRule {
  match = (relpath: string): boolean => {
    return relpath.startsWith(dirname(settings.DEFAULT_QUESTS_LANG_TARGET_REL_PATH))
  }

  fallbackForm: LineBreakForm = '%n'
}

export class GTLangLineBreakRule implements LineBreakRule {
  match = (relpath: string): boolean => {
    return relpath.endsWith('GregTech.lang')
  }

  fallbackForm: LineBreakForm = '<BR>'
}

export class LineBreakRules {
  private static readonly all: LineBreakRule[] = [
    new ScriptLineBreakRule(),
    new QuestLineBreakRule(),
    new GTLangLineBreakRule(),
  ]

  static find(relpath: string): LineBreakRule | undefined {
    return this.all.find(rule => rule.match(relpath))
  }

  static restoreValue(
    relpath: string,
    text: string,
    form: LineBreakForm | undefined,
  ): string {
    const rule = this.find(relpath)
    const resolvedForm = form ?? rule?.fallbackForm
    return rule?.restore
      ? rule.restore(text, resolvedForm)
      : restoreLineBreaks(text, resolvedForm)
  }
}
