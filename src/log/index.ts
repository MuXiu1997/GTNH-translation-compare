import { isDebug } from '@actions/core'
import chalk from 'chalk'
import { createConsola, LogLevels } from 'consola'
import { isCI, provider } from 'std-env'

const isGitHubAction = isCI && provider === 'github_actions'

if (isGitHubAction) {
  chalk.level = 3
}

export const log = createConsola()

log.level = LogLevels.info
if (isDebug()) {
  log.level = LogLevels.trace
}
