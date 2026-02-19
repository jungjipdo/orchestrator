// ============================================
// commands/rules.ts — orchx rules generate
// 에디터별 오케스트레이션 규칙 자동 생성
// ============================================

import { Command } from 'commander'
import { writeFileSync, existsSync, readFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import chalk from 'chalk'

const ORCHESTRATOR_RULE = `## Orchestrator 연동 규칙

이 프로젝트는 orchx (멀티-에이전트 오케스트레이션 도구)를 사용합니다.

### 커밋 규칙
1. 커밋 시 Agent/Session 트레일러가 자동 포함됩니다 (prepare-commit-msg hook)
2. 대규모 변경 전 커밋하여 추적 가능한 단위를 유지하세요
3. \`orchx commit -m "메시지"\` 로 커밋하면 메타데이터가 자동 추가됩니다

### 세션 관리
- .orchestrator/session.json에 현재 활성 에이전트 정보가 있습니다
- 이 파일을 직접 수정하지 마세요

### 차단 상황
- 작업이 차단되면 사용자에게 알려주세요
`

const CURSOR_RULE = `---
description: Orchestrator integration rules
globs: ["**/*"]
---

${ORCHESTRATOR_RULE}
`

export function rulesCommand(): Command {
    const cmd = new Command('rules')
        .description('Generate editor rules')

    cmd.command('generate')
        .description('Generate orchestration rules for all editors')
        .action(() => {
            const cwd = process.cwd()
            let generated = 0

            // 1. Cursor rules
            const cursorDir = join(cwd, '.cursor', 'rules')
            if (!existsSync(cursorDir)) {
                mkdirSync(cursorDir, { recursive: true })
            }
            const cursorPath = join(cursorDir, 'orchestrator.mdc')
            writeFileSync(cursorPath, CURSOR_RULE, 'utf-8')
            console.log(chalk.green('✓'), '.cursor/rules/orchestrator.mdc')
            generated++

            // 2. Claude Code (CLAUDE.md)
            const claudePath = join(cwd, 'CLAUDE.md')
            if (existsSync(claudePath)) {
                const content = readFileSync(claudePath, 'utf-8')
                if (!content.includes('Orchestrator 연동 규칙')) {
                    writeFileSync(claudePath, content + '\n\n' + ORCHESTRATOR_RULE, 'utf-8')
                    console.log(chalk.green('✓'), 'CLAUDE.md (appended)')
                    generated++
                } else {
                    console.log(chalk.yellow('→'), 'CLAUDE.md (already has rules)')
                }
            } else {
                writeFileSync(claudePath, ORCHESTRATOR_RULE, 'utf-8')
                console.log(chalk.green('✓'), 'CLAUDE.md (created)')
                generated++
            }

            // 3. Gemini / Antigravity
            const geminiDir = join(cwd, '.gemini')
            if (!existsSync(geminiDir)) {
                mkdirSync(geminiDir, { recursive: true })
            }
            const geminiPath = join(geminiDir, 'ORCHESTRATOR.md')
            writeFileSync(geminiPath, ORCHESTRATOR_RULE, 'utf-8')
            console.log(chalk.green('✓'), '.gemini/ORCHESTRATOR.md')
            generated++

            console.log('')
            console.log(chalk.bold(`🎯 ${generated} rule files generated`))
        })

    return cmd
}
