export type NewlineForm = 'LF' | '<BR>' | '<br>' | '[br]' | '\\n' | '\\\\n' | '%n'

const NEWLINE_CONTEXT_PREFIX = '@gtnh-newline-form='

export interface NewlineFileForms {
  default?: NewlineForm
  entries: Record<string, NewlineForm>
}

interface RangeProperty {
  start: number
  end: number
}

interface ContextProperty {
  key: string
  context?: string | null
}

export function sniffNewline(value: string): NewlineForm | undefined {
  if (value.includes('<BR>'))
    return '<BR>'
  if (value.includes('<br>'))
    return '<br>'
  if (value.includes('[br]'))
    return '[br]'
  if (value.includes('\\\\n'))
    return '\\\\n'
  if (value.includes('\\n'))
    return '\\n'
  if (value.includes('%n'))
    return '%n'
  if (value.includes('\n'))
    return 'LF'
  return undefined
}

export function normalizeNewlines(value: string): string {
  return value
    .replaceAll('<BR>', '\n')
    .replaceAll('<br>', '\n')
    .replaceAll('[br]', '\n')
    .replaceAll('\\\\n', '\n')
    .replaceAll('\\n', '\n')
    .replaceAll('%n', '\n')
}

export function restoreNewlines(value: string, form: NewlineForm | undefined): string {
  if (form === 'LF')
    return value
  if (form === '\\\\n')
    return value.replaceAll('\n', '\\\\n')
  if (!form || form === '\\n')
    return value.replaceAll('\n', '\\n')
  return value.replaceAll('\n', form)
}

export function appendNewlineFormToContext(context: string, form: NewlineForm | undefined): string {
  if (!form)
    return context
  const strippedContext = stripNewlineFormFromContext(context)
  const marker = `${NEWLINE_CONTEXT_PREFIX}${form}`
  return strippedContext ? `${strippedContext}\n${marker}` : marker
}

export function collectNewlineFormsFromOriginal(
  original: string,
  properties: Record<string, RangeProperty>,
): NewlineFileForms {
  const chars = [...original]
  const entries: Record<string, NewlineForm> = {}
  for (const [key, prop] of Object.entries(properties)) {
    const form = sniffNewline(chars.slice(prop.start, prop.end).join(''))
    if (form)
      entries[key] = form
  }
  return withDefault(entries)
}

export function collectNewlineFormsFromContexts(items: readonly ContextProperty[]): NewlineFileForms {
  const entries: Record<string, NewlineForm> = {}
  for (const item of items) {
    const form = parseNewlineFormFromContext(item.context)
    if (form)
      entries[item.key] = form
  }
  return withDefault(entries)
}

export function mergeNewlineFileForms(
  primary: NewlineFileForms,
  fallback: NewlineFileForms,
): NewlineFileForms {
  const entries = {
    ...fallback.entries,
    ...primary.entries,
  }
  const defaultForm = primary.default ?? fallback.default ?? mostFrequentNewlineForm(entries)
  return {
    ...(defaultForm ? { default: defaultForm } : {}),
    entries,
  }
}

export function resolveNewlineForm(
  forms: NewlineFileForms,
  key: string,
  fallback: NewlineForm | undefined,
): NewlineForm | undefined {
  const normalizedKey = key.toLowerCase()
  return forms.entries[key]
    ?? (normalizedKey.includes('research_page') || normalizedKey.includes('research.page') ? '<BR>' : forms.default)
    ?? fallback
}

function withDefault(entries: Record<string, NewlineForm>): NewlineFileForms {
  const defaultForm = mostFrequentNewlineForm(entries)
  return {
    ...(defaultForm ? { default: defaultForm } : {}),
    entries,
  }
}

function mostFrequentNewlineForm(entries: Record<string, NewlineForm>): NewlineForm | undefined {
  let defaultForm: NewlineForm | undefined
  let defaultCount = 0
  const counts = new Map<NewlineForm, number>()
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

function isNewlineForm(value: unknown): value is NewlineForm {
  return value === 'LF'
    || value === '<BR>'
    || value === '<br>'
    || value === '[br]'
    || value === '\\n'
    || value === '\\\\n'
    || value === '%n'
}

function parseNewlineFormFromContext(context: string | null | undefined): NewlineForm | undefined {
  if (!context)
    return undefined

  const lines = context.split(/\r?\n/)
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i]!.trim()
    if (!line.startsWith(NEWLINE_CONTEXT_PREFIX))
      continue

    const form = line.slice(NEWLINE_CONTEXT_PREFIX.length).trim()
    if (isNewlineForm(form))
      return form
  }
  return undefined
}

function stripNewlineFormFromContext(context: string): string {
  return context
    .split(/\r?\n/)
    .filter(line => !line.trim().startsWith(NEWLINE_CONTEXT_PREFIX))
    .join('\n')
}
