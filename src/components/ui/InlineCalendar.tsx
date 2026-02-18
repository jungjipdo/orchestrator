// ============================================
// InlineCalendar — 인라인 월별 캘린더
// PlanCreateModal에서 날짜 선택용
// ============================================

import { useState, useMemo } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface InlineCalendarProps {
    value: string         // 'YYYY-MM-DD' format
    onChange: (date: string) => void
    required?: boolean
    label?: string
}

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

function formatDateKey(year: number, month: number, day: number): string {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

export function InlineCalendar({ value, onChange, required, label }: InlineCalendarProps) {
    const today = new Date()
    const todayKey = formatDateKey(today.getFullYear(), today.getMonth(), today.getDate())

    // 현재 보고 있는 month (value 기준 또는 오늘 기준)
    const initialDate = value ? new Date(value) : today
    const [viewYear, setViewYear] = useState(initialDate.getFullYear())
    const [viewMonth, setViewMonth] = useState(initialDate.getMonth())

    // 해당 월의 날짜 배열 생성
    const calendarDays = useMemo(() => {
        const firstDay = new Date(viewYear, viewMonth, 1).getDay() // 0=Sun
        const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()

        const days: (number | null)[] = []
        // 앞쪽 빈칸
        for (let i = 0; i < firstDay; i++) {
            days.push(null)
        }
        // 날짜
        for (let d = 1; d <= daysInMonth; d++) {
            days.push(d)
        }
        return days
    }, [viewYear, viewMonth])

    const monthLabel = new Date(viewYear, viewMonth).toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: 'long',
    })

    const goToPrevMonth = () => {
        if (viewMonth === 0) {
            setViewYear(viewYear - 1)
            setViewMonth(11)
        } else {
            setViewMonth(viewMonth - 1)
        }
    }

    const goToNextMonth = () => {
        if (viewMonth === 11) {
            setViewYear(viewYear + 1)
            setViewMonth(0)
        } else {
            setViewMonth(viewMonth + 1)
        }
    }

    const handleDayClick = (day: number) => {
        onChange(formatDateKey(viewYear, viewMonth, day))
    }

    return (
        <div className="space-y-2">
            {label && (
                <label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    {label}
                    {required && <span className="text-destructive">*</span>}
                </label>
            )}
            <div className="border rounded-lg p-3 bg-muted/20">
                {/* Month Navigation */}
                <div className="flex items-center justify-between mb-3">
                    <button
                        type="button"
                        onClick={goToPrevMonth}
                        className="p-1 rounded hover:bg-muted transition-colors cursor-pointer"
                    >
                        <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="text-sm font-medium">{monthLabel}</span>
                    <button
                        type="button"
                        onClick={goToNextMonth}
                        className="p-1 rounded hover:bg-muted transition-colors cursor-pointer"
                    >
                        <ChevronRight className="w-4 h-4" />
                    </button>
                </div>

                {/* Weekday Headers */}
                <div className="grid grid-cols-7 gap-0.5 mb-1">
                    {WEEKDAYS.map(day => (
                        <div key={day} className="text-center text-[10px] font-medium text-muted-foreground py-1">
                            {day}
                        </div>
                    ))}
                </div>

                {/* Days Grid */}
                <div className="grid grid-cols-7 gap-0.5">
                    {calendarDays.map((day, idx) => {
                        if (day === null) {
                            return <div key={`empty-${idx}`} className="h-8" />
                        }

                        const dateKey = formatDateKey(viewYear, viewMonth, day)
                        const isSelected = dateKey === value
                        const isToday = dateKey === todayKey

                        return (
                            <button
                                key={dateKey}
                                type="button"
                                onClick={() => handleDayClick(day)}
                                className={`
                                    h-8 rounded text-xs font-medium transition-all cursor-pointer
                                    ${isSelected
                                        ? 'bg-primary text-primary-foreground'
                                        : isToday
                                            ? 'bg-primary/10 text-primary font-bold ring-1 ring-primary/30'
                                            : 'hover:bg-muted text-foreground'
                                    }
                                `}
                            >
                                {day}
                            </button>
                        )
                    })}
                </div>

                {/* Selected Date Display */}
                {value && (
                    <div className="mt-2 pt-2 border-t text-xs text-muted-foreground text-center">
                        선택: <span className="font-medium text-foreground">{new Date(value).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' })}</span>
                    </div>
                )}
                {!value && required && (
                    <div className="mt-2 pt-2 border-t text-xs text-destructive text-center">
                        날짜를 선택해 주세요
                    </div>
                )}
            </div>
        </div>
    )
}
