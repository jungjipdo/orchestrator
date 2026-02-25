// ============================================
// ConsentModal — 데이터 수집 동의 온보딩 모달
// 첫 실행 시 자동 표시, Settings에서 수정 가능
// ============================================

import { useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { Button } from '../ui/button'
import { ChevronRight, Check } from 'lucide-react'

interface ConsentModalProps {
    open: boolean
    onComplete: (consent: { dataCollection: boolean; syncConsent: boolean }) => void
}

export function ConsentModal({ open, onComplete }: ConsentModalProps) {
    const [termsAccepted, setTermsAccepted] = useState(false)
    const [dataCollection, setDataCollection] = useState(false)
    const [syncConsent, setSyncConsent] = useState(false)

    const handleSubmit = () => {
        if (!termsAccepted) return // 우회 방지
        onComplete({ dataCollection, syncConsent })
    }

    return (
        <Dialog.Root open={open}>
            <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50" />
                <Dialog.Content
                    className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md bg-background border rounded-xl shadow-2xl p-0"
                    onPointerDownOutside={(e) => e.preventDefault()}
                    onEscapeKeyDown={(e) => e.preventDefault()}
                    onInteractOutside={(e) => e.preventDefault()}
                >
                    {/* Header */}
                    <div className="p-6 pb-3">
                        <Dialog.Title className="text-lg font-semibold">
                            시작하기
                        </Dialog.Title>
                        <p className="text-sm text-muted-foreground mt-1">
                            아래 항목을 확인해주세요.
                        </p>
                    </div>

                    <div className="px-6 space-y-3">
                        {/* 필수: 서비스 이용약관 — 체크박스 */}
                        <label
                            className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${termsAccepted ? 'border-foreground/20 bg-muted/30' : 'border-border'
                                }`}
                        >
                            <div
                                className={`w-5 h-5 rounded border flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors ${termsAccepted
                                        ? 'bg-foreground border-foreground'
                                        : 'border-muted-foreground/40'
                                    }`}
                                onClick={() => setTermsAccepted(!termsAccepted)}
                            >
                                {termsAccepted && (
                                    <Check className="w-3 h-3 text-background" strokeWidth={3} />
                                )}
                            </div>
                            <div className="flex-1">
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium">서비스 이용약관</span>
                                    <span className="text-[10px] px-1.5 py-0.5 rounded border text-muted-foreground font-medium">필수</span>
                                </div>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    계정 관리 및 기본 서비스 운영에 필요합니다.
                                </p>
                            </div>
                        </label>

                        <div className="h-px bg-border" />

                        {/* 선택: 모델 개선 데이터 수집 */}
                        <div className="flex items-start justify-between p-3 rounded-lg border">
                            <div className="flex-1 pr-3">
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium">모델 개선 데이터 수집</span>
                                    <span className="text-[10px] px-1.5 py-0.5 rounded border text-muted-foreground font-medium">선택</span>
                                </div>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    작업 패턴을 익명화하여 수집합니다.
                                </p>
                                {!dataCollection && (
                                    <p className="text-xs text-muted-foreground/70 mt-1">
                                        거부 시 AI 추천이 개인 이력만 기반으로 작동합니다.
                                    </p>
                                )}
                            </div>
                            <button
                                type="button"
                                onClick={() => setDataCollection(!dataCollection)}
                                className={`relative w-10 h-[22px] rounded-full transition-colors cursor-pointer flex-shrink-0 mt-0.5 ${dataCollection ? 'bg-foreground' : 'bg-muted'
                                    }`}
                            >
                                <span className={`absolute top-[2px] left-[2px] w-[18px] h-[18px] rounded-full bg-white shadow transition-transform ${dataCollection ? 'translate-x-[18px]' : 'translate-x-0'
                                    }`} />
                            </button>
                        </div>

                        {/* 선택: 멀티 디바이스 동기화 */}
                        <div className="flex items-start justify-between p-3 rounded-lg border">
                            <div className="flex-1 pr-3">
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium">멀티 디바이스 동기화</span>
                                    <span className="text-[10px] px-1.5 py-0.5 rounded border text-muted-foreground font-medium">선택</span>
                                </div>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    여러 기기에서 데이터를 동기화합니다.
                                </p>
                                {!syncConsent && (
                                    <p className="text-xs text-muted-foreground/70 mt-1">
                                        거부 시 이 기기에서만 데이터가 저장됩니다.
                                    </p>
                                )}
                            </div>
                            <button
                                type="button"
                                onClick={() => setSyncConsent(!syncConsent)}
                                className={`relative w-10 h-[22px] rounded-full transition-colors cursor-pointer flex-shrink-0 mt-0.5 ${syncConsent ? 'bg-foreground' : 'bg-muted'
                                    }`}
                            >
                                <span className={`absolute top-[2px] left-[2px] w-[18px] h-[18px] rounded-full bg-white shadow transition-transform ${syncConsent ? 'translate-x-[18px]' : 'translate-x-0'
                                    }`} />
                            </button>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="p-6 pt-4">
                        <Button
                            onClick={handleSubmit}
                            disabled={!termsAccepted}
                            className="w-full"
                            size="lg"
                        >
                            <ChevronRight className="w-4 h-4 mr-1" />
                            시작하기
                        </Button>
                        <p className="text-[11px] text-center text-muted-foreground mt-2">
                            선택 항목은 Settings에서 변경할 수 있습니다.
                        </p>
                    </div>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    )
}
