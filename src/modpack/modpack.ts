import fs from 'node:fs'
import path from 'node:path'
import { Glob } from 'bun'
import { FiletypeLang, FiletypeScript } from '~/filetypes/index.ts'
import { Mod } from '~/modpack/mod.ts'
import { ensureLf } from '~/utils/file.ts'

export class ModPack {
  readonly #packPath: string
  readonly #extraLangs?: string[]
  #langFiles?: FiletypeLang[]
  #scriptFiles?: FiletypeScript[]

  constructor(packPath: string, extraLangs?: string[]) {
    this.#packPath = packPath
    this.#extraLangs = extraLangs
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
    if (this.#extraLangs) {
      for (const extraLang of this.#extraLangs) {
        const extraLangGlob = new Glob(extraLang)
        for (const extraLangRelativePath of extraLangGlob.scanSync({ cwd: this.#packPath })) {
          const content = ensureLf(fs.readFileSync(path.join(this.#packPath, extraLangRelativePath), 'utf-8'))

          langFiles.push(
            new FiletypeLang(extraLangRelativePath, content),
          )
        }
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
