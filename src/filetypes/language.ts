export const Languages = {
  en_US: 'en_US',
  zh_CN: 'zh_CN',
  ja_JP: 'ja_JP',
  ko_KR: 'ko_KR',
  pt_BR: 'pt_BR',
} as const

/**
 * Type representing supported languages
 */
export type Language = (typeof Languages)[keyof typeof Languages]

/**
 * List of all supported languages
 */
export const ALL_LANGUAGES = Object.values(Languages)

/**
 * List of supported languages except English (US)
 */
export const TARGET_LANGUAGES = ALL_LANGUAGES.filter(l => l !== Languages.en_US)

/**
 * Type guard to check if a string is a valid Language
 */
export function isLanguage(lang: string): lang is Language {
  return (ALL_LANGUAGES as string[]).includes(lang)
}

/**
 * Parse a string into a Language, throwing an error if invalid
 */
export function parseLanguage(lang: string): Language {
  if (isLanguage(lang))
    return lang
  throw new Error(`Unknown language: ${lang}`)
}
