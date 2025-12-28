import type { AxiosCacheInstance } from 'axios-cache-interceptor'
import type { File, ParatranzFile, StringItem } from '~/paratranz/types.ts'
import fs from 'node:fs'
import path from 'node:path'
import { consola } from 'consola'
import pLimit from 'p-limit'
import {
  FileSchema,
  StringPageSchema,
} from '~/paratranz/types.ts'
import { createHttpClient } from './http-client.ts'

export class ClientWrapper {
  readonly #client: AxiosCacheInstance
  readonly #projectId: number

  constructor(token: string, projectId: number, cacheDir: string) {
    this.#projectId = projectId

    if (!fs.existsSync(cacheDir)) {
      fs.mkdirSync(cacheDir, { recursive: true })
    }

    this.#client = createHttpClient(token, cacheDir)
  }

  async getAllFiles(): Promise<File[]> {
    const res = await this.#client.get(`projects/${this.#projectId}/files`)

    if (res.cached) {
      consola.info('getAllFiles: cache hit')
    }
    else {
      consola.info('getAllFiles: cache miss')
    }

    return res.data.map((f: any) => FileSchema.parse(f))
  }

  async getFile(fileId: number): Promise<File> {
    const res = await this.#client.get(`projects/${this.#projectId}/files/${fileId}`)
    return FileSchema.parse(res.data)
  }

  async getStrings(fileId: number): Promise<StringItem[]> {
    const limit = pLimit(5)
    const pageSize = 50

    // Get first page to find out total page count
    const firstPageRes = await this.#client.get(`projects/${this.#projectId}/strings`, {
      params: { file: fileId, page: 1, pageSize },
    })
    const firstPage = StringPageSchema.parse(firstPageRes.data)

    const results: StringItem[] = [...firstPage.results]
    const tasks = []

    for (let page = 2; page <= firstPage.pageCount; page++) {
      tasks.push(limit(async () => {
        consola.debug(`[getStrings] started: fileId=${fileId}, page=${page}/${firstPage.pageCount}`)
        const res = await this.#client.get(`projects/${this.#projectId}/strings`, {
          params: { file: fileId, page, pageSize },
        })
        const pageData = StringPageSchema.parse(res.data)
        consola.log(`[getStrings] finished: fileId=${fileId}, page=${page}/${firstPage.pageCount}, ${res.cached ? 'cached' : 'not cached'}`)
        consola.debug(`[getStrings] finished: fileId=${fileId}, page=${page}/${firstPage.pageCount}`)
        return pageData.results
      }))
    }

    const remainingPages = await Promise.all(tasks)
    for (const pageResults of remainingPages) {
      results.push(...pageResults)
    }

    consola.info(`[getStrings] finished_all: fileId=${fileId}, totalStrings=${results.length}`)
    return results
  }

  async uploadFile(paratranzFile: ParatranzFile): Promise<void> {
    const fileId = await this.#findFileIdByName(paratranzFile.fileName)

    if (fileId === undefined) {
      await this.#createFile(paratranzFile)
    }
    else {
      await this.#updateFile(fileId, paratranzFile)
    }

    // Always update extra
    const finalFileId = fileId ?? await this.#findFileIdByName(paratranzFile.fileName)
    if (finalFileId !== undefined) {
      await this.#saveFileExtra(finalFileId, paratranzFile)
    }
  }

  async #findFileIdByName(name: string): Promise<number | undefined> {
    const files = await this.getAllFiles()
    return files.find(f => f.name === name)?.id
  }

  async #createFile(paratranzFile: ParatranzFile): Promise<number> {
    const filePath = path.dirname(paratranzFile.fileName)
    const formData = new FormData()
    formData.append('path', filePath)

    const [fileName, content] = this.#getFileToBeUploaded(paratranzFile)
    const blob = new Blob([content], { type: 'application/json' })
    formData.append('file', blob, fileName)

    const res = await this.#client.post(`projects/${this.#projectId}/files`, formData)
    consola.success(`createFile: path=${filePath}, file=${fileName}`)
    return res.data.file.id
  }

  async #updateFile(fileId: number, paratranzFile: ParatranzFile): Promise<void> {
    const oldStrings = await this.getStrings(fileId)
    const oldStringsMap = new Map(oldStrings.map(s => [s.key, s]))

    // Merge old translations if they match original text
    for (const s of paratranzFile.stringItems) {
      const old = oldStringsMap.get(s.key)
      if (old && old.original === s.original) {
        if (!s.translation && old.translation) {
          s.translation = old.translation
          s.stage = 1
        }
      }
    }

    const [fileName, content] = this.#getFileToBeUploaded(paratranzFile)
    const formData = new FormData()
    const blob = new Blob([content], { type: 'application/json' })
    formData.append('file', blob, fileName)

    await this.#client.post(`projects/${this.#projectId}/files/${fileId}`, formData)
    consola.success(`updateFile: fileId=${fileId}, file=${fileName}`)
  }

  async #saveFileExtra(fileId: number, paratranzFile: ParatranzFile): Promise<void> {
    await this.#client.put(`projects/${this.#projectId}/files/${fileId}`, {
      extra: paratranzFile.fileExtra,
    })
    consola.success(`saveFileExtra: fileId=${fileId}`)
  }

  #getFileToBeUploaded(paratranzFile: ParatranzFile): [string, string] {
    return [
      path.basename(paratranzFile.fileName),
      JSON.stringify(paratranzFile.stringItems.map((s) => {
        const item: any = { ...s }
        // Clean undefined fields for API
        Object.keys(item).forEach(key => item[key] === undefined && delete item[key])
        return item
      })),
    ]
  }
}
