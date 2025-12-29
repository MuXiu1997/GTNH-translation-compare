import process from 'node:process'
import { isDebug } from '@actions/core'
import { createConsola, LogLevels } from 'consola'
import { isCI, provider } from 'std-env'

const isGitHubAction = isCI && provider === 'github_actions'
const gitHubActionFormatOptions = {
  colors: true,
}

export const log = createConsola({
  formatOptions: isGitHubAction ? gitHubActionFormatOptions : undefined,
})

log.level = LogLevels.info
if (isDebug()) {
  log.level = LogLevels.trace
}

if (isGitHubAction) {
  process.env.FORCE_COLOR = '3'
}
