import { useMemo } from 'react';
import { ArrowLeft, AlertCircle, Bookmark, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useQuizContext } from '../context/QuizContext';
import { QUIZ_DATA } from '../data/quizData';
import { WEEKS } from '../data/mockData';

export default function WrongAnswers() {
    const navigate = useNavigate();
    const { selectedUserId, wrongAnswers, users } = useQuizContext();
    const currentUser = users.find(u => u.id === selectedUserId);
    const myWrongList = useMemo(() => {
        if (!selectedUserId) return [];
        const myAnswerIds = wrongAnswers[selectedUserId.toString()] || [];
        const list: { weekId: number; weekTitle: string; qIndex: number; text: string; correct: string; explanation: string }[] = [];
        myAnswerIds.forEach(globalId => {
            const weekId = Math.floor(globalId / 100), qIndex = globalId % 100;
            const weekData = QUIZ_DATA[weekId];
            if (weekData && weekData[qIndex]) {
                const question = weekData[qIndex], weekInfo = WEEKS.find(w => w.id === weekId);
                list.push({ weekId, weekTitle: weekInfo?.title || `${weekId}주차`, qIndex, text: question.text, correct: question.options[question.correctAnswer], explanation: question.explanation });
            }
        });
        return list.sort((a, b) => a.weekId !== b.weekId ? a.weekId - b.weekId : a.qIndex - b.qIndex);
    }, [selectedUserId, wrongAnswers]);

    if (!selectedUserId) return (
        <div className="flex flex-col min-h-screen bg-[#F2F6FF] p-6 items-center justify-center">
            <p className="text-[#8B95A1] mb-4 text-[14px] font-bold">이름을 먼저 선택해주세요.</p>
            <button onClick={() => navigate('/')} className="px-6 py-3 bg-[#0064FF] text-white rounded-[14px] font-black">홈으로</button>
        </div>
    );

    return (
        <div className="flex flex-col min-h-screen bg-[#F2F6FF]">
            <header className="px-5 pt-14 pb-4 sticky top-0 bg-[#F2F6FF]/90 backdrop-blur-md z-20">
                <div className="flex items-center gap-3">
                    <button onClick={() => navigate('/')} className="p-2 bg-white rounded-full border border-blue-100 shadow-sm active:scale-90"><ArrowLeft className="w-5 h-5 text-[#8B95A1]" /></button>
                    <div>
                        <h1 className="text-[18px] font-black text-[#191F28] flex items-center gap-2"><AlertCircle className="w-4 h-4 text-red-400" />오답노트</h1>
                        <p className="text-[12px] text-[#8B95A1] font-bold">{currentUser?.name} 님의 기록</p>
                    </div>
                </div>
            </header>
            <main className="flex-1 px-5 pb-10">
                {myWrongList.length === 0 ? (
                    <div className="bg-white border border-blue-50 rounded-[24px] p-10 text-center mt-4 shadow-sm">
                        <div className="w-14 h-14 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4"><CheckCircle2 className="w-7 h-7 text-[#0064FF]" /></div>
                        <h2 className="text-[16px] font-black text-[#191F28] mb-2">완벽해요! 🎉</h2>
                        <p className="text-[13px] text-[#8B95A1] font-bold">틀린 문제가 없습니다.<br />계속 화이팅!</p>
                    </div>
                ) : (
                    <div className="flex flex-col gap-3 mt-2">
                        <p className="text-[12px] text-[#B0B8C1] font-bold pl-1">총 {myWrongList.length}개 복습 필요</p>
                        {myWrongList.map((item, idx) => (
                            <motion.div key={`${item.weekId}_${item.qIndex}`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }}
                                className="bg-white border border-blue-50 rounded-[20px] p-5 shadow-sm">
                                <div className="flex items-center gap-2 mb-3">
                                    <span className="text-[10px] font-black px-2 py-0.5 bg-red-50 text-red-400 rounded-full border border-red-100">{item.weekTitle}</span>
                                    <span className="text-[11px] text-[#B0B8C1] font-bold">Q{item.qIndex + 1}</span>
                                </div>
                                <h3 className="text-[14px] font-black text-[#191F28] leading-snug mb-4">{item.text}</h3>
                                <div className="bg-[#F2F6FF] border border-blue-100 rounded-[14px] p-3 mb-2">
                                    <div className="flex items-center gap-1.5 mb-1"><CheckCircle2 className="w-3.5 h-3.5 text-[#0064FF]" /><span className="text-[11px] font-black text-[#8B95A1]">정답</span></div>
                                    <p className="text-[13px] text-[#191F28] font-black ml-5">{item.correct}</p>
                                </div>
                                <div className="bg-[#F2F6FF] border border-blue-100 rounded-[14px] p-3">
                                    <div className="flex items-center gap-1.5 mb-1"><Bookmark className="w-3.5 h-3.5 text-[#0064FF]" /><span className="text-[11px] font-black text-[#8B95A1]">말씀 해설</span></div>
                                    <p className="text-[13px] text-[#4E5968] font-bold leading-relaxed ml-5">{item.explanation}</p>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}
