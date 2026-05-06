export const LINE_BREAK_FORMS = ['<BR>', '<br>', '[br]', '\\\\n', '\\n', '%n', 'LF'] as const
export type LineBreakForm = typeof LINE_BREAK_FORMS[number]

const LINE_BREAK_CONTEXT_PREFIX = '@gtnh-line-break-form='
const LINE_BREAK_PLACEHOLDER_FORMS = LINE_BREAK_FORMS.filter(
  (form): form is Exclude<LineBreakForm, 'LF'> => form !== 'LF',
)
const LINE_BREAK_FORM_SET = new Set<LineBreakForm>(LINE_BREAK_FORMS)

export interface LineBreakFileForms {
  default?: LineBreakForm
  entries: Record<string, LineBreakForm>
}

interface RangeProperty {
  start: number
  end: number
}

interface ContextProperty {
  key: string
  context?: string | null
}

export function sniffLineBreak(value: string): LineBreakForm | undefined {
  for (const form of LINE_BREAK_PLACEHOLDER_FORMS) {
    if (value.includes(form))
      return form
  }
  if (value.includes('\n'))
    return 'LF'
  return undefined
}

export function normalizeLineBreaks(value: string): string {
  let normalized = value
  for (const form of LINE_BREAK_PLACEHOLDER_FORMS)
    normalized = normalized.replaceAll(form, '\n')
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
  const marker = `${LINE_BREAK_CONTEXT_PREFIX}${form}`
  return strippedContext ? `${strippedContext}\n${marker}` : marker
}

export function collectLineBreakFormsFromOriginal(
  original: string,
  properties: Record<string, RangeProperty>,
): LineBreakFileForms {
  const chars = [...original]
  const entries: Record<string, LineBreakForm> = {}
  for (const [key, prop] of Object.entries(properties)) {
    const form = sniffLineBreak(chars.slice(prop.start, prop.end).join(''))
    if (form)
      entries[key] = form
  }
  return withDefault(entries)
}

export function collectLineBreakFormsFromContexts(items: readonly ContextProperty[]): LineBreakFileForms {
  const entries: Record<string, LineBreakForm> = {}
  for (const item of items) {
    const form = parseLineBreakFormFromContext(item.context)
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
  const defaultForm = primary.default ?? fallback.default ?? mostFrequentLineBreakForm(entries)
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
  const normalizedKey = key.toLowerCase()
  return forms.entries[key]
    ?? (normalizedKey.includes('research_page') || normalizedKey.includes('research.page') ? '<BR>' : forms.default)
    ?? fallback
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

function parseLineBreakFormFromContext(context: string | null | undefined): LineBreakForm | undefined {
  if (!context)
    return undefined

  const lines = context.split(/\r?\n/)
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i]!.trim()
    if (!line.startsWith(LINE_BREAK_CONTEXT_PREFIX))
      continue

    const form = line.slice(LINE_BREAK_CONTEXT_PREFIX.length).trim()
    if (isLineBreakForm(form))
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
