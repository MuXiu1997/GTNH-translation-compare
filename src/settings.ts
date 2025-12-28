import { env } from 'node:process'
import { Languages, parseLanguage } from '~/filetypes/language.ts'
import { mustGetEnv } from '~/utils/env.ts'

export const TARGET_LANG = parseLanguage(env.TARGET_LANG ?? Languages.zh_CN)

export const GTNH_REPO = env.GTNH_REPO ?? 'GTNewHorizons/GT-New-Horizons-Modpack'

export const DEFAULT_QUESTS_LANG_TEMPLATE_REL_PATH = env.DEFAULT_QUESTS_LANG_TEMPLATE_REL_PATH
  ?? 'config/txloader/load/betterquesting/lang/template.lang'

export const DEFAULT_QUESTS_LANG_EN_US_REL_PATH = env.DEFAULT_QUESTS_LANG_EN_US_REL_PATH
  ?? 'config/txloader/load/betterquesting/lang/en_US.lang'

export const DEFAULT_QUESTS_LANG_TARGET_REL_PATH = env.DEFAULT_QUESTS_LANG_TARGET_REL_PATH
  ?? `config/txloader/load/betterquesting/lang/${TARGET_LANG}.lang`

export const GT_LANG_EN_US_REL_PATH = 'GregTech_US.lang'
export const GT_LANG_TARGET_REL_PATH = 'GregTech.lang'

export const PARATRANZ_PROJECT_ID = Number.parseInt(mustGetEnv('PARATRANZ_PROJECT_ID'), 10)
export const PARATRANZ_TOKEN = mustGetEnv('PARATRANZ_TOKEN')

export const GIT_AUTHOR = env.GIT_AUTHOR ?? null
export const CLOSE_ISSUE_IN_COMMIT_MESSAGE = (env.CLOSE_ISSUE_IN_COMMIT_MESSAGE ?? 'true').toLowerCase() === 'true'

export const PARATRANZ_CACHE_DIR = env.PARATRANZ_CACHE_DIR ?? '.paratranz_cache'
