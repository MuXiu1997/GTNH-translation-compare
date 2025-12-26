export interface Property {
  /** The unique identifier of the entry */
  key: string
  /** The value of the entry */
  value: string
  /** The full text of the entry */
  full: string
  /** The start position of the entry in the file */
  start: number
  /** The end position of the entry in the file */
  end: number
}
