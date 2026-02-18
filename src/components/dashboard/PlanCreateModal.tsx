// ============================================
// PlanCreateModal — 2-Type Plan 생성 모달
// Task / Event — Progressive Disclosure
// (Project는 ProjectImportModal로 분리)
// ============================================

import { useState, useRef, useEffect } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { Button } from '../ui/button'
import {
    X,
    ListTodo,
    Calendar,
    MapPin,
    Bell,
    FileText,
    ChevronRight,
} from 'lucide-react'
import { InlineCalendar } from '../ui/InlineCalendar'
import type {
    PlanType,
    PlanPriority,
    ReminderOption,
    PlanFormData,
} from '../../types/index'
import { usePlans } from '../../hooks/usePlans'

// ─── Constants ───

const PLAN_TYPES: { id: PlanType; label: string; icon: typeof ListTodo; desc: string }[] = [
    { id: 'task', label: 'Task', icon: ListTodo, desc: '일반 할 일' },
    { id: 'event', label: 'Event', icon: Calendar, desc: '날짜/시간 약속' },
]

const PRIORITIES: { id: PlanPriority; label: string; color: string }[] = [
    { id: 'low', label: 'Low', color: 'bg-slate-400' },
    { id: 'medium', label: 'Medium', color: 'bg-blue-500' },
    { id: 'high', label: 'High', color: 'bg-orange-500' },
    { id: 'critical', label: 'Critical', color: 'bg-red-500' },
]

const REMINDER_OPTIONS: { id: ReminderOption; label: string }[] = [
    { id: '30min', label: '30분 전' },
    { id: '1h', label: '1시간 전' },
    { id: '1day', label: '1일 전' },
    { id: '1week', label: '1주 전' },
]

// ─── Props ───

interface PlanCreateModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onPlanComplete: () => void
}

// ─── Initial Form State ───

function getInitialFormData(): PlanFormData {
    return {
        title: '',
        plan_type: 'task',
        priority: 'medium',
        description: '',
        due_at: '',
        start_at: '',
        start_time: '',
        end_time: '',
        location: '',
        reminders: [],
        git_repo: '',
    }
}

// ─── Component ───

export function PlanCreateModal({ open, onOpenChange, onPlanComplete }: PlanCreateModalProps) {
    const [form, setForm] = useState<PlanFormData>(getInitialFormData)
    const [creating, setCreating] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const titleRef = useRef<HTMLInputElement>(null)
    const { createPlan } = usePlans()

    // autoFocus on open
    useEffect(() => {
        if (open) {
            // 약간의 딜레이로 Dialog 애니메이션 이후 포커스
            const t = setTimeout(() => titleRef.current?.focus(), 100)
            return () => clearTimeout(t)
        } else {
            // 닫힐 때 초기화
            setForm(getInitialFormData())
            setError(null)
        }
    }, [open])

    // ─── Handlers ───

    const updateForm = <K extends keyof PlanFormData>(key: K, value: PlanFormData[K]) => {
        setForm((prev) => ({ ...prev, [key]: value }))
    }

    const toggleReminder = (id: ReminderOption) => {
        setForm((prev) => ({
            ...prev,
            reminders: prev.reminders.includes(id)
                ? prev.reminders.filter((r) => r !== id)
                : [...prev.reminders, id],
        }))
    }

    const handleCreate = async () => {
        if (!form.title.trim()) {
            setError('제목을 입력하세요')
            titleRef.current?.focus()
            return
        }

        // Event 타입 검증
        if (form.plan_type === 'event' && !form.start_at) {
            setError('날짜를 선택하세요')
            return
        }

        setError(null)
        setCreating(true)
        try {
            await createPlan(form)
            onOpenChange(false)
            onPlanComplete()
        } catch (e) {
            setError(e instanceof Error ? e.message : '알 수 없는 오류')
        } finally {
            setCreating(false)
        }
    }

    // ─── Render ───

    return (
        <Dialog.Root open={open} onOpenChange={onOpenChange}>
            <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 bg-background/50 backdrop-blur-sm z-50" />
                <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-lg bg-background border rounded-xl shadow-2xl p-0 max-h-[85vh] overflow-y-auto">
                    {/* Header */}
                    <div className="flex items-center justify-between p-5 pb-0">
                        <Dialog.Title className="text-lg font-semibold flex items-center gap-2">
                            <ChevronRight className="w-5 h-5 text-primary" />
                            New Plan
                        </Dialog.Title>
                        <Dialog.Close asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <X className="w-4 h-4" />
                            </Button>
                        </Dialog.Close>
                    </div>

                    <div className="p-5 space-y-5">
                        {/* Title — autoFocus */}
                        <input
                            ref={titleRef}
                            type="text"
                            placeholder="제목을 입력하세요..."
                            value={form.title}
                            onChange={(e) => updateForm('title', e.target.value)}
                            className="w-full text-xl font-medium px-0 py-2 border-0 border-b-2 border-muted bg-transparent focus:outline-none focus:border-primary transition-colors placeholder:text-muted-foreground/50"
                        />

                        {/* Type Selection */}
                        <div className="space-y-2">
                            <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wider">Type</label>
                            <div className="grid grid-cols-3 gap-2">
                                {PLAN_TYPES.map(({ id, label, icon: Icon, desc }) => (
                                    <button
                                        key={id}
                                        type="button"
                                        onClick={() => updateForm('plan_type', id)}
                                        className={`
                                            flex flex-col items-center gap-1.5 p-3 rounded-lg border-2 transition-all cursor-pointer
                                            ${form.plan_type === id
                                                ? 'border-primary bg-primary/10 text-primary'
                                                : 'border-muted hover:border-muted-foreground/30 text-muted-foreground hover:text-foreground'
                                            }
                                        `}
                                    >
                                        <Icon className="w-5 h-5" />
                                        <span className="text-sm font-medium">{label}</span>
                                        <span className="text-[10px] opacity-60">{desc}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Priority — 모든 타입 공통 */}
                        <div className="space-y-2">
                            <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wider">Priority</label>
                            <div className="flex gap-2">
                                {PRIORITIES.map(({ id, label, color }) => (
                                    <button
                                        key={id}
                                        type="button"
                                        onClick={() => updateForm('priority', id)}
                                        className={`
                                            flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer
                                            ${form.priority === id
                                                ? 'bg-foreground text-background'
                                                : 'bg-muted hover:bg-muted-foreground/20'
                                            }
                                        `}
                                    >
                                        <div className={`w-2 h-2 rounded-full ${color}`} />
                                        {label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* ─── Task Fields ─── */}
                        {form.plan_type === 'task' && (
                            <div className="space-y-4">
                                {/* Goals */}
                                <div className="space-y-2">
                                    <label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                        <FileText className="w-3.5 h-3.5" />
                                        Goals
                                        <span className="text-muted-foreground/50 normal-case tracking-normal">(선택)</span>
                                    </label>
                                    <textarea
                                        placeholder="목표나 세부 사항을 입력하세요..."
                                        value={form.description}
                                        onChange={(e) => updateForm('description', e.target.value)}
                                        rows={3}
                                        className="w-full px-3 py-2 text-sm border rounded-lg bg-muted/30 resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                                    />
                                </div>
                                {/* Due Date — 필수 */}
                                <InlineCalendar
                                    value={form.due_at}
                                    onChange={(date) => updateForm('due_at', date)}
                                    required
                                    label="Due Date"
                                />
                            </div>
                        )}

                        {/* ─── Event Fields ─── */}
                        {form.plan_type === 'event' && (
                            <div className="space-y-4">
                                {/* Date — 필수 (인라인 캘린더) */}
                                <InlineCalendar
                                    value={form.start_at}
                                    onChange={(date) => updateForm('start_at', date)}
                                    required
                                    label="Date"
                                />

                                {/* Time */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-2">
                                        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Start</label>
                                        <input
                                            type="time"
                                            value={form.start_time}
                                            onChange={(e) => updateForm('start_time', e.target.value)}
                                            className="w-full px-3 py-2 text-sm border rounded-lg bg-muted/30 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                            End
                                            <span className="text-muted-foreground/50 normal-case tracking-normal ml-1">(선택)</span>
                                        </label>
                                        <input
                                            type="time"
                                            value={form.end_time}
                                            onChange={(e) => updateForm('end_time', e.target.value)}
                                            className="w-full px-3 py-2 text-sm border rounded-lg bg-muted/30 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                                        />
                                    </div>
                                </div>

                                {/* Location */}
                                <div className="space-y-2">
                                    <label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                        <MapPin className="w-3.5 h-3.5" />
                                        Location
                                        <span className="text-muted-foreground/50 normal-case tracking-normal">(선택)</span>
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="장소를 입력하세요..."
                                        value={form.location}
                                        onChange={(e) => updateForm('location', e.target.value)}
                                        className="w-full px-3 py-2 text-sm border rounded-lg bg-muted/30 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                                    />
                                </div>

                                {/* Reminder — 체크박스 다중선택 */}
                                <div className="space-y-2">
                                    <label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                        <Bell className="w-3.5 h-3.5" />
                                        Reminder
                                        <span className="text-muted-foreground/50 normal-case tracking-normal">(다중 선택)</span>
                                    </label>
                                    <div className="flex flex-wrap gap-2">
                                        {REMINDER_OPTIONS.map(({ id, label }) => {
                                            const checked = form.reminders.includes(id)
                                            return (
                                                <button
                                                    key={id}
                                                    type="button"
                                                    onClick={() => toggleReminder(id)}
                                                    className={`
                                                        flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer border
                                                        ${checked
                                                            ? 'border-primary bg-primary/10 text-primary'
                                                            : 'border-muted bg-muted/30 text-muted-foreground hover:border-muted-foreground/30'
                                                        }
                                                    `}
                                                >
                                                    <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center ${checked ? 'bg-primary border-primary' : 'border-muted-foreground/40'}`}>
                                                        {checked && (
                                                            <svg className="w-2.5 h-2.5 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                                            </svg>
                                                        )}
                                                    </div>
                                                    {label}
                                                </button>
                                            )
                                        })}
                                    </div>
                                </div>
                            </div>
                        )}



                        {/* Error */}
                        {error && (
                            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive">
                                {error}
                            </div>
                        )}

                        {/* Actions */}
                        <div className="flex justify-end gap-3 pt-2 border-t">
                            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={creating}>
                                Cancel
                            </Button>
                            <Button onClick={handleCreate} disabled={creating || !form.title.trim() || (form.plan_type === 'task' && !form.due_at) || (form.plan_type === 'event' && !form.start_at)}>
                                {creating ? 'Creating...' : 'Create Plan'}
                            </Button>
                        </div>
                    </div>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    )
}



