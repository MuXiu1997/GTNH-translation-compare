import type { AxiosCacheInstance } from 'axios-cache-interceptor'
import type { File, ParatranzFile, StringItem } from '~/paratranz/types.ts'
import fs from 'node:fs'
import path from 'node:path'
import { group } from '@actions/core'
import chalk from 'chalk'
import pLimit from 'p-limit'
import { log } from '~/log'
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
    const res = await this.#client.request<unknown[]>({
      method: 'get',
      url: `projects/${this.#projectId}/files`,
    })
    return res.data.map(f => FileSchema.parse(f))
  }

  async getFile(fileId: number): Promise<File> {
    const res = await this.#client.request<unknown>({
      method: 'get',
      url: `projects/${this.#projectId}/files/${fileId}`,
    })
    return FileSchema.parse(res.data)
  }

  async getStrings(fileId: number): Promise<StringItem[]> {
    const limit = pLimit(5)
    const pageSize = 100
    const l = log.withTag('ClientWrapper.getStrings')
    return await group(`ClientWrapper.getStrings (fileId: ${fileId})`, async () => {
      l.debug(`Starting to fetch strings for fileId: ${fileId}`)

      // Get first page to find out total page count
      const firstPageRes = await this.#client.request<unknown>({
        method: 'get',
        url: `projects/${this.#projectId}/strings`,
        params: { file: fileId, page: 1, pageSize },
      })
      const firstPage = StringPageSchema.parse(firstPageRes.data)
      const totalPages = firstPage.pageCount
      l.info(`Fetched page ${chalk.magentaBright.bold(1)} / ${chalk.gray(totalPages)}${firstPageRes.cached ? ` ${chalk.gray('[')}${chalk.green('cache hit')}${chalk.gray(']')}` : ''}`)

      const results: StringItem[] = [...firstPage.results]
      const tasks = []

      for (let page = 2; page <= totalPages; page++) {
        tasks.push(limit(async () => {
          l.debug(`Fetching page ${chalk.magentaBright.bold(page)} / ${chalk.gray(totalPages)} ...`)
          const res = await this.#client.request<unknown>({
            method: 'get',
            url: `projects/${this.#projectId}/strings`,
            params: { file: fileId, page, pageSize },
          })
          const pageData = StringPageSchema.parse(res.data)
          l.info(`Fetched page ${chalk.magentaBright.bold(page)} / ${chalk.gray(totalPages)}${res.cached ? ` ${chalk.gray('[')}${chalk.green('cache hit')}${chalk.gray(']')}` : ''}`)
          return pageData.results
        }))
      }

      const remainingPages = await Promise.all(tasks)
      for (const pageResults of remainingPages) {
        results.push(...pageResults)
      }

      l.success(`Finished fetching all strings. Total: ${results.length}`)
      return results
    })
  }

  async uploadFile(paratranzFile: ParatranzFile): Promise<void> {
    let fileId = await this.findFileIdByName(paratranzFile.fileName)
    let action: 'create' | 'update'

    if (fileId == null) {
      fileId = await this.#createFile(paratranzFile)
      action = 'create'
    }
    else {
      await this.#updateFile(fileId, paratranzFile)
      action = 'update'
    }

    // Always update extra
    if (fileId == null) {
      throw new Error(`Failed to get fileId for [${paratranzFile.fileName}] after ${action}`)
    }
    await this.#saveFileExtra(fileId, paratranzFile)
  }

  async findFileIdByName(name: string): Promise<number | undefined> {
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

    const res = await this.#client.request<{ file: { id: number } }>({
      method: 'post',
      url: `projects/${this.#projectId}/files`,
      data: formData,
    })
    const l = log.withTag('ClientWrapper.#createFile')
    l.success(`ClientWrapper.#createFile(${chalk.blueBright.bold(paratranzFile.fileName)})`)
    return res.data.file.id
  }

  async #updateFile(fileId: number, paratranzFile: ParatranzFile): Promise<void> {
    const [fileName, content] = this.#getFileToBeUploaded(paratranzFile)
    const formData = new FormData()
    const blob = new Blob([content], { type: 'application/json' })
    formData.append('file', blob, fileName)

    await this.#client.request<void>({
      method: 'post',
      url: `projects/${this.#projectId}/files/${fileId}`,
      data: formData,
    })
    const l = log.withTag('ClientWrapper.#updateFile')
    l.success(`ClientWrapper.#updateFile(${chalk.blueBright.bold(paratranzFile.fileName)}, fileId=${chalk.green(fileId)})`)
  }

  async #saveFileExtra(fileId: number, paratranzFile: ParatranzFile): Promise<void> {
    await this.#client.request<void>({
      method: 'put',
      url: `projects/${this.#projectId}/files/${fileId}`,
      data: {
        extra: paratranzFile.fileExtra,
      },
    })
    const l = log.withTag('ClientWrapper.#saveFileExtra')
    l.success(`ClientWrapper.#saveFileExtra(${chalk.blueBright.bold(paratranzFile.fileName)}, fileId=${chalk.green(fileId)})`)
  }

  #getFileToBeUploaded(paratranzFile: ParatranzFile): [string, string] {
    return [
      path.basename(paratranzFile.fileName),
      JSON.stringify(paratranzFile.stringItems),
    ]
  }
}
