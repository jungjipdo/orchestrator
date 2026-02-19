#!/usr/bin/env node
// ============================================
// orchx CLI — 멀티-에이전트 오케스트레이션 도구
// ============================================

import { Command } from 'commander'
import { initCommand } from './commands/init.js'
import { sessionCommand } from './commands/session.js'
import { watchCommand } from './commands/watch.js'
import { commitCommand } from './commands/commit.js'
import { rulesCommand } from './commands/rules.js'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const pkg = JSON.parse(readFileSync(join(__dirname, '..', 'package.json'), 'utf-8'))

const program = new Command()

program
    .name('orchx')
    .description('Multi-agent orchestration CLI for Vibe Coders')
    .version(pkg.version)

program.addCommand(initCommand())
program.addCommand(sessionCommand())
program.addCommand(watchCommand())
program.addCommand(commitCommand())
program.addCommand(rulesCommand())

program.parse()
