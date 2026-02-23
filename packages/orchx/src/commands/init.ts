// ============================================
// commands/init.ts — orchx init
// 프로젝트에 Git Hook 설치 + .orchestrator/ 생성
// ============================================

import { Command } from 'commander'
import { existsSync, writeFileSync, readFileSync, mkdirSync, chmodSync } from 'node:fs'
import { join } from 'node:path'
import chalk from 'chalk'
import { ensureOrchestratorDir } from '../config/session.js'

const HOOK_TEMPLATE = `#!/bin/sh
# orchx — prepare-commit-msg hook
# 활성 세션이 있으면 커밋에 에이전트 메타데이터 자동 추가

SESSION_FILE=".orchestrator/session.json"

# jq가 없으면 node로 파싱
parse_json() {
  if command -v jq >/dev/null 2>&1; then
    jq -r "\$1 // empty" "$SESSION_FILE" 2>/dev/null
  else
    node -e "try{const s=JSON.parse(require('fs').readFileSync('$SESSION_FILE','utf-8'));const v=s[process.argv[1].replace('.','')];if(v)console.log(v)}catch{}" "\$1" 2>/dev/null
  fi
}

if [ -f "$SESSION_FILE" ]; then
  AGENT=$(parse_json .agent_type)
  SESSION_ID=$(parse_json .session_id)
  TASK=$(parse_json .task_name)

  if [ -n "$AGENT" ]; then
    # 이미 트레일러가 있으면 추가하지 않음
    if ! grep -q "^Agent:" "$1" 2>/dev/null; then
      echo "" >> "$1"
      echo "Agent: $AGENT" >> "$1"
      [ -n "$SESSION_ID" ] && echo "Session: $SESSION_ID" >> "$1"
      [ -n "$TASK" ] && echo "Orchestrator-Task: $TASK" >> "$1"
    fi
  fi
fi
`

export function initCommand(): Command {
  const cmd = new Command('init')
    .description('Initialize orchx in current project')
    .action(async () => {
      const cwd = process.cwd()

      // 1. Git 레포 확인
      const gitDir = join(cwd, '.git')
      if (!existsSync(gitDir)) {
        console.error(chalk.red('✗ Git repository not found. Run "git init" first.'))
        process.exit(1)
      }

      // 2. .orchestrator/ 디렉토리 생성
      ensureOrchestratorDir(cwd)
      console.log(chalk.green('✓'), '.orchestrator/ directory created')

      // 3. Git Hook 설치
      const hooksDir = join(gitDir, 'hooks')
      if (!existsSync(hooksDir)) {
        mkdirSync(hooksDir, { recursive: true })
      }

      const hookPath = join(hooksDir, 'prepare-commit-msg')
      const existingHook = existsSync(hookPath)

      if (existingHook) {
        const content = readFileSync(hookPath, 'utf-8')
        if (content.includes('orchx')) {
          console.log(chalk.yellow('→'), 'Git hook already installed')
        } else {
          // 기존 hook에 orchx 부분 추가
          const appended = content + '\n\n' + HOOK_TEMPLATE.split('\n').slice(1).join('\n')
          writeFileSync(hookPath, appended, 'utf-8')
          chmodSync(hookPath, 0o755)
          console.log(chalk.green('✓'), 'Git hook updated (appended to existing)')
        }
      } else {
        writeFileSync(hookPath, HOOK_TEMPLATE, 'utf-8')
        chmodSync(hookPath, 0o755)
        console.log(chalk.green('✓'), 'Git hook installed')
      }

      // 4. .gitignore에 .orchestrator/ 추가 (세션, 실패 이벤트, CURRENT_TASK.md 등)
      const gitignorePath = join(cwd, '.gitignore')
      const ignoreEntries = ['.orchestrator/']

      if (existsSync(gitignorePath)) {
        let content = readFileSync(gitignorePath, 'utf-8')
        const missing = ignoreEntries.filter(e => !content.includes(e))
        if (missing.length > 0) {
          // 기존 session.json 항목이 있으면 .orchestrator/로 대체
          content = content.replace('.orchestrator/session.json\n', '')
          writeFileSync(gitignorePath, content.trimEnd() + '\n' + missing.join('\n') + '\n', 'utf-8')
          console.log(chalk.green('✓'), '.gitignore updated (.orchestrator/)')
        }
      } else {
        writeFileSync(gitignorePath, ignoreEntries.join('\n') + '\n', 'utf-8')
        console.log(chalk.green('✓'), '.gitignore created')
      }

      console.log('')
      console.log(chalk.bold('🚀 orchx initialized!'))
      console.log(chalk.dim('   Next: orchx session start --agent <type> --task "<description>"'))
    })

  return cmd
}
