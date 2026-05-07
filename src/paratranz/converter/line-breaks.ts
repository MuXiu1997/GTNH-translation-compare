export const LINE_BREAK_FORMS = ['<BR>', '<br>', '[br]', '\\\\n', '\\n', '%n', 'LF'] as const
export type LineBreakForm = typeof LINE_BREAK_FORMS[number]

const LINE_BREAK_CONTEXT_PREFIX = '@gtnh-line-break-form='
const PERCENT_N_LINE_BREAK_FORM = '%n' satisfies LineBreakForm
const SLASH_N_LINE_BREAK_FORM = '\\n' satisfies LineBreakForm
const BETTER_QUESTING_QUEST_KEY = 'betterquesting.quest'
const LINE_BREAK_PLACEHOLDER_FORMS = LINE_BREAK_FORMS.filter(
  (form): form is Exclude<LineBreakForm, 'LF'> => form !== 'LF',
)
const LINE_BREAK_FORM_SET = new Set<LineBreakForm>(LINE_BREAK_FORMS)
const LINE_BREAK_CONTEXT_VALUES: Record<LineBreakForm, string> = {
  '<BR>': '<BR>-UP',
  '<br>': '<br>',
  '[br]': '[br]',
  '\\\\n': '\\\\n',
  '\\n': '\\n',
  '%n': '%n',
  'LF': 'LF',
}

export interface LineBreakOptions {
  allowPercentN?: boolean
}

export interface LineBreakFileForms {
  default?: LineBreakForm
  entries: Record<string, LineBreakForm>
}

interface ContextProperty {
  key: string
  context?: string | null
}

export function lineBreakOptionsForKey(key: string): LineBreakOptions {
  return {
    allowPercentN: isBetterQuestingQuestKey(key),
  }
}

export function isBetterQuestingQuestKey(key: string): boolean {
  return key.toLowerCase().includes(BETTER_QUESTING_QUEST_KEY)
}

export function sniffLineBreak(value: string, options: LineBreakOptions = {}): LineBreakForm | undefined {
  for (const form of placeholderForms(options)) {
    const hasForm = form === PERCENT_N_LINE_BREAK_FORM
      ? hasUnescapedPercentN(value)
      : form === SLASH_N_LINE_BREAK_FORM
        ? hasUnescapedSlashN(value)
        : value.includes(form)
    if (hasForm)
      return form
  }
  if (value.includes('\n'))
    return 'LF'
  return undefined
}

export function normalizeLineBreaks(value: string, options: LineBreakOptions = {}): string {
  let normalized = value
  for (const form of placeholderForms(options)) {
    normalized = form === PERCENT_N_LINE_BREAK_FORM
      ? replaceUnescapedPercentN(normalized)
      : form === SLASH_N_LINE_BREAK_FORM
        ? replaceUnescapedSlashN(normalized)
        : normalized.replaceAll(form, '\n')
  }
  return normalized
}

export function restoreLineBreaks(value: string, form: LineBreakForm | undefined): string {
  if (form === 'LF')
    return value
  return value.replaceAll('\n', form ?? '\\n')
}

export function appendLineBreakFormToContext(context: string, form: LineBreakForm | undefined): string {
  if (!form)
    return context
  const strippedContext = stripLineBreakFormFromContext(context)
  const marker = `${LINE_BREAK_CONTEXT_PREFIX}${LINE_BREAK_CONTEXT_VALUES[form]}`
  return strippedContext ? `${strippedContext}\n${marker}` : marker
}

export function collectLineBreakFormsFromContexts(
  items: readonly ContextProperty[],
): LineBreakFileForms {
  const entries: Record<string, LineBreakForm> = {}
  for (const item of items) {
    const form = parseLineBreakFormFromContext(item.context, lineBreakOptionsForKey(item.key))
    if (form)
      entries[item.key] = form
  }
  return withDefault(entries)
}

export function mergeLineBreakFileForms(
  primary: LineBreakFileForms,
  fallback: LineBreakFileForms,
): LineBreakFileForms {
  const entries = {
    ...fallback.entries,
    ...primary.entries,
  }
  const defaultForm = primary.default
    ?? fallback.default
    ?? mostFrequentLineBreakForm(entries)
  return {
    ...(defaultForm ? { default: defaultForm } : {}),
    entries,
  }
}

export function resolveLineBreakForm(
  forms: LineBreakFileForms,
  key: string,
  fallback: LineBreakForm | undefined,
): LineBreakForm | undefined {
  const options = lineBreakOptionsForKey(key)
  const normalizedKey = key.toLowerCase()
  return allowedLineBreakForm(forms.entries[key], options)
    ?? (normalizedKey.includes('research_page') || normalizedKey.includes('research.page')
      ? '<BR>'
      : allowedLineBreakForm(forms.default, options))
    ?? allowedLineBreakForm(fallback, options)
    ?? (options.allowPercentN ? PERCENT_N_LINE_BREAK_FORM : undefined)
}

function withDefault(entries: Record<string, LineBreakForm>): LineBreakFileForms {
  const defaultForm = mostFrequentLineBreakForm(entries)
  return {
    ...(defaultForm ? { default: defaultForm } : {}),
    entries,
  }
}

function mostFrequentLineBreakForm(entries: Record<string, LineBreakForm>): LineBreakForm | undefined {
  let defaultForm: LineBreakForm | undefined
  let defaultCount = 0
  const counts = new Map<LineBreakForm, number>()
  for (const form of Object.values(entries)) {
    const count = (counts.get(form) ?? 0) + 1
    counts.set(form, count)
    if (count > defaultCount) {
      defaultForm = form
      defaultCount = count
    }
  }
  return defaultForm
}

function isLineBreakForm(value: unknown): value is LineBreakForm {
  return typeof value === 'string' && LINE_BREAK_FORM_SET.has(value as LineBreakForm)
}

function parseLineBreakFormFromContext(
  context: string | null | undefined,
  options: LineBreakOptions,
): LineBreakForm | undefined {
  if (!context)
    return undefined

  const lines = context.split(/\r?\n/)
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i]!.trim()
    if (!line.startsWith(LINE_BREAK_CONTEXT_PREFIX))
      continue

    const form = decodeLineBreakContextValue(line.slice(LINE_BREAK_CONTEXT_PREFIX.length).trim())
    if (form && allowedLineBreakForm(form, options))
      return form
  }
  return undefined
}

function stripLineBreakFormFromContext(context: string): string {
  return context
    .split(/\r?\n/)
    .filter(line => !line.trim().startsWith(LINE_BREAK_CONTEXT_PREFIX))
    .join('\n')
}

function placeholderForms(options: LineBreakOptions): readonly Exclude<LineBreakForm, 'LF'>[] {
  return LINE_BREAK_PLACEHOLDER_FORMS.filter(form => allowedLineBreakForm(form, options))
}

function allowedLineBreakForm(
  form: LineBreakForm | undefined,
  options: LineBreakOptions,
): LineBreakForm | undefined {
  if (form === PERCENT_N_LINE_BREAK_FORM && !options.allowPercentN)
    return undefined
  return form
}

function decodeLineBreakContextValue(value: string): LineBreakForm | undefined {
  if (value === '<BR>-UP' || value === '<br>-UP')
    return '<BR>'

  for (const [form, contextValue] of Object.entries(LINE_BREAK_CONTEXT_VALUES)) {
    if (value === contextValue)
      return form as LineBreakForm
  }
  return isLineBreakForm(value) ? value : undefined
}

function hasUnescapedPercentN(value: string): boolean {
  for (let i = 0; i < value.length - 1; i++) {
    if (value[i] === '%' && value[i + 1] === 'n' && isUnescapedPercentNAt(value, i))
      return true
  }
  return false
}

function replaceUnescapedPercentN(value: string): string {
  let result = ''
  let i = 0
  while (i < value.length) {
    if (i < value.length - 1 && value[i] === '%' && value[i + 1] === 'n' && isUnescapedPercentNAt(value, i)) {
      result += '\n'
      i += 2
      continue
    }
    result += value[i]
    i++
  }
  return result
}

function isUnescapedPercentNAt(value: string, index: number): boolean {
  let consecutivePercents = 0
  for (let i = index - 1; i >= 0 && value[i] === '%'; i--)
    consecutivePercents++
  return consecutivePercents % 2 === 0
}

function hasUnescapedSlashN(value: string): boolean {
  for (let i = 0; i < value.length - 1; i++) {
    if (value[i] === '\\' && value[i + 1] === 'n' && isUnescapedSlashNAt(value, i))
      return true
  }
  return false
}

function replaceUnescapedSlashN(value: string): string {
  let result = ''
  let i = 0
  while (i < value.length) {
    if (i < value.length - 1 && value[i] === '\\' && value[i + 1] === 'n' && isUnescapedSlashNAt(value, i)) {
      result += '\n'
      i += 2
      continue
    }
    result += value[i]
    i++
  }
  return result
}

function isUnescapedSlashNAt(value: string, index: number): boolean {
  let consecutiveSlashes = 0
  for (let i = index - 1; i >= 0 && value[i] === '\\'; i--)
    consecutiveSlashes++
  return consecutiveSlashes % 2 === 0
}
