import { useMemo, useState } from 'react';
import { ArrowLeft, AlertCircle, Bookmark, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useQuizContext } from '../context/QuizContext';
import { QUIZ_DATA } from '../data/quizData';
import { QUIZ_MONTHS, WEEKS } from '../data/mockData';
import { formatDateKey, normalizeDateKey, toKstDateKey } from '../utils/dateKst';

const MONTH_BUCKETS = [
    { key: '2026-03', label: '2026년 3월' },
    ...QUIZ_MONTHS.map((month) => ({ key: month.id, label: month.label })),
] as const;

type MonthKey = (typeof MONTH_BUCKETS)[number]['key'];

type WrongAnswerCard = {
    weekId: number;
    weekTitle: string;
    qIndex: number;
    text: string;
    correct: string;
    explanation: string;
    submittedDateKey: string;
    monthKey: MonthKey;
};

const getInitialMonthKey = (): MonthKey => {
    const currentMonthId = toKstDateKey().slice(0, 7);
    const currentBucket = MONTH_BUCKETS.find((bucket) => bucket.key === currentMonthId);
    return currentBucket?.key || MONTH_BUCKETS[MONTH_BUCKETS.length - 1].key;
};

const inferMonthKey = (submittedDateKey: string, weekId: number): MonthKey => {
    const dateMonthKey = submittedDateKey.slice(0, 7);
    const dateBucket = MONTH_BUCKETS.find((bucket) => bucket.key === dateMonthKey);
    if (dateBucket) return dateBucket.key;

    const weekMonthKey = WEEKS.find((week) => week.id === weekId)?.monthId;
    const weekBucket = MONTH_BUCKETS.find((bucket) => bucket.key === weekMonthKey);
    return weekBucket?.key || '2026-04';
};

export default function WrongAnswers() {
    const navigate = useNavigate();
    const { selectedUserId, wrongAnswers, users } = useQuizContext();
    const currentUser = users.find((user) => user.id === selectedUserId);
    const [activeMonth, setActiveMonth] = useState<MonthKey>(getInitialMonthKey);

    const groupedWrongAnswers = useMemo<Record<MonthKey, WrongAnswerCard[]>>(() => {
        const grouped = MONTH_BUCKETS.reduce((acc, bucket) => {
            acc[bucket.key] = [];
            return acc;
        }, {} as Record<MonthKey, WrongAnswerCard[]>);
        if (!selectedUserId) return grouped;

        const entries = wrongAnswers[selectedUserId.toString()] || [];
        entries.forEach((entry) => {
            const globalId = entry.questionIndex;
            const weekId = Math.floor(globalId / 100);
            const qIndex = globalId % 100;
            const weekData = QUIZ_DATA[weekId];
            if (!weekData || !weekData[qIndex]) return;

            const question = weekData[qIndex];
            const weekInfo = WEEKS.find((week) => week.id === weekId);
            const submittedDateKey = normalizeDateKey(entry.submittedDateKey || '') || '';
            const monthKey = inferMonthKey(submittedDateKey, weekId);

            grouped[monthKey].push({
                weekId,
                weekTitle: weekInfo ? `${weekInfo.monthLabel} ${weekInfo.title}` : `${weekId}주차`,
                qIndex,
                text: question.text,
                correct: question.options[question.correctAnswer],
                explanation: question.explanation,
                submittedDateKey,
                monthKey,
            });
        });

        MONTH_BUCKETS.forEach(({ key }) => {
            grouped[key].sort((a, b) => {
                if (a.submittedDateKey && b.submittedDateKey && a.submittedDateKey !== b.submittedDateKey) {
                    return b.submittedDateKey.localeCompare(a.submittedDateKey);
                }
                if (a.weekId !== b.weekId) return a.weekId - b.weekId;
                return a.qIndex - b.qIndex;
            });
        });

        return grouped;
    }, [selectedUserId, wrongAnswers]);

    const totalCount = MONTH_BUCKETS.reduce((sum, bucket) => sum + groupedWrongAnswers[bucket.key].length, 0);
    const activeList = groupedWrongAnswers[activeMonth];
    const activeMonthLabel = MONTH_BUCKETS.find((bucket) => bucket.key === activeMonth)?.label || activeMonth;

    if (!selectedUserId) {
        return (
            <div className="flex flex-col min-h-screen bg-[#F2F6FF] p-6 items-center justify-center">
                <p className="text-[#8B95A1] mb-4 text-[14px] font-bold">이름을 먼저 선택해주세요.</p>
                <button onClick={() => navigate('/')} className="px-6 py-3 bg-[#0064FF] text-white rounded-[14px] font-black">
                    홈으로
                </button>
            </div>
        );
    }

    return (
        <div className="flex flex-col min-h-screen bg-[#F2F6FF]">
            <header className="px-5 pt-14 pb-4 sticky top-0 bg-[#F2F6FF]/90 backdrop-blur-md z-20">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => navigate('/')}
                        className="p-2 bg-white rounded-full border border-blue-100 shadow-sm active:scale-90"
                    >
                        <ArrowLeft className="w-5 h-5 text-[#8B95A1]" />
                    </button>
                    <div>
                        <h1 className="text-[18px] font-black text-[#191F28] flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 text-red-400" />
                            오답노트
                        </h1>
                        <p className="text-[12px] text-[#8B95A1] font-bold">{currentUser?.name} 학생의 월별 오답 기록</p>
                    </div>
                </div>
            </header>

            <main className="flex-1 px-5 pb-10">
                {totalCount === 0 ? (
                    <div className="bg-white border border-blue-50 rounded-[24px] p-10 text-center mt-4 shadow-sm">
                        <div className="w-14 h-14 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
                            <CheckCircle2 className="w-7 h-7 text-[#0064FF]" />
                        </div>
                        <h2 className="text-[16px] font-black text-[#191F28] mb-2">아직 오답이 없어요</h2>
                        <p className="text-[13px] text-[#8B95A1] font-bold">지금 페이스를 유지하면 됩니다.</p>
                    </div>
                ) : (
                    <div className="flex flex-col gap-3 mt-2">
                        <div className="grid grid-cols-2 gap-2">
                            {MONTH_BUCKETS.map((bucket) => {
                                const isActive = activeMonth === bucket.key;
                                const count = groupedWrongAnswers[bucket.key].length;
                                return (
                                    <button
                                        key={bucket.key}
                                        onClick={() => setActiveMonth(bucket.key)}
                                        className={`rounded-[14px] border px-3 py-2.5 text-left transition-colors ${isActive
                                            ? 'bg-[#0064FF] border-[#0064FF] text-white'
                                            : 'bg-white border-blue-100 text-[#4E5968]'
                                            }`}
                                    >
                                        <p className={`text-[11px] font-black ${isActive ? 'text-blue-100' : 'text-[#8B95A1]'}`}>{bucket.label}</p>
                                        <p className="text-[15px] font-black mt-0.5">{count}개</p>
                                    </button>
                                );
                            })}
                        </div>

                        {activeList.length === 0 ? (
                            <div className="bg-white border border-blue-50 rounded-[20px] p-7 text-center mt-1">
                                <p className="text-[13px] text-[#8B95A1] font-bold">{activeMonthLabel} 오답이 없습니다.</p>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-3">
                                <p className="text-[12px] text-[#B0B8C1] font-bold pl-1">
                                    {activeMonthLabel} 오답 {activeList.length}개
                                </p>
                                {activeList.map((item, idx) => (
                                    <motion.div
                                        key={`${item.monthKey}_${item.weekId}_${item.qIndex}`}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: idx * 0.04 }}
                                        className="bg-white border border-blue-50 rounded-[20px] p-5 shadow-sm"
                                    >
                                        <div className="flex items-center justify-between gap-2 mb-3">
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] font-black px-2 py-0.5 bg-red-50 text-red-400 rounded-full border border-red-100">
                                                    {item.weekTitle}
                                                </span>
                                                <span className="text-[11px] text-[#B0B8C1] font-bold">Q{item.qIndex + 1}</span>
                                            </div>
                                            {item.submittedDateKey && (
                                                <span className="text-[10px] text-[#8B95A1] font-black">
                                                    {formatDateKey(item.submittedDateKey, { month: 'short', day: 'numeric' })}
                                                </span>
                                            )}
                                        </div>

                                        <h3 className="text-[14px] font-black text-[#191F28] leading-snug mb-4">{item.text}</h3>

                                        <div className="bg-[#F2F6FF] border border-blue-100 rounded-[14px] p-3 mb-2">
                                            <div className="flex items-center gap-1.5 mb-1">
                                                <CheckCircle2 className="w-3.5 h-3.5 text-[#0064FF]" />
                                                <span className="text-[11px] font-black text-[#8B95A1]">정답</span>
                                            </div>
                                            <p className="text-[13px] text-[#191F28] font-black ml-5">{item.correct}</p>
                                        </div>

                                        <div className="bg-[#F2F6FF] border border-blue-100 rounded-[14px] p-3">
                                            <div className="flex items-center gap-1.5 mb-1">
                                                <Bookmark className="w-3.5 h-3.5 text-[#0064FF]" />
                                                <span className="text-[11px] font-black text-[#8B95A1]">해설</span>
                                            </div>
                                            <p className="text-[13px] text-[#4E5968] font-bold leading-relaxed ml-5">{item.explanation}</p>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </main>
        </div>
    );
}
