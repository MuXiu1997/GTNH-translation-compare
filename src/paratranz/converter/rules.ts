import type { LineBreakForm } from './line-breaks.ts'
import type { Language } from '~/filetypes/language.ts'
import { isGuideNhPagePath } from '~/filetypes/filetype-guidenh-page.ts'
import { isMarkdownTooltipPath } from '~/filetypes/filetype-markdown-tooltip.ts'
import { ensureLf } from '~/utils/file.ts'
import { toUnicode } from '~/utils/unicode.ts'
import { restoreLineBreaks } from './line-breaks.ts'

export interface LineBreakRule {
  /** Match the file path */
  match: (relpath: string) => boolean
  /** Legacy fallback when no entry-level form can be recovered. */
  fallbackForm?: LineBreakForm
  /** Files with native line breaks can bypass lang-style placeholder normalization. */
  normalize?: (text: string) => string
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

export class GTLangLineBreakRule implements LineBreakRule {
  match = (relpath: string): boolean => {
    return relpath.endsWith('GregTech.lang')
  }

  fallbackForm: LineBreakForm = '<BR>'
}

export class MarkdownTooltipLineBreakRule implements LineBreakRule {
  match = (relpath: string): boolean => {
    return isMarkdownTooltipPath(relpath)
  }

  fallbackForm: LineBreakForm = 'LF'

  restore = (text: string): string => {
    return text
      .replaceAll('\\r\\n', '\n')
      .replaceAll('\\n', '\n')
  }
}

export class GuideNhPageLineBreakRule implements LineBreakRule {
  match = isGuideNhPagePath
  fallbackForm: LineBreakForm = 'LF'
  // Markdown already has physical lines. Do not interpret <br>, [br], or
  // backslashes inside code/math as the placeholders used by .lang files.
  normalize = ensureLf

  restore = (text: string): string => {
    const normalized = ensureLf(text)
    // Preserve native multi-line Markdown. ParaTranz's single-line editor can
    // return a whole page on one escaped line, which needs real line breaks.
    return normalized.includes('\n')
      ? normalized
      : normalized.replaceAll('\\r\\n', '\n').replaceAll('\\n', '\n')
  }
}

export class LineBreakRules {
  private static readonly all: LineBreakRule[] = [
    new ScriptLineBreakRule(),
    new GTLangLineBreakRule(),
    new MarkdownTooltipLineBreakRule(),
    new GuideNhPageLineBreakRule(),
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
