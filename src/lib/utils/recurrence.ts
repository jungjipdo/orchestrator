// ============================================
// recurrence — 반복 일정 유틸리티
// Planfit recurrence.ts 알고리즘 구조 참조
// DB에 인스턴스 저장 없이 런타임 계산
// ============================================

import type { RecurrenceRule } from '../../types/index'

// ─── 날짜 범위 내 반복 인스턴스 생성 ───

export interface DateRange {
    from: Date
    to: Date
}

/**
 * 반복 규칙 기반으로 주어진 날짜 범위 내의 모든 발생일을 계산
 * Planfit의 generateRecurringEvents() 알고리즘 참조
 */
export function generateOccurrences(
    rule: RecurrenceRule,
    startDate: Date,
    range: DateRange,
    maxOccurrences: number = 365,
): Date[] {
    const occurrences: Date[] = []
    let currentDate = new Date(startDate)
    let count = 0

    // 범위 시작 이전이면 빠르게 건너뛰기
    while (currentDate < range.from && shouldContinue(currentDate, count, rule, maxOccurrences)) {
        if (shouldCreateOnDate(currentDate, startDate, rule)) {
            count++
        }
        currentDate = getNextDate(currentDate, startDate, rule)
    }

    // 범위 내 인스턴스 수집
    while (currentDate <= range.to && shouldContinue(currentDate, count, rule, maxOccurrences)) {
        if (shouldCreateOnDate(currentDate, startDate, rule)) {
            occurrences.push(new Date(currentDate))
            count++
        }
        currentDate = getNextDate(currentDate, startDate, rule)
    }

    return occurrences
}

/**
 * 다음 발생일 계산 (현재 날짜 이후)
 */
export function getNextOccurrence(
    rule: RecurrenceRule,
    startDate: Date,
    fromDate: Date,
): Date | null {
    let currentDate = new Date(startDate)
    let count = 0
    const maxIterations = 365 * 3  // 안전 한도

    while (count < maxIterations) {
        if (shouldCreateOnDate(currentDate, startDate, rule) && currentDate > fromDate) {
            if (!shouldContinue(currentDate, count, rule, maxIterations)) return null
            return new Date(currentDate)
        }
        if (shouldCreateOnDate(currentDate, startDate, rule)) count++
        currentDate = getNextDate(currentDate, startDate, rule)
    }

    return null
}

/**
 * 반복 규칙의 한국어 설명 생성
 * "매주 화, 목요일", "매일", "매월 같은 날짜 (12회)" 등
 */
export function getRecurrenceDescription(rule: RecurrenceRule): string {
    const dayNames = ['일', '월', '화', '수', '목', '금', '토']
    let desc = ''

    switch (rule.type) {
        case 'daily':
            desc = '매일'
            break
        case 'weekly':
            if (rule.weekDays && rule.weekDays.length > 0) {
                const days = [...rule.weekDays].sort((a, b) => a - b).map(d => dayNames[d])
                desc = `매주 ${days.join(', ')}요일`
            } else {
                desc = '매주'
            }
            break
        case 'monthly':
            desc = rule.monthlyType === 'weekday' ? '매월 같은 요일' : '매월 같은 날짜'
            break
    }

    // 종료 조건
    if (rule.endType === 'date' && rule.endDate) {
        desc += ` (${rule.endDate}까지)`
    } else if (rule.endType === 'count' && rule.count) {
        desc += ` (${rule.count}회)`
    } else if (rule.endType === 'never') {
        desc += ' (무기한)'
    }

    return desc
}

// ─── 내부 함수 ───

/**
 * 종료 조건 확인 — Planfit shouldContinue() 참조
 */
function shouldContinue(
    date: Date,
    count: number,
    rule: RecurrenceRule,
    maxOccurrences: number,
): boolean {
    if (count >= maxOccurrences) return false

    if (rule.endType === 'date' && rule.endDate) {
        const endLimit = new Date(rule.endDate + 'T23:59:59')
        return date <= endLimit
    }

    if (rule.endType === 'count' && rule.count) {
        return count < rule.count
    }

    // never
    return count < maxOccurrences
}

/**
 * 해당 날짜에 이벤트를 생성해야 하는지 — Planfit shouldCreateEvent() 참조
 */
function shouldCreateOnDate(
    currentDate: Date,
    startDate: Date,
    rule: RecurrenceRule,
): boolean {
    switch (rule.type) {
        case 'daily':
            return true

        case 'weekly':
            if (rule.weekDays && rule.weekDays.length > 0) {
                return rule.weekDays.includes(currentDate.getDay())
            }
            return currentDate.getDay() === startDate.getDay()

        case 'monthly':
            if (rule.monthlyType === 'weekday') {
                return isSameWeekdayOfMonth(currentDate, startDate)
            }
            return currentDate.getDate() === startDate.getDate()

        default:
            return false
    }
}

/**
 * 다음 후보 날짜로 이동 — Planfit getNextDate() 참조
 */
function getNextDate(
    currentDate: Date,
    startDate: Date,
    rule: RecurrenceRule,
): Date {
    const next = new Date(currentDate)

    switch (rule.type) {
        case 'daily':
            next.setDate(next.getDate() + 1)
            break

        case 'weekly':
            if (rule.weekDays && rule.weekDays.length > 0) {
                const currentDay = next.getDay()
                const sortedDays = [...rule.weekDays].sort((a, b) => a - b)
                const nextDay = sortedDays.find(d => d > currentDay)

                if (nextDay !== undefined) {
                    next.setDate(next.getDate() + (nextDay - currentDay))
                } else {
                    // 다음 주 첫 번째 요일로
                    next.setDate(next.getDate() + (7 - currentDay + sortedDays[0]))
                }
            } else {
                next.setDate(next.getDate() + 7)
            }
            break

        case 'monthly':
            next.setMonth(next.getMonth() + 1)
            // 월말 보정 (31일 → 28/29/30)
            if (rule.monthlyType !== 'weekday') {
                const targetDay = startDate.getDate()
                const lastDay = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate()
                next.setDate(Math.min(targetDay, lastDay))
            }
            break
    }

    return next
}

/**
 * 같은 N번째 요일인지 확인 — Planfit isSameWeekdayOfMonth() 참조
 * 예: 둘 다 "두 번째 화요일"인지
 */
function isSameWeekdayOfMonth(date1: Date, date2: Date): boolean {
    if (date1.getDay() !== date2.getDay()) return false
    const weekOfMonth1 = Math.ceil(date1.getDate() / 7)
    const weekOfMonth2 = Math.ceil(date2.getDate() / 7)
    return weekOfMonth1 === weekOfMonth2
}
