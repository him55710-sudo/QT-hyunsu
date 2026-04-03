import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Crown, Flame, Medal } from 'lucide-react';
import { motion } from 'framer-motion';
import { useQuizContext, type DailyQtActivity } from '../context/QuizContext';
import { WEEKS } from '../data/mockData';
import { addDaysToDateKey, toKstDateKey } from '../utils/dateKst';

const getCurrentStreak = (dailyActivity: Record<string, DailyQtActivity>) => {
    let streak = 0;
    let cursor: string | null = toKstDateKey();

    while (cursor) {
        const day = dailyActivity[cursor];
        if (!day || !day.attended || !day.qtVerified) break;
        streak += 1;
        cursor = addDaysToDateKey(cursor, -1);
    }

    return streak;
};

export default function Leaderboard() {
    const navigate = useNavigate();
    const { scores, getUserTotalPoints, users, getUserDailyActivity } = useQuizContext();

    const allWeekIds = useMemo(() => {
        const ids = new Set<number>(WEEKS.map((week) => week.id));

        Object.keys(scores).forEach((scoreKey) => {
            const match = scoreKey.match(/^(\d+)_(\d+)$/);
            if (!match) return;

            const weekId = Number(match[2]);
            if (Number.isFinite(weekId)) ids.add(weekId);
        });

        return Array.from(ids).sort((a, b) => a - b);
    }, [scores]);

    const leaderboard = useMemo(() => {
        return users
            .map((user) => {
                const weeklyScores = allWeekIds.map((weekId) => ({ weekId, score: scores[`${user.id}_${weekId}`] || 0 }));
                const currentStreak = getCurrentStreak(getUserDailyActivity(user.id));
                const isBurning = currentStreak >= 3;

                return {
                    ...user,
                    totalScore: getUserTotalPoints(user.id),
                    weeklyScores,
                    currentStreak,
                    isBurning,
                };
            })
            .sort((a, b) => b.totalScore - a.totalScore);
    }, [allWeekIds, getUserDailyActivity, getUserTotalPoints, scores, users]);

    const topThree = leaderboard.slice(0, 3);

    return (
        <div className="flex flex-col min-h-screen bg-[#F2F6FF] p-5 pt-14">
            <header className="flex items-center gap-3 mb-6">
                <button onClick={() => navigate('/')} className="p-2 bg-white rounded-full border border-blue-100 shadow-sm active:scale-90">
                    <ArrowLeft className="w-5 h-5 text-[#8B95A1]" />
                </button>
                <div>
                    <h1 className="text-[18px] font-black text-[#191F28]">명예의 전당</h1>
                    <p className="text-[12px] text-[#8B95A1] font-bold">주차 퀴즈 + 출석/인증 누적 포인트</p>
                </div>
            </header>

            {topThree.length === 3 && (
                <div className="flex items-end justify-center gap-3 mb-6 h-36">
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="flex-1 flex flex-col items-center">
                        <Medal className="w-5 h-5 text-[#8B95A1] mb-1" />
                        <div className="bg-white border border-blue-100 rounded-t-[16px] w-full flex flex-col items-center pt-3 pb-4 h-20 shadow-sm">
                            <p className="text-[12px] font-black text-[#191F28] inline-flex items-center gap-1">
                                {topThree[1].name}
                                {topThree[1].isBurning && <Flame className="w-3.5 h-3.5 text-orange-500" />}
                            </p>
                            <p className="text-[11px] text-[#8B95A1] font-bold mt-1">{topThree[1].totalScore}P</p>
                        </div>
                    </motion.div>

                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex-1 flex flex-col items-center">
                        <Crown className="w-6 h-6 text-[#0064FF] mb-1" />
                        <div className="bg-[#0064FF] rounded-t-[16px] w-full flex flex-col items-center pt-3 pb-4 h-28 shadow-[0_4px_20px_rgba(0,100,255,0.3)]">
                            <p className="text-[13px] font-black text-white inline-flex items-center gap-1">
                                {topThree[0].name}
                                {topThree[0].isBurning && <Flame className="w-3.5 h-3.5 text-[#FFD25F]" />}
                            </p>
                            <p className="text-[12px] text-blue-200 font-bold mt-1">{topThree[0].totalScore}P</p>
                        </div>
                    </motion.div>

                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="flex-1 flex flex-col items-center">
                        <Medal className="w-5 h-5 text-[#f4a261] mb-1" />
                        <div className="bg-white border border-blue-100 rounded-t-[16px] w-full flex flex-col items-center pt-3 pb-4 h-16 shadow-sm">
                            <p className="text-[12px] font-black text-[#191F28] inline-flex items-center gap-1">
                                {topThree[2].name}
                                {topThree[2].isBurning && <Flame className="w-3.5 h-3.5 text-orange-500" />}
                            </p>
                            <p className="text-[11px] text-[#8B95A1] font-bold mt-1">{topThree[2].totalScore}P</p>
                        </div>
                    </motion.div>
                </div>
            )}

            <div className="flex flex-col gap-2">
                {leaderboard.map((user, index) => {
                    const isTop = index === 0;

                    return (
                        <motion.div
                            key={user.id}
                            initial={{ opacity: 0, x: -15 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className={`flex items-center p-4 rounded-[18px] border transition-all ${isTop
                                ? 'bg-[#0064FF] border-[#0064FF] shadow-[0_4px_20px_rgba(0,100,255,0.25)]'
                                : 'bg-white border-blue-50 shadow-sm'
                                } ${user.isBurning ? 'ember-glow ring-1 ring-orange-300/80' : ''}`}
                        >
                            <div className="w-9 flex items-center justify-center shrink-0">
                                {index === 0 && <Crown className="w-5 h-5 text-white" />}
                                {index === 1 && <Medal className="w-5 h-5 text-[#8B95A1]" />}
                                {index === 2 && <Medal className="w-5 h-5 text-[#f4a261]" />}
                                {index >= 3 && <span className="text-[15px] font-black text-[#B0B8C1]">{index + 1}</span>}
                            </div>

                            <div className="ml-3 flex-1 min-w-0">
                                <h3 className={`font-black text-[15px] inline-flex items-center gap-1.5 ${isTop ? 'text-white' : 'text-[#191F28]'}`}>
                                    {user.name}
                                    {user.isBurning && <Flame className={`w-4 h-4 ${isTop ? 'text-[#FFD25F]' : 'text-orange-500'}`} />}
                                </h3>

                                <div className="flex gap-1 mt-1 flex-wrap">
                                    {user.weeklyScores.map((w) => (
                                        <span
                                            key={w.weekId}
                                            className={`text-[10px] px-1.5 py-0.5 rounded-md font-black ${w.score > 0
                                                ? (isTop ? 'bg-white/20 text-white' : 'bg-blue-50 text-[#0064FF]')
                                                : (isTop ? 'bg-white/10 text-blue-200' : 'bg-[#F2F6FF] text-[#B0B8C1]')
                                                }`}
                                        >
                                            {w.weekId}주 {w.score}
                                        </span>
                                    ))}
                                </div>

                                {user.isBurning && (
                                    <p className={`mt-1 text-[11px] font-black ${isTop ? 'text-[#FFE6A7]' : 'text-[#D97706]'}`}>
                                        {user.name}님이 불타고 있어요!! ({user.currentStreak}일 연속)
                                    </p>
                                )}
                            </div>

                            <div className={`text-right font-black text-[22px] ${isTop ? 'text-white' : 'text-[#0064FF]'}`}>
                                {user.totalScore}
                                <span className="text-[12px] font-bold ml-0.5 opacity-70">P</span>
                            </div>
                        </motion.div>
                    );
                })}
            </div>
        </div>
    );
}
