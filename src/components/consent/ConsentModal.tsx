// ============================================
// ConsentModal — 데이터 수집 동의 온보딩 모달
// 첫 실행 시 자동 표시, Settings에서 수정 가능
// ============================================

import { useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { Button } from '../ui/button'
import { Shield, Database, Monitor, ChevronRight, AlertTriangle } from 'lucide-react'

interface ConsentModalProps {
    open: boolean
    onComplete: (consent: { dataCollection: boolean; syncConsent: boolean }) => void
}

export function ConsentModal({ open, onComplete }: ConsentModalProps) {
    const [dataCollection, setDataCollection] = useState(false)
    const [syncConsent, setSyncConsent] = useState(false)

    const handleSubmit = () => {
        onComplete({ dataCollection, syncConsent })
    }

    return (
        <Dialog.Root open={open}>
            <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50" />
                <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-lg bg-background border rounded-xl shadow-2xl p-0 max-h-[85vh] overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
                    {/* Header */}
                    <div className="p-6 pb-4">
                        <Dialog.Title className="text-xl font-bold flex items-center gap-2">
                            <Shield className="w-6 h-6 text-primary" />
                            Orchestrator 시작하기
                        </Dialog.Title>
                        <p className="text-sm text-muted-foreground mt-2">
                            더 나은 서비스를 위해 아래 항목을 확인해주세요.
                            설정은 언제든 Settings에서 변경할 수 있습니다.
                        </p>
                    </div>

                    <div className="px-6 space-y-4">
                        {/* 필수: 서비스 이용약관 */}
                        <div className="p-4 rounded-lg border bg-muted/20">
                            <div className="flex items-start gap-3">
                                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                                    <Shield className="w-4 h-4 text-primary" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-semibold">서비스 이용약관</span>
                                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium">필수</span>
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        계정 관리 및 기본 서비스 운영에 필요합니다.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* 선택: 모델 개선 데이터 수집 */}
                        <div className="p-4 rounded-lg border hover:border-primary/30 transition-colors">
                            <div className="flex items-start gap-3">
                                <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                                    <Database className="w-4 h-4 text-blue-500" />
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-semibold">모델 개선을 위한 데이터 수집</span>
                                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-medium">선택</span>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setDataCollection(!dataCollection)}
                                            className={`relative w-11 h-6 rounded-full transition-colors cursor-pointer ${dataCollection ? 'bg-primary' : 'bg-muted'}`}
                                        >
                                            <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${dataCollection ? 'translate-x-5' : 'translate-x-0'}`} />
                                        </button>
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        작업 패턴, AI 모델 배정 기록을 <strong>익명화</strong>하여 수집합니다.
                                        파일 내용은 절대 수집하지 않습니다.
                                    </p>
                                    {!dataCollection && (
                                        <div className="flex items-start gap-1.5 mt-2 text-xs text-amber-600">
                                            <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                                            <span>거부 시 AI 추천이 개인 이력만 기반으로 작동합니다.</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* 선택: 멀티 디바이스 동기화 */}
                        <div className="p-4 rounded-lg border hover:border-primary/30 transition-colors">
                            <div className="flex items-start gap-3">
                                <div className="w-8 h-8 rounded-full bg-green-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                                    <Monitor className="w-4 h-4 text-green-500" />
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-semibold">멀티 디바이스 동기화</span>
                                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-medium">선택</span>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setSyncConsent(!syncConsent)}
                                            className={`relative w-11 h-6 rounded-full transition-colors cursor-pointer ${syncConsent ? 'bg-primary' : 'bg-muted'}`}
                                        >
                                            <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${syncConsent ? 'translate-x-5' : 'translate-x-0'}`} />
                                        </button>
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        작업 목록, 세션 기록, 플랜을 여러 기기에서 동기화합니다.
                                    </p>
                                    {!syncConsent && (
                                        <div className="flex items-start gap-1.5 mt-2 text-xs text-amber-600">
                                            <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                                            <span>거부 시 이 기기에서만 데이터가 저장됩니다.</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="p-6 pt-5">
                        <Button onClick={handleSubmit} className="w-full" size="lg">
                            <ChevronRight className="w-4 h-4 mr-1" />
                            시작하기
                        </Button>
                        <p className="text-[11px] text-center text-muted-foreground mt-3">
                            선택 항목은 Settings → 데이터 관리에서 언제든 변경할 수 있습니다.
                        </p>
                    </div>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    )
}
