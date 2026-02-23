// ============================================
// commands/tester.ts — orchx tester
// 로컬 테스트 자동 실행 + 결과 수집 (레벨 1)
// ============================================

import { Command } from 'commander'
import chalk from 'chalk'
import { exec } from 'node:child_process'
import { existsSync } from 'node:fs'
import { join, dirname, basename } from 'node:path'
import { readSession } from '../config/session.js'
import { ContractEnforcer } from '../config/contractEnforcer.js'

// === 타입 ===

export interface TestReport {
    total: number
    passed: number
    failed: number
    errors: string[]
    duration_ms: number
    tested_files: string[]
}

// === 테스트 파일 탐색 ===

function findTestFile(sourcePath: string): string | null {
    const dir = dirname(sourcePath)
    const name = basename(sourcePath)
        .replace(/\.(ts|tsx|js|jsx)$/, '')

    // 컨벤션: foo.ts → foo.test.ts, foo.spec.ts
    const candidates = [
        join(dir, `${name}.test.ts`),
        join(dir, `${name}.spec.ts`),
        join(dir, `${name}.test.tsx`),
        join(dir, `${name}.spec.tsx`),
        join(dir, '__tests__', `${name}.test.ts`),
        join(dir, '__tests__', `${name}.spec.ts`),
    ]

    return candidates.find(c => existsSync(c)) ?? null
}

// === 명령 실행 ===

function runCommand(cmd: string, cwd: string): Promise<{ stdout: string; stderr: string; exitCode: number }> {
    return new Promise(resolve => {
        exec(cmd, { cwd, timeout: 60000 }, (error, stdout, stderr) => {
            resolve({
                stdout: stdout.toString(),
                stderr: stderr.toString(),
                exitCode: error ? (typeof error.code === 'number' ? error.code : 1) : 0,
            })
        })
    })
}

// === tester.run ===

export async function runTests(
    changedFiles: string[],
    projectPath: string,
    enforcer?: ContractEnforcer,
): Promise<TestReport> {
    const startTime = Date.now()
    const report: TestReport = {
        total: 0,
        passed: 0,
        failed: 0,
        errors: [],
        duration_ms: 0,
        tested_files: [],
    }

    // 변경된 파일에서 테스트 파일 탐색
    const testFiles = new Set<string>()
    for (const file of changedFiles) {
        const fullPath = join(projectPath, file)

        // 이미 테스트 파일이면 직접 추가
        if (file.match(/\.(test|spec)\.(ts|tsx|js|jsx)$/)) {
            testFiles.add(file)
            continue
        }

        // 소스 파일 → 대응 테스트 파일 탐색
        const testFile = findTestFile(fullPath)
        if (testFile) {
            testFiles.add(testFile.replace(projectPath + '/', ''))
        }
    }

    if (testFiles.size === 0) {
        console.log(chalk.dim('  🧪 관련 테스트 파일 없음'))
        return report
    }

    // 명령어 화이트리스트 검증
    const testCmd = 'npm run test'
    if (enforcer) {
        const violation = enforcer.checkCommand(testCmd)
        if (violation) {
            console.log(chalk.red('  🚨 테스트 명령 계약 위반:'), violation.reason)
            report.errors.push(violation.reason)
            report.duration_ms = Date.now() - startTime
            return report
        }
    }

    console.log(chalk.cyan('  🧪 테스트 실행:'), `${testFiles.size}개 파일`)
    report.tested_files = [...testFiles]
    report.total = testFiles.size

    // 테스트 실행
    const { stdout, stderr, exitCode } = await runCommand(
        `npm run test -- --passWithNoTests 2>&1`,
        projectPath,
    )

    if (exitCode === 0) {
        report.passed = report.total
        console.log(chalk.green('  ✓'), `테스트 통과 (${report.total}개)`)
    } else {
        report.failed = report.total
        // stderr에서 에러 메시지 추출 (첫 5줄)
        const errorLines = (stderr || stdout).split('\n').filter(l => l.trim()).slice(0, 5)
        report.errors = errorLines
        console.log(chalk.red('  ✗'), `테스트 실패`)
        errorLines.forEach(line => console.log(chalk.dim(`    ${line}`)))
    }

    report.duration_ms = Date.now() - startTime
    return report
}

// === testerCommand ===

export function testerCommand(): Command {
    const cmd = new Command('test')
        .description('변경 파일 기반 로컬 테스트 실행')
        .argument('[files...]', '테스트할 파일 목록')
        .action(async (files: string[]) => {
            const cwd = process.cwd()
            const session = readSession(cwd)

            const enforcer = session?.execution_contract
                ? new ContractEnforcer(session.execution_contract)
                : undefined

            if (files.length === 0) {
                console.log(chalk.yellow('⚠'), '파일을 지정하세요: orchx test <file1> <file2> ...')
                return
            }

            const report = await runTests(files, cwd, enforcer)
            console.log(chalk.dim(`  소요 시간: ${report.duration_ms}ms`))
        })

    return cmd
}
