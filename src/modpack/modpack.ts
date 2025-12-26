import fs from 'node:fs'
import path from 'node:path'
import { Glob } from 'bun'
import { FiletypeLang, FiletypeScript } from '~/filetypes/index.ts'
import { Mod } from '~/modpack/mod.ts'
import { ensureLf } from '~/utils/file.ts'

export class ModPack {
  readonly #packPath: string
  #langFiles?: FiletypeLang[]
  #scriptFiles?: FiletypeScript[]

  constructor(packPath: string) {
    const modsGlob = new Glob('mods')
    const nestedModsGlob = new Glob('*/mods')

    if (Array.from(modsGlob.scanSync({ cwd: packPath, onlyFiles: false })).length === 1) {
      this.#packPath = packPath
    }
    else {
      const nested = Array.from(nestedModsGlob.scanSync({ cwd: packPath, onlyFiles: false }))
      if (nested.length === 1) {
        this.#packPath = path.join(packPath, path.dirname(nested[0]!))
      }
      else {
        this.#packPath = packPath
      }
    }
  }

  get langFiles(): FiletypeLang[] {
    if (this.#langFiles === undefined) {
      this.#langFiles = this.parseLangFiles()
    }
    return this.#langFiles
  }

  private parseLangFiles(): FiletypeLang[] {
    const langFiles: FiletypeLang[] = []
    const jarGlob = new Glob('mods/**/*.jar')

    for (const jarRelativePath of jarGlob.scanSync({ cwd: this.#packPath })) {
      const jarPath = path.join(this.#packPath, jarRelativePath)
      const mod = new Mod(jarPath)

      for (const [filename, content] of Object.entries(mod.langFiles)) {
        const parts = filename.split('/')
        const subModId = parts[1]!
        const relPathInsideResources = parts.slice(2).join('/')

        langFiles.push(
          new FiletypeLang(
            `resources/${mod.modName}[${subModId}]/${relPathInsideResources}`,
            content,
          ),
        )
      }
    }
    return langFiles
  }

  get scriptFiles(): FiletypeScript[] {
    if (this.#scriptFiles === undefined) {
      this.#scriptFiles = this.parseScriptFiles()
    }
    return this.#scriptFiles
  }

  private parseScriptFiles(): FiletypeScript[] {
    const scriptFiles: FiletypeScript[] = []
    const scriptGlob = new Glob('scripts/*.zs')
    const decoder = new TextDecoder()

    for (const scriptRelativePath of scriptGlob.scanSync({ cwd: this.#packPath })) {
      const scriptPath = path.join(this.#packPath, scriptRelativePath)

      const rawContent = decoder.decode(fs.readFileSync(scriptPath))

      const file = new FiletypeScript(
        `scripts/${path.basename(scriptRelativePath)}`,
        ensureLf(rawContent),
      )

      if (Object.keys(file.properties).length > 0) {
        scriptFiles.push(file)
      }
    }
    return scriptFiles
  }
}
