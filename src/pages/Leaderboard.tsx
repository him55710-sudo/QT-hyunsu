import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Crown, Medal } from 'lucide-react';
import { motion } from 'framer-motion';
import { useQuizContext } from '../context/QuizContext';
import { MOCK_USERS, WEEKS } from '../data/mockData';

export default function Leaderboard() {
    const navigate = useNavigate();
    const { scores } = useQuizContext();
    const leaderboard = useMemo(() => {
        return MOCK_USERS.map(user => {
            const weeklyScores = WEEKS.map(week => ({ weekId: week.id, score: scores[`${user.id}_${week.id}`] || 0 }));
            return { ...user, totalScore: weeklyScores.reduce((s, w) => s + w.score, 0), weeklyScores };
        }).sort((a, b) => b.totalScore - a.totalScore);
    }, [scores]);

    return (
        <div className="flex flex-col min-h-screen bg-[#F2F6FF] p-5 pt-14">
            <header className="flex items-center gap-3 mb-6">
                <button onClick={() => navigate('/')} className="p-2 bg-white rounded-full border border-blue-100 shadow-sm active:scale-90">
                    <ArrowLeft className="w-5 h-5 text-[#8B95A1]" />
                </button>
                <div>
                    <h1 className="text-[18px] font-black text-[#191F28]">명예의 전당</h1>
                    <p className="text-[12px] text-[#8B95A1] font-bold">주차별 퀴즈 점수 합산 랭킹</p>
                </div>
            </header>

            {/* Top 3 포디엄 */}
            {leaderboard.length >= 3 && (
                <div className="flex items-end justify-center gap-3 mb-6 h-36">
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="flex-1 flex flex-col items-center">
                        <Medal className="w-5 h-5 text-[#8B95A1] mb-1" />
                        <div className="bg-white border border-blue-100 rounded-t-[16px] w-full flex flex-col items-center pt-3 pb-4 h-20 shadow-sm">
                            <p className="text-[12px] font-black text-[#191F28]">{leaderboard[1].name}</p>
                            <p className="text-[11px] text-[#8B95A1] font-bold mt-1">{leaderboard[1].totalScore}P</p>
                        </div>
                    </motion.div>
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex-1 flex flex-col items-center">
                        <Crown className="w-6 h-6 text-[#0064FF] mb-1" />
                        <div className="bg-[#0064FF] rounded-t-[16px] w-full flex flex-col items-center pt-3 pb-4 h-28 shadow-[0_4px_20px_rgba(0,100,255,0.3)]">
                            <p className="text-[13px] font-black text-white">{leaderboard[0].name}</p>
                            <p className="text-[12px] text-blue-200 font-bold mt-1">{leaderboard[0].totalScore}P</p>
                        </div>
                    </motion.div>
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="flex-1 flex flex-col items-center">
                        <Medal className="w-5 h-5 text-[#f4a261] mb-1" />
                        <div className="bg-white border border-blue-100 rounded-t-[16px] w-full flex flex-col items-center pt-3 pb-4 h-16 shadow-sm">
                            <p className="text-[12px] font-black text-[#191F28]">{leaderboard[2].name}</p>
                            <p className="text-[11px] text-[#8B95A1] font-bold mt-1">{leaderboard[2].totalScore}P</p>
                        </div>
                    </motion.div>
                </div>
            )}

            <div className="flex flex-col gap-2">
                {leaderboard.map((user, index) => (
                    <motion.div key={user.id} initial={{ opacity: 0, x: -15 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.05 }}
                        className={`flex items-center p-4 rounded-[18px] border transition-all ${index === 0 ? 'bg-[#0064FF] border-[#0064FF] shadow-[0_4px_20px_rgba(0,100,255,0.25)]' : 'bg-white border-blue-50 shadow-sm'}`}>
                        <div className="w-9 flex items-center justify-center shrink-0">
                            {index === 0 && <Crown className="w-5 h-5 text-white" />}
                            {index === 1 && <Medal className="w-5 h-5 text-[#8B95A1]" />}
                            {index === 2 && <Medal className="w-5 h-5 text-[#f4a261]" />}
                            {index >= 3 && <span className="text-[15px] font-black text-[#B0B8C1]">{index + 1}</span>}
                        </div>
                        <div className="ml-3 flex-1">
                            <h3 className={`font-black text-[15px] ${index === 0 ? 'text-white' : 'text-[#191F28]'}`}>{user.name}</h3>
                            <div className="flex gap-1 mt-1 flex-wrap">
                                {user.weeklyScores.map((w, i) => (
                                    <span key={w.weekId} className={`text-[10px] px-1.5 py-0.5 rounded-md font-black ${w.score > 0 ? (index === 0 ? 'bg-white/20 text-white' : 'bg-blue-50 text-[#0064FF]') : (index === 0 ? 'bg-white/10 text-blue-200' : 'bg-[#F2F6FF] text-[#B0B8C1]')}`}>
                                        {i + 1}주 {w.score}
                                    </span>
                                ))}
                            </div>
                        </div>
                        <div className={`text-right font-black text-[22px] ${index === 0 ? 'text-white' : 'text-[#0064FF]'}`}>
                            {user.totalScore}<span className="text-[12px] font-bold ml-0.5 opacity-70">P</span>
                        </div>
                    </motion.div>
                ))}
            </div>
        </div>
    );
}
