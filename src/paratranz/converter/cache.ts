import type { File, TranslationFile } from '~/paratranz/types.ts'
import fs from 'node:fs'
import path from 'node:path'
import { Database } from 'bun:sqlite'
import { TranslationFileSchema } from '~/paratranz/types.ts'

export class ConverterCache {
  readonly #db: Database

  constructor(cacheDir: string) {
    if (!fs.existsSync(cacheDir)) {
      fs.mkdirSync(cacheDir, { recursive: true })
    }
    const dbPath = path.join(cacheDir, 'converter-cache.sqlite')
    this.#db = new Database(dbPath)
    this.#db.run('PRAGMA journal_mode = WAL;')
    this.#db.run(`
      CREATE TABLE IF NOT EXISTS converter_cache (
        name TEXT,
        modified_at TEXT,
        data TEXT,
        last_accessed_at INTEGER,
        PRIMARY KEY (name, modified_at)
      )
    `)
    this.cleanup()
  }

  cleanup(maxAgeMs: number = 30 * 24 * 60 * 60 * 1000): void {
    const threshold = Date.now() - maxAgeMs
    this.#db.run('DELETE FROM converter_cache WHERE last_accessed_at < ?', [threshold])
  }

  get(f: File): TranslationFile | undefined {
    try {
      const row = this.#db.query('SELECT data, last_accessed_at FROM converter_cache WHERE name = ? AND modified_at = ?')
        .get(f.name, f.modifiedAt ?? '') as { data: string, last_accessed_at: number } | null

      if (!row)
        return undefined

      const now = Date.now()
      // Update access time only if it's been more than 1 week to reduce writes
      if (now - row.last_accessed_at > 7 * 24 * 60 * 60 * 1000) {
        this.#db.run(
          'UPDATE converter_cache SET last_accessed_at = ? WHERE name = ? AND modified_at = ?',
          [now, f.name, f.modifiedAt ?? ''],
        )
      }

      return TranslationFileSchema.parse(JSON.parse(row.data))
    }
    catch {
      return undefined
    }
  }

  set(f: File, translationFile: TranslationFile): void {
    this.#db.run(
      'INSERT OR REPLACE INTO converter_cache (name, modified_at, data, last_accessed_at) VALUES (?, ?, ?, ?)',
      [f.name, f.modifiedAt ?? '', JSON.stringify(translationFile), Date.now()],
    )
  }
}

