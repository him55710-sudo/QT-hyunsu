import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, BarChart3, KeyRound, Save, Users } from 'lucide-react';
import { useQuizContext } from '../context/QuizContext';
import { ADMIN_PIN, MOCK_USERS, TEACHER_ACCOUNT, WEEKS } from '../data/mockData';
import ChangePinModal from '../components/ChangePinModal';

type RowDraft = {
    weekly: Record<number, string>;
    manual: string;
};

const toNumberOrNull = (value: string): number | null => {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : null;
};

export default function Admin() {
    const navigate = useNavigate();
    const { scores, userPins, updatePin, setScoreEntry, photoProofs } = useQuizContext();

    const [isChangePinModalOpen, setIsChangePinModalOpen] = useState(false);
    const [drafts, setDrafts] = useState<Record<number, RowDraft>>({});

    const handleAdminPinChange = (newPin: string) => {
        updatePin('admin', newPin);
        setIsChangePinModalOpen(false);
        alert('관리자 비밀번호가 변경되었습니다.');
    };

    const studentData = useMemo(() => {
        return MOCK_USERS.map((user) => {
            const weeklyScores = WEEKS.map((week) => ({
                weekId: week.id,
                score: scores[`${user.id}_${week.id}`] ?? null,
            }));

            const attendanceDays = Object.keys(scores).filter(
                (key) => key.startsWith(`${user.id}_attendance_`) && scores[key] > 0
            ).length;
            const photoCount = (photoProofs[user.id.toString()] || []).length;

            let totalScore = 0;
            Object.entries(scores).forEach(([key, value]) => {
                if (key.startsWith(`${user.id}_`)) totalScore += value;
            });

            const manualAdjustment = scores[`${user.id}_manual_adjustment`] ?? null;

            return {
                ...user,
                weeklyScores,
                attendanceDays,
                photoCount,
                manualAdjustment,
                totalScore,
            };
        }).sort((a, b) => b.totalScore - a.totalScore);
    }, [photoProofs, scores]);

    const getDraft = (userId: number, weeklyScores: { weekId: number; score: number | null }[], manualAdjustment: number | null) => {
        const existing = drafts[userId];
        if (existing) return existing;

        return {
            weekly: Object.fromEntries(weeklyScores.map((w) => [w.weekId, w.score === null ? '' : String(w.score)])),
            manual: manualAdjustment === null ? '' : String(manualAdjustment),
        };
    };

    const setWeeklyDraftValue = (userId: number, weekId: number, value: string, fallback: RowDraft) => {
        setDrafts((prev) => ({
            ...prev,
            [userId]: {
                ...fallback,
                ...(prev[userId] || {}),
                weekly: {
                    ...fallback.weekly,
                    ...(prev[userId]?.weekly || {}),
                    [weekId]: value,
                },
                manual: prev[userId]?.manual ?? fallback.manual,
            },
        }));
    };

    const setManualDraftValue = (userId: number, value: string, fallback: RowDraft) => {
        setDrafts((prev) => ({
            ...prev,
            [userId]: {
                ...fallback,
                ...(prev[userId] || {}),
                weekly: {
                    ...fallback.weekly,
                    ...(prev[userId]?.weekly || {}),
                },
                manual: value,
            },
        }));
    };

    const saveRow = (userId: number, draft: RowDraft) => {
        for (const week of WEEKS) {
            const value = toNumberOrNull(draft.weekly[week.id] || '');
            const key = `${userId}_${week.id}`;
            setScoreEntry(key, value);
        }

        const manualValue = toNumberOrNull(draft.manual);
        setScoreEntry(`${userId}_manual_adjustment`, manualValue);

        setDrafts((prev) => {
            const next = { ...prev };
            delete next[userId];
            return next;
        });

        alert('점수가 저장되었습니다.');
    };

    return (
        <div className="flex flex-col min-h-screen bg-[#F2F6FF]">
            <header className="px-5 pt-14 pb-4 sticky top-0 bg-[#F2F6FF]/90 backdrop-blur-md z-20 border-b border-blue-100">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => navigate('/')}
                            className="p-2 bg-white rounded-full border border-blue-100 shadow-sm active:scale-90"
                        >
                            <ArrowLeft className="w-5 h-5 text-[#8B95A1]" />
                        </button>
                        <div>
                            <h1 className="text-[18px] font-black text-[#191F28] flex items-center gap-2">
                                <Users className="w-4 h-4 text-[#0064FF]" /> {TEACHER_ACCOUNT.name} 계정
                            </h1>
                            <p className="text-[12px] text-[#8B95A1] font-bold">학생 점수 관리/감독 및 수정</p>
                        </div>
                    </div>
                    <button
                        onClick={() => setIsChangePinModalOpen(true)}
                        className="flex items-center gap-1.5 px-3 py-2 bg-white text-[12px] font-black text-[#8B95A1] border border-blue-100 rounded-[12px] active:scale-95 shadow-sm"
                    >
                        <KeyRound className="w-3.5 h-3.5 text-[#0064FF]" /> 비번 변경
                    </button>
                </div>
            </header>

            <main className="flex-1 px-5 py-5 overflow-x-auto">
                <div className="flex items-center gap-2 mb-4">
                    <BarChart3 className="w-4 h-4 text-[#0064FF]" />
                    <h2 className="text-[14px] font-black text-[#8B95A1]">학생별 점수 현황</h2>
                </div>

                <div className="min-w-[940px] bg-white border border-blue-50 rounded-[20px] overflow-hidden shadow-sm">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-[#F2F6FF] border-b border-blue-100">
                            <tr>
                                <th className="px-5 py-4 text-[12px] font-black text-[#8B95A1] w-28">이름</th>
                                {WEEKS.map((week) => (
                                    <th key={week.id} className="px-3 py-4 text-[12px] font-black text-[#8B95A1] text-center">
                                        {week.title}
                                    </th>
                                ))}
                                <th className="px-3 py-4 text-[12px] font-black text-[#8B95A1] text-center">수동 가감점</th>
                                <th className="px-3 py-4 text-[12px] font-black text-[#8B95A1] text-center">출석일</th>
                                <th className="px-3 py-4 text-[12px] font-black text-[#8B95A1] text-center">사진인증</th>
                                <th className="px-5 py-4 text-[12px] font-black text-[#8B95A1] text-right">총점</th>
                                <th className="px-5 py-4 text-[12px] font-black text-[#8B95A1] text-center w-28">저장</th>
                            </tr>
                        </thead>
                        <tbody>
                            {studentData.map((student) => {
                                const rowDraft = getDraft(student.id, student.weeklyScores, student.manualAdjustment);
                                return (
                                    <tr key={student.id} className="border-b border-blue-50 last:border-0 hover:bg-blue-50/40 transition-colors">
                                        <td className="px-5 py-4 font-black text-[14px] text-[#191F28] whitespace-nowrap">{student.name}</td>

                                        {WEEKS.map((week) => (
                                            <td key={week.id} className="px-3 py-4 text-center">
                                                <input
                                                    type="number"
                                                    min={0}
                                                    value={rowDraft.weekly[week.id] ?? ''}
                                                    onChange={(e) =>
                                                        setWeeklyDraftValue(student.id, week.id, e.target.value, rowDraft)
                                                    }
                                                    className="w-20 px-2 py-1.5 text-center rounded-lg border border-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-200"
                                                />
                                            </td>
                                        ))}

                                        <td className="px-3 py-4 text-center">
                                            <input
                                                type="number"
                                                value={rowDraft.manual}
                                                onChange={(e) => setManualDraftValue(student.id, e.target.value, rowDraft)}
                                                className="w-24 px-2 py-1.5 text-center rounded-lg border border-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-200"
                                            />
                                        </td>

                                        <td className="px-3 py-4 text-center font-bold text-[#0064FF]">{student.attendanceDays}</td>
                                        <td className="px-3 py-4 text-center font-bold text-[#0064FF]">{student.photoCount}</td>
                                        <td className="px-5 py-4 text-right font-black text-[15px] text-[#0064FF]">{student.totalScore}</td>
                                        <td className="px-5 py-4 text-center">
                                            <button
                                                onClick={() => saveRow(student.id, rowDraft)}
                                                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#0064FF] text-white text-xs font-bold hover:bg-[#0056db] active:scale-95"
                                            >
                                                <Save className="w-3.5 h-3.5" /> 저장
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                <p className="mt-5 text-[11px] text-[#B0B8C1] font-bold text-center">
                    * 주차 점수, 수동 가감점을 수정 후 저장하면 즉시 반영됩니다.
                </p>
            </main>

            <ChangePinModal
                isOpen={isChangePinModalOpen}
                onClose={() => setIsChangePinModalOpen(false)}
                onSuccess={handleAdminPinChange}
                currentPin={userPins.admin || ADMIN_PIN}
                title={`${TEACHER_ACCOUNT.name} 관리자 비밀번호`}
            />
        </div>
    );
}
