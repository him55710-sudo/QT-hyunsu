import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, CalendarDays, Camera, CheckCircle2, Image } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useQuizContext } from '../context/QuizContext';
import { formatDateKey, normalizeDateKey, parseProofTimestamp, toKstDateKey } from '../utils/dateKst';

const ARCHIVE_MONTHS = [
    { key: '2026-03', label: '2026년 3월 저장소' },
    { key: '2026-04', label: '2026년 4월 저장소' },
    { key: '2026-05', label: '2026년 5월 저장소' },
    { key: '2026-06', label: '2026년 6월 저장소' },
] as const;

type ArchiveMonthKey = (typeof ARCHIVE_MONTHS)[number]['key'];

const MONTH_LABEL: Record<ArchiveMonthKey, string> = {
    '2026-03': '2026년 3월',
    '2026-04': '2026년 4월',
    '2026-05': '2026년 5월',
    '2026-06': '2026년 6월',
};

const getInitialArchiveMonth = (): ArchiveMonthKey => {
    const currentMonthId = toKstDateKey().slice(0, 7);
    const current = ARCHIVE_MONTHS.find((month) => month.key === currentMonthId);
    return current?.key || ARCHIVE_MONTHS[ARCHIVE_MONTHS.length - 1].key;
};

export default function PhotoProof() {
    const navigate = useNavigate();
    const { selectedUserId, photoProofs, users } = useQuizContext();
    const currentUser = users.find((u) => u.id === selectedUserId);

    const [selectedProofId, setSelectedProofId] = useState<string | null>(null);
    const [activeMonth, setActiveMonth] = useState<ArchiveMonthKey>(getInitialArchiveMonth);

    const sortedProofs = useMemo(() => {
        const myProofs = photoProofs[(selectedUserId || '').toString()] || [];
        return [...myProofs].sort(
            (a, b) =>
                parseProofTimestamp(b.submittedAt, b.submittedAtMs, b.submittedDateKey) -
                parseProofTimestamp(a.submittedAt, a.submittedAtMs, a.submittedDateKey)
        );
    }, [photoProofs, selectedUserId]);

    const monthlyProofs = useMemo<Record<ArchiveMonthKey, typeof sortedProofs>>(() => {
        const grouped: Record<ArchiveMonthKey, typeof sortedProofs> = {
            '2026-03': [],
            '2026-04': [],
            '2026-05': [],
            '2026-06': [],
        };

        sortedProofs.forEach((proof) => {
            const dateKey = normalizeDateKey(proof.submittedDateKey) || '';
            if (dateKey.startsWith('2026-03')) {
                grouped['2026-03'].push(proof);
                return;
            }
            if (dateKey.startsWith('2026-04')) {
                grouped['2026-04'].push(proof);
                return;
            }
            if (dateKey.startsWith('2026-05')) {
                grouped['2026-05'].push(proof);
                return;
            }
            if (dateKey.startsWith('2026-06')) {
                grouped['2026-06'].push(proof);
            }
        });

        return grouped;
    }, [sortedProofs]);

    const activeProofs = monthlyProofs[activeMonth];

    const monthSummary = useMemo(() => {
        const totalCount = activeProofs.length;
        const totalPoints = activeProofs.reduce((sum, proof) => sum + (proof.points || 0), 0);
        const activeDays = new Set(
            activeProofs
                .map((proof) => normalizeDateKey(proof.submittedDateKey) || '')
                .filter(Boolean)
        );
        const latestDateKey = activeProofs[0] ? normalizeDateKey(activeProofs[0].submittedDateKey) || '' : '';
        const oldestDateKey = activeProofs[activeProofs.length - 1]
            ? normalizeDateKey(activeProofs[activeProofs.length - 1].submittedDateKey) || ''
            : '';

        return {
            totalCount,
            totalPoints,
            activeDays: activeDays.size,
            latestDateKey,
            oldestDateKey,
        };
    }, [activeProofs]);

    const monthlyDailyOverview = useMemo(() => {
        const bucket: Record<string, { count: number; points: number }> = {};
        activeProofs.forEach((proof) => {
            const dateKey = normalizeDateKey(proof.submittedDateKey) || '';
            if (!dateKey) return;

            if (!bucket[dateKey]) {
                bucket[dateKey] = { count: 0, points: 0 };
            }

            bucket[dateKey].count += 1;
            bucket[dateKey].points += proof.points || 0;
        });

        return Object.entries(bucket).sort(([a], [b]) => b.localeCompare(a));
    }, [activeProofs]);

    const selectedProof = useMemo(
        () => sortedProofs.find((proof) => proof.id === selectedProofId) || null,
        [selectedProofId, sortedProofs]
    );

    useEffect(() => {
        setSelectedProofId(null);
    }, [activeMonth]);

    if (!selectedUserId) {
        return (
            <div className="flex flex-col min-h-screen bg-slate-50 p-6 items-center justify-center">
                <p className="text-slate-500 mb-4">먼저 홈에서 이름을 선택해주세요.</p>
                <button onClick={() => navigate('/')} className="px-5 py-3 bg-indigo-500 text-white rounded-xl shadow-sm">
                    홈으로
                </button>
            </div>
        );
    }

    return (
        <div className="min-h-[100dvh] bg-[radial-gradient(circle_at_top,#eaf2ff_0%,#f8fbff_45%,#f8fafc_100%)] text-slate-800 pb-10">
            <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/90 backdrop-blur px-5 pt-12 pb-4">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => navigate('/')}
                        className="p-2 bg-white text-slate-600 border border-slate-200 rounded-full active:scale-95"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className="text-[18px] font-black flex items-center gap-2">
                            <Camera className="w-5 h-5 text-[#0064FF]" /> 나의 사진 아카이브
                        </h1>
                        <p className="text-[12px] text-slate-500 font-bold">{currentUser?.name}님의 2026년 3~4월 저장소</p>
                    </div>
                </div>
            </header>

            <main className="px-5 pt-5 space-y-4">
                {sortedProofs.length === 0 ? (
                    <div className="bg-white rounded-[18px] border border-slate-200 py-16 text-center text-slate-400">
                        <Camera className="w-9 h-9 mx-auto mb-2" />
                        <p className="text-[14px] font-bold">아직 저장된 인증 사진이 없습니다.</p>
                    </div>
                ) : (
                    <>
                        <div className="grid grid-cols-2 gap-2">
                            {ARCHIVE_MONTHS.map((month) => {
                                const isActive = activeMonth === month.key;
                                const count = monthlyProofs[month.key].length;
                                return (
                                    <button
                                        key={month.key}
                                        onClick={() => setActiveMonth(month.key)}
                                        className={`rounded-[14px] border px-3 py-2.5 text-left transition-colors ${isActive
                                            ? 'bg-[#0064FF] border-[#0064FF] text-white'
                                            : 'bg-white border-slate-200 text-slate-700'
                                            }`}
                                    >
                                        <p className={`text-[11px] font-black ${isActive ? 'text-blue-100' : 'text-slate-500'}`}>{month.label}</p>
                                        <p className="text-[16px] font-black mt-0.5">{count}장</p>
                                    </button>
                                );
                            })}
                        </div>

                        <section className="bg-white rounded-[18px] border border-slate-200 p-4">
                            <div className="flex items-center gap-2 mb-3">
                                <Image className="w-4 h-4 text-[#0064FF]" />
                                <h2 className="text-[14px] font-black text-slate-700">{MONTH_LABEL[activeMonth]} 전체 보기</h2>
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                                <div className="rounded-[12px] bg-slate-50 border border-slate-200 p-2.5">
                                    <p className="text-[10px] text-slate-500 font-black">인증 횟수</p>
                                    <p className="text-[18px] font-black text-[#0064FF]">{monthSummary.totalCount}</p>
                                </div>
                                <div className="rounded-[12px] bg-slate-50 border border-slate-200 p-2.5">
                                    <p className="text-[10px] text-slate-500 font-black">활동 일수</p>
                                    <p className="text-[18px] font-black text-[#0064FF]">{monthSummary.activeDays}</p>
                                </div>
                                <div className="rounded-[12px] bg-slate-50 border border-slate-200 p-2.5">
                                    <p className="text-[10px] text-slate-500 font-black">획득 포인트</p>
                                    <p className="text-[18px] font-black text-emerald-600">{monthSummary.totalPoints}P</p>
                                </div>
                            </div>

                            {monthSummary.totalCount > 0 && (
                                <div className="mt-3 text-[11px] text-slate-500 font-bold">
                                    {monthSummary.latestDateKey && (
                                        <p>
                                            최근 인증: {formatDateKey(monthSummary.latestDateKey, { month: 'long', day: 'numeric' })}
                                        </p>
                                    )}
                                    {monthSummary.oldestDateKey && (
                                        <p>
                                            시작 인증: {formatDateKey(monthSummary.oldestDateKey, { month: 'long', day: 'numeric' })}
                                        </p>
                                    )}
                                </div>
                            )}
                        </section>

                        <section className="bg-white rounded-[18px] border border-slate-200 p-4">
                            <div className="flex items-center gap-2 mb-3">
                                <CalendarDays className="w-4 h-4 text-[#0064FF]" />
                                <h2 className="text-[14px] font-black text-slate-700">일자별 활동</h2>
                            </div>
                            {monthlyDailyOverview.length === 0 ? (
                                <p className="text-[12px] text-slate-400 font-bold">해당 월에 저장된 사진이 없습니다.</p>
                            ) : (
                                <div className="space-y-2">
                                    {monthlyDailyOverview.map(([dateKey, info]) => (
                                        <div
                                            key={dateKey}
                                            className="flex items-center justify-between rounded-[12px] border border-slate-200 bg-slate-50 px-3 py-2"
                                        >
                                            <p className="text-[12px] font-black text-slate-700">
                                                {formatDateKey(dateKey, { month: 'short', day: 'numeric', weekday: 'short' })}
                                            </p>
                                            <p className="text-[11px] font-black text-[#0064FF]">
                                                {info.count}회 · {info.points}P
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </section>

                        {activeProofs.length === 0 ? (
                            <div className="bg-white rounded-[18px] border border-slate-200 py-12 text-center text-slate-400">
                                <p className="text-[14px] font-bold">{MONTH_LABEL[activeMonth]} 저장 사진이 없습니다.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 gap-2">
                                {activeProofs.map((proof) => (
                                    <button
                                        key={proof.id}
                                        onClick={() => setSelectedProofId(proof.id)}
                                        className="text-left rounded-[14px] border border-slate-200 bg-slate-50 overflow-hidden active:scale-[0.99]"
                                    >
                                        <div className="aspect-[4/3] bg-slate-200">
                                            {proof.imageDataUrl ? (
                                                <img src={proof.imageDataUrl} alt="QT 인증 사진" className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-slate-400">
                                                    <Camera className="w-5 h-5" />
                                                </div>
                                            )}
                                        </div>
                                        <div className="p-2.5">
                                            <p className="text-[11px] font-bold text-slate-500 inline-flex items-center gap-1">
                                                <CalendarDays className="w-3.5 h-3.5" /> 업로드 {formatDateKey(proof.submittedDateKey)}
                                            </p>
                                            <p className="mt-1 text-[11px] font-black text-emerald-600 inline-flex items-center gap-1">
                                                <CheckCircle2 className="w-3.5 h-3.5" /> +{proof.points}P
                                            </p>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </>
                )}
            </main>

            <AnimatePresence>
                {selectedProof && (
                    <motion.div
                        className="fixed inset-0 z-50 bg-slate-900/75 backdrop-blur-sm p-4 flex items-center justify-center"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setSelectedProofId(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.94, y: 12 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.96, y: 8 }}
                            onClick={(e) => e.stopPropagation()}
                            className="w-full max-w-md bg-white rounded-[18px] overflow-hidden"
                        >
                            {selectedProof.imageDataUrl && (
                                <img src={selectedProof.imageDataUrl} alt="QT 인증 사진" className="w-full max-h-[60vh] object-cover" />
                            )}
                            <div className="p-4 space-y-1.5">
                                <p className="text-[12px] font-bold text-slate-500">업로드 날짜: {formatDateKey(selectedProof.submittedDateKey)}</p>
                                <p className="text-[12px] font-black text-emerald-600">+{selectedProof.points}P 획득</p>
                                <button
                                    onClick={() => setSelectedProofId(null)}
                                    className="mt-2 w-full h-10 rounded-[12px] bg-slate-100 text-slate-700 text-[13px] font-black"
                                >
                                    닫기
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
