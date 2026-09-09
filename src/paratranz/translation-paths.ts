import { isGuideNhPagePath } from '~/filetypes/filetype-guidenh-page.ts'

const PARATRANZ_DUPLICATE_SUFFIX_RE = /\s*\(\+\d+\)$/
const BRACKETED_MOD_DOMAIN_RE = /\[([^[\]]+)\]$/
const BARE_MOD_DOMAIN_RE = /^[\w.-]+$/

export type LocalRelpathConverter = (relpath: string) => string

interface TranslationFileWithRelpath {
  relpath: string
}

interface PathCandidate<T extends TranslationFileWithRelpath> {
  file: T
  localRelpath: string
  sourceRelpath: string
}

export function markdownTooltipToLocalRelpath(relpath: string): string {
  const parts = normalizedParts(relpath)

  if (
    parts.length >= 8
    && parts[0] === 'config'
    && parts[1] === 'txloader'
    && parts[2] === 'load'
    && parts[4] === 'lang'
    && parts[6] === 'tooltip'
    && parts.at(-1)!.endsWith('.md')
  ) {
    return parts.join('/')
  }

  if (
    parts.length < 6
    || parts[0] !== 'resources'
    || parts[2] !== 'lang'
    || parts[4] !== 'tooltip'
    || !parts.at(-1)!.endsWith('.md')
  ) {
    throw new Error(`Invalid markdown tooltip relpath: ${relpath}`)
  }

  return resourcePartsToLocalRelpath(parts, 'markdown tooltip')
}

export function guideNhPageToLocalRelpath(relpath: string): string {
  const parts = normalizedParts(relpath)

  if (
    parts[0] === 'config' && parts[1] === 'txloader' && parts[2] === 'load'
    && parts[4] === 'guidenh' && isGuideNhPagePath(parts.slice(4).join('/'))
    && BARE_MOD_DOMAIN_RE.test(parts[3] ?? '')
  ) {
    return parts.join('/')
  }

  if (parts[0] !== 'resources' || parts[2] !== 'guidenh' || !isGuideNhPagePath(parts.slice(2).join('/')))
    throw new Error(`Invalid GuideNH page relpath: ${relpath}`)

  return resourcePartsToLocalRelpath(parts, 'GuideNH page')
}

function resourcePartsToLocalRelpath(parts: string[], kind: string): string {
  const resourceFolder = parts[1]!
  const bracketedDomain = BRACKETED_MOD_DOMAIN_RE.exec(resourceFolder)?.[1]
  const modDomain = bracketedDomain
    ?? (BARE_MOD_DOMAIN_RE.test(resourceFolder) ? resourceFolder : undefined)

  if (!modDomain || !BARE_MOD_DOMAIN_RE.test(modDomain)) {
    throw new Error(`Could not extract mod domain from ${kind} relpath: ${parts.join('/')}`)
  }

  return [
    'config',
    'txloader',
    'load',
    modDomain,
    ...parts.slice(2),
  ].join('/')
}

export function convertAndDedupeTranslationFiles<T extends TranslationFileWithRelpath>(
  files: readonly T[],
  toLocalRelpath: LocalRelpathConverter,
): T[] {
  const bestByCaseInsensitivePath = new Map<string, PathCandidate<T>>()
  const pathOrder: string[] = []

  for (const file of files) {
    const sourceRelpath = normalizeSeparators(file.relpath)
    const localRelpath = normalizeSeparators(toLocalRelpath(sourceRelpath))
    const key = localRelpath.toLowerCase()
    const candidate = { file, localRelpath, sourceRelpath }
    const existing = bestByCaseInsensitivePath.get(key)

    if (!existing) {
      bestByCaseInsensitivePath.set(key, candidate)
      pathOrder.push(key)
    }
    else if (compareCandidates(candidate, existing) < 0) {
      bestByCaseInsensitivePath.set(key, candidate)
    }
  }

  return pathOrder.map((key) => {
    const candidate = bestByCaseInsensitivePath.get(key)!
    return {
      ...candidate.file,
      relpath: candidate.localRelpath,
    }
  })
}

function compareCandidates<T extends TranslationFileWithRelpath>(
  a: PathCandidate<T>,
  b: PathCandidate<T>,
): number {
  const uppercaseDifference = uppercaseCount(a.localRelpath) - uppercaseCount(b.localRelpath)
  if (uppercaseDifference !== 0)
    return uppercaseDifference

  const duplicateDifference = duplicateSuffixCount(a.sourceRelpath) - duplicateSuffixCount(b.sourceRelpath)
  if (duplicateDifference !== 0)
    return duplicateDifference

  if (a.sourceRelpath < b.sourceRelpath)
    return -1
  if (a.sourceRelpath > b.sourceRelpath)
    return 1
  return 0
}

function normalizedParts(relpath: string): string[] {
  const normalized = normalizeSeparators(relpath)
  if (normalized.startsWith('/') || normalized.split('/').includes('..')) {
    throw new Error(`Invalid relative path: ${relpath}`)
  }
  return normalized
    .split('/')
    .filter(part => part !== '' && part !== '.')
    .map(stripDuplicateSuffix)
}

function normalizeSeparators(relpath: string): string {
  return relpath.replaceAll('\\', '/')
}

function stripDuplicateSuffix(part: string): string {
  return part.replace(PARATRANZ_DUPLICATE_SUFFIX_RE, '')
}

function duplicateSuffixCount(relpath: string): number {
  return relpath
    .split('/')
    .filter(part => PARATRANZ_DUPLICATE_SUFFIX_RE.test(part))
    .length
}

function uppercaseCount(value: string): number {
  let count = 0
  for (const char of value) {
    if (char >= 'A' && char <= 'Z')
      count++
  }
  return count
}
