// Preloaded only by the CLI integration test. Replaces Axios's network adapter
// with a file-backed fake API; no request can reach ParaTranz.
import type { File, StringItem } from '~/paratranz/types.ts'
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import axios, { AxiosError } from 'axios'

interface StoredFile extends File {
  strings: StringItem[]
}

export interface OfflineState {
  files: StoredFile[]
  requests: string[]
  failure?: { request: string, status: number, remaining: number }
}

const statePath = process.env.PARATRANZ_OFFLINE_STATE
if (!statePath)
  throw new Error('The offline API requires an isolated state file')

axios.defaults.adapter = async (config) => {
  if (config.headers.Authorization !== 'offline-test-token' || !config.url?.startsWith('projects/1/'))
    throw new Error('The offline API accepts only fake project 1 and the dummy token')

  const state: OfflineState = JSON.parse(fs.readFileSync(statePath, 'utf8'))
  const route = config.url
  const method = config.method!
  state.requests.push(`${method.toUpperCase()} ${route}`)

  if (state.failure?.request === `${method.toUpperCase()} ${route}` && state.failure.remaining > 0) {
    state.failure.remaining--
    fs.writeFileSync(statePath, JSON.stringify(state))
    throw new AxiosError('Injected offline failure', AxiosError.ERR_BAD_RESPONSE, config, undefined, {
      config,
      data: { message: 'Injected offline failure' },
      status: state.failure.status,
      statusText: 'Injected failure',
      headers: { 'cache-control': 'no-store', 'retry-after': '0' },
    })
  }

  const fileId = Number(route.match(/^projects\/1\/files\/(\d+)$/)?.[1])
  const file = state.files.find(file => file.id === fileId)
  let data: unknown

  if (method === 'get' && route === 'projects/1/files') {
    data = state.files.map(({ strings, ...file }) => file)
  }
  else if (method === 'get' && route === 'projects/1/strings') {
    const file = state.files.find(file => file.id === Number(config.params.file))
    if (!file)
      throw new Error('Unknown string file')
    data = { pageCount: 1, results: file.strings }
  }
  else if (method === 'get' && file) {
    data = file
  }
  else if (method === 'post' && (file || route === 'projects/1/files')) {
    const form = config.data as FormData
    const upload = form.get('file') as globalThis.File
    const strings: StringItem[] = JSON.parse(await upload.text())
    if (strings.length === 0)
      throw new Error('Empty source files must never be uploaded')

    if (file) {
      // POST /files/{id} updates source text, not existing translations.
      // Live project 5401 verification: changed originals retain their translation
      // but reset a previously translated entry to stage 0.
      const oldStrings = new Map(file.strings.map(item => [item.key, item]))
      file.strings = strings.map((item) => {
        const old = oldStrings.get(item.key)
        return old
          ? {
              ...item,
              translation: old.translation,
              stage: old.original === item.original ? old.stage : 0,
            }
          : item
      })
      file.modifiedAt = new Date(state.requests.length * 1000).toISOString()
      data = {}
    }
    else {
      const created: StoredFile = {
        id: state.files.length + 1,
        name: path.posix.join(String(form.get('path')), upload.name),
        modifiedAt: new Date(state.requests.length * 1000).toISOString(),
        strings,
      }
      state.files.push(created)
      data = { file: { id: created.id } }
    }
  }
  else if (method === 'put' && file) {
    file.extra = JSON.parse(config.data).extra
    file.modifiedAt = new Date(state.requests.length * 1000).toISOString()
    data = {}
  }
  else {
    throw new Error(`Unexpected offline request: ${method} ${route}`)
  }

  fs.writeFileSync(statePath, JSON.stringify(state))
  return { config, data, status: 200, statusText: 'OK', headers: { 'cache-control': 'no-store' } }
}
