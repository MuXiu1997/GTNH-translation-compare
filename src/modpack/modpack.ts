import type { Filetype } from '~/filetypes/filetype.ts'
import fs from 'node:fs'
import path from 'node:path'
import AdmZip from 'adm-zip'
import { Glob } from 'bun'
import { uniqBy } from 'lodash-es'
import { FiletypeGuideNhPage, FiletypeLang, FiletypeMarkdownTooltip, FiletypeScript, isGuideNhPagePath } from '~/filetypes/index.ts'
import { Mod } from '~/modpack/mod.ts'
import { ensureLf } from '~/utils/file.ts'

export class ModPack {
  readonly #packPath: string
  readonly #extraLangs?: string[]
  #langFiles?: Filetype[]
  #scriptFiles?: FiletypeScript[]

  constructor(packPath: string, extraLangs?: string[]) {
    this.#packPath = packPath
    this.#extraLangs = extraLangs
  }

  get langFiles(): Filetype[] {
    if (this.#langFiles === undefined) {
      this.#langFiles = uniqBy(
        [...this.parseLangFiles(), ...this.parseGuidePackFiles(), ...this.parseExtraLangFiles()],
        file => file.relpath,
      )
    }
    return this.#langFiles
  }

  private parseLangFiles(): Filetype[] {
    const langFiles: Filetype[] = []
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

      for (const [filename, content] of Object.entries(mod.markdownTooltipFiles)) {
        const parts = filename.split('/')
        const subModId = parts[1]!
        const relPathInsideResources = parts.slice(2).join('/')

        langFiles.push(
          new FiletypeMarkdownTooltip(
            `resources/${mod.modName}[${subModId}]/${relPathInsideResources}`,
            content,
          ),
        )
      }
    }
    return langFiles
  }

  private parseExtraLangFiles(): FiletypeLang[] {
    if (!this.#extraLangs) {
      return []
    }
    const langFiles: FiletypeLang[] = []
    for (const extraLang of this.#extraLangs) {
      const extraLangGlob = new Glob(extraLang)
      for (const extraLangRelativePath of extraLangGlob.scanSync({ cwd: this.#packPath })) {
        const content = ensureLf(fs.readFileSync(path.join(this.#packPath, extraLangRelativePath), 'utf-8'))

        langFiles.push(
          new FiletypeLang(extraLangRelativePath, content),
        )
      }
    }
    return langFiles
  }

  private parseGuidePackFiles(): Filetype[] {
    const guidePackPath = path.join(this.#packPath, 'config/guidenh/DefaultGuide.zip')
    // Older modpacks do not bundle a guide pack.
    if (!fs.existsSync(guidePackPath))
      return []

    const files: Filetype[] = []
    const decoder = new TextDecoder()
    const guidePack = new AdmZip(guidePackPath)
    for (const entry of guidePack.getEntries()) {
      const parts = entry.entryName.split('/')
      if (entry.isDirectory || parts[0] !== 'assets' || parts.some(part => part === '' || part === '.' || part === '..'))
        continue

      const prefix = `resources/GTNH Guide Pack[${parts[1]}]`
      // Only English is a source. The pack also ships completed translations.
      if (parts.length === 4 && parts[2] === 'lang' && parts[3] === 'en_us.lang') {
        files.push(new FiletypeLang(
          `${prefix}/lang/en_US.lang`,
          ensureLf(decoder.decode(entry.getData())),
        ))
      }
      else if (parts[2] === 'guidenh' && parts[3] === '_en_us' && isGuideNhPagePath(entry.entryName)) {
        files.push(new FiletypeGuideNhPage(
          `${prefix}/${parts.slice(2).join('/')}`,
          ensureLf(decoder.decode(entry.getData())),
        ))
      }
    }
    return files
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
