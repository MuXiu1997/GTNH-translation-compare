import type { AxiosStorage, StorageValue } from 'axios-cache-interceptor'
import { buildStorage } from 'axios-cache-interceptor'
import { Database } from 'bun:sqlite'
import fs from 'node:fs'
import path from 'node:path'

export function buildSQLiteCacheStorage(cacheDir: string): AxiosStorage {
  if (!fs.existsSync(cacheDir)) {
    fs.mkdirSync(cacheDir, { recursive: true })
  }
  const dbPath = path.join(cacheDir, 'http-cache.sqlite')
  const db = new Database(dbPath)
  db.run('PRAGMA journal_mode = WAL;')

  db.run(`
    CREATE TABLE IF NOT EXISTS http_cache (
      key TEXT PRIMARY KEY,
      value TEXT,
      last_accessed_at INTEGER
    )
  `)

  const cleanup = (maxAgeMs: number = 30 * 24 * 60 * 60 * 1000) => {
    const threshold = Date.now() - maxAgeMs
    db.run('DELETE FROM http_cache WHERE last_accessed_at < ?', [threshold])
  }
  cleanup()

  return buildStorage({
    find(key) {
      const row = db.query('SELECT value, last_accessed_at FROM http_cache WHERE key = ?').get(key) as { value: string, last_accessed_at: number } | null
      if (!row)
        return undefined

      const now = Date.now()
      if (now - (row.last_accessed_at ?? 0) > 7 * 24 * 60 * 60 * 1000) {
        db.run('UPDATE http_cache SET last_accessed_at = ? WHERE key = ?', [now, key])
      }

      try {
        return JSON.parse(row.value) as StorageValue
      }
      catch {
        return undefined
      }
    },
    set(key, value) {
      db.query('INSERT OR REPLACE INTO http_cache (key, value, last_accessed_at) VALUES (?, ?, ?)').run(key, JSON.stringify(value), Date.now())
    },
    remove(key) {
      db.query('DELETE FROM http_cache WHERE key = ?').run(key)
    },
    clear() {
      db.query('DELETE FROM http_cache').run()
    },
  })
}
