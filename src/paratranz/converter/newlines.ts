export type NewlineForm = '<BR>' | '<br>' | '\\n' | '\\\\n' | '%n'

export interface NewlineFileForms {
  default?: NewlineForm
  entries: Record<string, NewlineForm>
}

interface ValueProperty {
  value: string
}

interface RangeProperty {
  start: number
  end: number
}

export function sniffNewline(value: string): NewlineForm | undefined {
  if (value.includes('<BR>'))
    return '<BR>'
  if (value.includes('<br>'))
    return '<br>'
  if (value.includes('\\\\n'))
    return '\\\\n'
  if (value.includes('\\n'))
    return '\\n'
  if (value.includes('%n'))
    return '%n'
  return undefined
}

export function normalizeNewlines(value: string): string {
  return value
    .replaceAll('<BR>', '\n')
    .replaceAll('<br>', '\n')
    .replaceAll('\\\\n', '\n')
    .replaceAll('\\n', '\n')
    .replaceAll('%n', '\n')
}

export function restoreNewlines(value: string, form: NewlineForm | undefined): string {
  if (form === '\\\\n')
    return value.replaceAll('\n', '\\\\n')
  if (!form || form === '\\n')
    return value.replaceAll('\n', '\\n')
  return value.replaceAll('\n', form)
}

export function collectNewlineFormsFromValues(
  properties: Record<string, ValueProperty>,
): NewlineFileForms {
  const entries: Record<string, NewlineForm> = {}
  for (const [key, prop] of Object.entries(properties)) {
    const form = sniffNewline(prop.value)
    if (form)
      entries[key] = form
  }
  return withDefault(entries)
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

export function normalizeNewlineFileForms(value: unknown): NewlineFileForms {
  if (value == null || typeof value !== 'object')
    return { entries: {} }

  if ('entries' in value) {
    const raw = value as { default?: unknown, entries?: unknown }
    const entries: Record<string, NewlineForm> = {}
    if (raw.entries && typeof raw.entries === 'object') {
      for (const [key, form] of Object.entries(raw.entries)) {
        if (isNewlineForm(form))
          entries[key] = form
      }
    }
    const defaultForm = isNewlineForm(raw.default)
      ? raw.default
      : mostFrequentNewlineForm(entries)
    return {
      ...(defaultForm ? { default: defaultForm } : {}),
      entries,
    }
  }

  const entries: Record<string, NewlineForm> = {}
  for (const [key, form] of Object.entries(value)) {
    if (isNewlineForm(form))
      entries[key] = form
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

export function hasNewlineForms(forms: NewlineFileForms): boolean {
  return forms.default != null || Object.keys(forms.entries).length > 0
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
  return value === '<BR>'
    || value === '<br>'
    || value === '\\n'
    || value === '\\\\n'
    || value === '%n'
}
