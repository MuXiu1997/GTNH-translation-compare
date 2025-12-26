const WIN_ILLEGAL_CHARS = /[\\/:*?"<>|]/g

/**
 * Replaces illegal characters in a string with an underscore.
 * @param name string that may contain illegal characters
 * @returns string with illegal characters replaced with an underscore
 */
export function replaceIllegalCharacters(name: string): string {
  return name.replace(WIN_ILLEGAL_CHARS, '_')
}

/**
 * Ensure a multi-line string is made up of LF as a line break.
 * @param s multi-line string
 * @returns multi-line string with LF as a line break
 */
export function ensureLf(s: string): string {
  return s.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
}
