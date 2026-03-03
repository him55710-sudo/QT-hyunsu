import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, XCircle, BookOpen } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuizContext } from '../context/QuizContext';
import { QUIZ_DATA } from '../data/quizData';

export default function Quiz() {
    const { weekId } = useParams();
    const navigate = useNavigate();
    const { selectedUserId, saveScore, addWrongAnswer } = useQuizContext();
    const questions = weekId ? QUIZ_DATA[weekId] : undefined;
    const [currentIndex, setCurrentIndex] = useState(0);
    const [selectedOption, setSelectedOption] = useState<number | null>(null);
    const [scoreCount, setScoreCount] = useState(0);
    const [isFinished, setIsFinished] = useState(false);

    if (!selectedUserId) return (
        <div className="flex flex-col min-h-screen bg-[#F2F6FF] p-6 justify-center items-center">
            <p className="mb-4 text-[#8B95A1] font-bold">이름이 선택되지 않았습니다.</p>
            <button onClick={() => navigate('/')} className="px-6 py-3 bg-[#0064FF] text-white rounded-[14px] font-black shadow-[0_4px_12px_rgba(0,100,255,0.3)]">돌아가기</button>
        </div>
    );
    if (!questions || questions.length === 0) return (
        <div className="flex flex-col min-h-screen bg-[#F2F6FF] p-6 justify-center items-center">
            <p className="mb-4 text-[#8B95A1] font-bold">해당 주차 퀴즈가 없습니다.</p>
            <button onClick={() => navigate(-1)} className="px-6 py-3 bg-white text-[#191F28] rounded-[14px] font-bold border border-blue-100">뒤로</button>
        </div>
    );

    const currentQ = questions[currentIndex];
    const isAnswered = selectedOption !== null;
    const isCorrect = selectedOption === currentQ.correctAnswer;

    const handleOptionClick = (index: number) => {
        if (isAnswered) return;
        setSelectedOption(index);
        if (index === currentQ.correctAnswer) setScoreCount(prev => prev + 1);
        else { const gid = parseInt(weekId!) * 100 + currentIndex; if (selectedUserId) addWrongAnswer(selectedUserId, gid); }
    };

    const handleNext = () => {
        if (currentIndex < questions.length - 1) { setSelectedOption(null); setCurrentIndex(prev => prev + 1); }
        else { const fs = isCorrect ? scoreCount + 1 : scoreCount; saveScore(selectedUserId, parseInt(weekId!), Math.round((fs / questions.length) * 100)); setIsFinished(true); }
    };

    if (isFinished) {
        const finalScore = Math.round(((isCorrect ? scoreCount + 1 : scoreCount) / questions.length) * 100);
        return (
            <div className="flex flex-col min-h-screen bg-[#F2F6FF] p-6 items-center justify-center">
                <motion.div initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white border border-blue-50 p-8 rounded-[28px] text-center w-full max-w-sm shadow-[0_4px_24px_rgba(0,100,255,0.1)]">
                    <p className="text-[40px] mb-2">🎉</p>
                    <h2 className="text-[20px] font-black text-[#191F28] mb-1">수고했어요!</h2>
                    <p className="text-[14px] text-[#8B95A1] mb-6 font-bold">{questions.length}문제 중 {isCorrect ? scoreCount + 1 : scoreCount}개 정답</p>
                    <div className="mb-8">
                        <div className="text-[64px] font-black text-[#0064FF] leading-none">{finalScore}</div>
                        <div className="text-[18px] text-[#8B95A1] font-bold">점</div>
                    </div>
                    <button onClick={() => navigate('/leaderboard')} className="w-full py-4 bg-[#0064FF] text-white rounded-[16px] font-black text-[15px] shadow-[0_4px_16px_rgba(0,100,255,0.3)] active:scale-95 mb-2">명예의 전당 보기</button>
                    <button onClick={() => navigate('/')} className="w-full py-4 bg-[#F2F6FF] text-[#8B95A1] rounded-[16px] font-black text-[15px] active:scale-95">홈으로</button>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="flex flex-col min-h-screen bg-[#F2F6FF] p-5 pt-14">
            <header className="flex items-center justify-between mb-5">
                <button onClick={() => navigate(-1)} className="p-2 bg-white rounded-full border border-blue-100 shadow-sm active:scale-90">
                    <ArrowLeft className="w-5 h-5 text-[#8B95A1]" />
                </button>
                <div className="text-[13px] font-black text-[#8B95A1] bg-white px-4 py-1.5 rounded-full border border-blue-100 shadow-sm">
                    <span className="text-[#0064FF]">{currentIndex + 1}</span> / {questions.length}
                </div>
                <div className="w-9" />
            </header>

            <div className="w-full h-1.5 bg-blue-100 rounded-full mb-6 overflow-hidden">
                <motion.div className="h-full bg-[#0064FF] rounded-full" initial={{ width: 0 }} animate={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }} transition={{ duration: 0.3 }} />
            </div>

            <main className="flex-1 flex flex-col">
                <AnimatePresence mode="wait">
                    <motion.div key={currentIndex} initial={{ x: 50, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }} transition={{ type: 'spring', stiffness: 300, damping: 30 }} className="flex-1 flex flex-col">
                        <div className="bg-white border border-blue-50 p-6 rounded-[24px] flex-1 flex flex-col mb-3 shadow-[0_2px_16px_rgba(0,100,255,0.06)]">
                            <h2 className="text-[17px] font-black leading-snug text-[#191F28] mb-7 min-h-[4rem]">{currentQ.text}</h2>
                            <div className="flex flex-col gap-2.5 mt-auto">
                                {currentQ.options.map((option, idx) => {
                                    let cls = 'bg-[#F2F6FF] border-transparent text-[#4E5968]';
                                    let Icon = null;
                                    if (isAnswered) {
                                        if (idx === currentQ.correctAnswer) { cls = 'bg-blue-50 border-[#0064FF] text-[#0064FF]'; Icon = <CheckCircle2 className="w-5 h-5 text-[#0064FF] shrink-0" />; }
                                        else if (idx === selectedOption) { cls = 'bg-red-50 border-red-400 text-red-500'; Icon = <XCircle className="w-5 h-5 text-red-400 shrink-0" />; }
                                        else { cls = 'bg-[#F2F6FF] border-transparent text-[#B0B8C1] opacity-60'; }
                                    }
                                    return (
                                        <button key={idx} onClick={() => handleOptionClick(idx)} disabled={isAnswered}
                                            className={`flex items-center justify-between p-4 rounded-[16px] border-2 transition-all text-left font-bold text-[14px] ${!isAnswered ? 'hover:bg-blue-50 active:scale-[0.98]' : ''} ${cls}`}>
                                            <span className="flex-1 pr-2">{option}</span>{Icon}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                        <AnimatePresence>
                            {isAnswered && (
                                <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="bg-white border border-blue-50 rounded-[20px] p-5 mb-3 shadow-[0_2px_12px_rgba(0,100,255,0.06)]">
                                    <p className="text-[13px] leading-relaxed font-bold text-[#4E5968]">
                                        <span className="font-black text-[#0064FF] flex items-center gap-1 mb-1.5"><BookOpen className="w-4 h-4" />해설</span>
                                        {currentQ.explanation}
                                    </p>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>
                </AnimatePresence>
            </main>

            <AnimatePresence>
                {isAnswered && (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mt-auto pt-3 pb-2">
                        <button onClick={handleNext} className="w-full py-4 bg-[#0064FF] text-white rounded-[16px] font-black active:scale-95 transition-all text-[15px] shadow-[0_4px_16px_rgba(0,100,255,0.3)]">
                            {currentIndex < questions.length - 1 ? '다음 문제' : '결과 저장 및 완료'}
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
