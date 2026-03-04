import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, BarChart3, KeyRound, Lock, LockOpen, Save, ShieldAlert, Users } from 'lucide-react';
import { useQuizContext } from '../context/QuizContext';
import { ADMIN_PIN, MOCK_USERS, TEACHER_ACCOUNT, WEEKS } from '../data/mockData';
import ChangePinModal from '../components/ChangePinModal';
import PinModal from '../components/PinModal';

const toNumberOrNull = (value: string): number | null => {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : null;
};

export default function Admin() {
    const navigate = useNavigate();
    const { scores, userPins, updatePin, setScoreEntry, getUserTotalPoints, getUserSpentPoints, getUserCurrentPoints, isWeekPublic, updateWeekVisibility } = useQuizContext();

    const [isChangePinModalOpen, setIsChangePinModalOpen] = useState(false);
    const [currentPointDrafts, setCurrentPointDrafts] = useState<Record<number, string>>({});
    const [isAdminVerified, setIsAdminVerified] = useState(false);
    const [isAdminPinModalOpen, setIsAdminPinModalOpen] = useState(true);

    useEffect(() => {
        setIsAdminVerified(false);
        setIsAdminPinModalOpen(true);
    }, []);

    const handleAdminPinChange = (newPin: string) => {
        updatePin('admin', newPin);
        setIsChangePinModalOpen(false);
        alert('관리자 비밀번호가 변경되었습니다.');
    };

    const studentData = useMemo(() => {
        return MOCK_USERS.map((user) => {
            const weeklyTotal = WEEKS.reduce((sum, week) => sum + (scores[`${user.id}_${week.id}`] || 0), 0);

            const attendanceDays = Object.keys(scores).filter(
                (key) => key.startsWith(`${user.id}_attendance_`) && scores[key] > 0
            ).length;
            const attendancePoints = Object.entries(scores)
                .filter(([key, value]) => key.startsWith(`${user.id}_attendance_`) && value > 0)
                .reduce((sum, [, value]) => sum + value, 0);

            const photoCount = Object.keys(scores).filter(
                (key) => key.startsWith(`${user.id}_photo_proof_`) && scores[key] > 0
            ).length;
            const photoPoints = Object.entries(scores)
                .filter(([key, value]) => key.startsWith(`${user.id}_photo_proof_`) && value > 0)
                .reduce((sum, [, value]) => sum + value, 0);

            const manualAdjustment = scores[`${user.id}_manual_adjustment`] ?? 0;
            const totalScore = getUserTotalPoints(user.id);
            const spentPoints = getUserSpentPoints(user.id);
            const currentPoints = getUserCurrentPoints(user.id);

            return {
                ...user,
                weeklyTotal,
                attendanceDays,
                attendancePoints,
                photoCount,
                photoPoints,
                manualAdjustment,
                totalScore,
                spentPoints,
                currentPoints,
            };
        }).sort((a, b) => b.currentPoints - a.currentPoints);
    }, [scores, getUserCurrentPoints, getUserSpentPoints, getUserTotalPoints]);

    const getDraftValue = (userId: number, currentPoints: number) => {
        return currentPointDrafts[userId] ?? String(currentPoints);
    };

    const saveCurrentPoints = (userId: number, targetCurrentPointText: string, totalScore: number, spentPoints: number, manualAdjustment: number) => {
        const parsed = toNumberOrNull(targetCurrentPointText);
        if (parsed === null) {
            alert('현재 포인트를 숫자로 입력해주세요.');
            return;
        }

        const targetCurrentPoints = Math.max(0, Math.floor(parsed));

        // totalScore = (기본 누적점수 + manualAdjustment)
        // currentPoints = totalScore - spentPoints
        // targetCurrentPoints로 맞추기 위해 manualAdjustment를 역산
        const baseScoreWithoutManual = totalScore - manualAdjustment;
        const nextManualAdjustment = targetCurrentPoints + spentPoints - baseScoreWithoutManual;

        if (nextManualAdjustment === 0) {
            setScoreEntry(`${userId}_manual_adjustment`, null);
        } else {
            setScoreEntry(`${userId}_manual_adjustment`, nextManualAdjustment);
        }

        setCurrentPointDrafts((prev) => {
            const next = { ...prev };
            delete next[userId];
            return next;
        });

        alert('현재 포인트가 저장되었습니다.');
    };

    return (
        <div className="flex flex-col min-h-screen bg-[#F8FAFC]">
            <header className="px-5 pt-14 pb-4 sticky top-0 bg-[#F8FAFC]/95 z-20 border-b border-slate-200">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => navigate('/')}
                            className="p-2 bg-white rounded-full border border-slate-200 active:scale-95"
                        >
                            <ArrowLeft className="w-5 h-5 text-[#8B95A1]" />
                        </button>
                        <div>
                            <h1 className="text-[18px] font-black text-[#191F28] flex items-center gap-2">
                                <Users className="w-4 h-4 text-[#0064FF]" /> {TEACHER_ACCOUNT.name} 계정
                            </h1>
                            <p className="text-[12px] text-[#8B95A1] font-bold">학생 현재 포인트 직접 수정</p>
                        </div>
                    </div>
                    <button
                        onClick={() => setIsChangePinModalOpen(true)}
                        className="flex items-center gap-1.5 px-3 py-2 bg-white text-[12px] font-black text-[#8B95A1] border border-slate-200 rounded-[12px] active:scale-95"
                    >
                        <KeyRound className="w-3.5 h-3.5 text-[#0064FF]" /> 비번 변경
                    </button>
                </div>
            </header>

            <main className="flex-1 px-5 py-5 overflow-x-hidden">
                {!isAdminVerified ? (
                    <div className="min-h-[40vh] flex items-center justify-center">
                        <div className="bg-white border border-slate-200 rounded-[18px] px-6 py-7 text-center max-w-md w-full">
                            <ShieldAlert className="w-7 h-7 text-[#0064FF] mx-auto mb-3" />
                            <h2 className="text-[16px] font-black text-[#191F28]">관리자 인증 필요</h2>
                            <p className="text-[12px] text-[#8B95A1] font-bold mt-2">
                                관리자 비밀번호를 입력해야 점수 관리 화면에 접근할 수 있습니다.
                            </p>
                            <button
                                onClick={() => setIsAdminPinModalOpen(true)}
                                className="mt-4 px-4 py-2.5 rounded-[12px] bg-[#0064FF] text-white text-[13px] font-black hover:bg-[#0056db] active:scale-95"
                            >
                                비밀번호 입력
                            </button>
                        </div>
                    </div>
                ) : (
                    <>
                        <div className="bg-white border border-slate-200 rounded-[18px] p-4 mb-4">
                            <div className="flex items-center gap-2 mb-3">
                                <Lock className="w-4 h-4 text-[#0064FF]" />
                                <h2 className="text-[14px] font-black text-[#8B95A1]">주차별 퀴즈 공개 설정</h2>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                {WEEKS.map((week) => {
                                    const isPublic = isWeekPublic(week.id);
                                    return (
                                        <div
                                            key={`week-public-${week.id}`}
                                            className="flex items-center justify-between bg-[#F8FAFC] border border-slate-200 rounded-[14px] px-3 py-3"
                                        >
                                            <div className="flex-1 min-w-0">
                                                <p className="text-[13px] font-black text-[#191F28]">{week.title}</p>
                                                <p className="text-[11px] font-bold text-[#8B95A1] truncate pr-2">{week.description}</p>
                                            </div>
                                            <button
                                                onClick={() => updateWeekVisibility(week.id, !isPublic)}
                                                className={`inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-black border transition-colors min-w-[84px] whitespace-nowrap leading-none shrink-0 ${
                                                    isPublic
                                                        ? 'bg-blue-50 text-[#0064FF] border-blue-200'
                                                        : 'bg-slate-100 text-[#8B95A1] border-slate-200'
                                                }`}
                                            >
                                                {isPublic ? <LockOpen className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                                                {isPublic ? '공개' : '비공개'}
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                            <p className="mt-3 text-[11px] text-[#8B95A1] font-bold">
                                * 기본값은 비공개이며, 공개로 변경한 주차만 학생이 입장할 수 있습니다.
                            </p>
                        </div>

                        <div className="flex items-center gap-2 mb-4">
                            <BarChart3 className="w-4 h-4 text-[#0064FF]" />
                            <h2 className="text-[14px] font-black text-[#8B95A1]">학생별 포인트 현황</h2>
                        </div>

                        <div className="overflow-x-auto pb-1">
                            <div className="min-w-[940px]">
                                <div className="grid grid-cols-4 gap-2 mb-4">
                                    {studentData.map((student) => (
                                        <div key={`summary-${student.id}`} className="bg-white border border-slate-200 rounded-[12px] p-3">
                                            <p className="text-[11px] text-[#8B95A1] font-bold truncate">{student.name}</p>
                                            <p className="text-[18px] font-black text-[#0064FF]">{student.currentPoints}P</p>
                                            <p className="text-[10px] text-[#B0B8C1] font-bold">누적 {student.totalScore} / 사용 {student.spentPoints}</p>
                                        </div>
                                    ))}
                                </div>

                                <div className="bg-white border border-slate-200 rounded-[18px] overflow-hidden">
                                    <table className="w-full text-left text-sm">
                                        <thead className="bg-[#F8FAFC] border-b border-slate-200">
                                            <tr>
                                                <th className="px-5 py-4 text-[12px] font-black text-[#8B95A1] w-24">이름</th>
                                                <th className="px-3 py-4 text-[12px] font-black text-[#8B95A1] text-center">현재 포인트(수정)</th>
                                                <th className="px-3 py-4 text-[12px] font-black text-[#8B95A1] text-center">주차퀴즈</th>
                                                <th className="px-3 py-4 text-[12px] font-black text-[#8B95A1] text-center">출석(일/점)</th>
                                                <th className="px-3 py-4 text-[12px] font-black text-[#8B95A1] text-center">사진(회/점)</th>
                                                <th className="px-3 py-4 text-[12px] font-black text-[#8B95A1] text-center">가감점</th>
                                                <th className="px-3 py-4 text-[12px] font-black text-[#8B95A1] text-center">사용포인트</th>
                                                <th className="px-5 py-4 text-[12px] font-black text-[#8B95A1] text-center w-28">저장</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {studentData.map((student) => (
                                                <tr key={student.id} className="border-b border-blue-50 last:border-0 hover:bg-blue-50/40 transition-colors">
                                                    <td className="px-5 py-4 font-black text-[14px] text-[#191F28] whitespace-nowrap">{student.name}</td>

                                                    <td className="px-3 py-4 text-center">
                                                        <input
                                                            type="number"
                                                            min={0}
                                                            value={getDraftValue(student.id, student.currentPoints)}
                                                            onChange={(e) => setCurrentPointDrafts((prev) => ({ ...prev, [student.id]: e.target.value }))}
                                                            className="w-28 px-2 py-1.5 text-center rounded-lg border border-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-200 font-black text-[#0064FF]"
                                                        />
                                                    </td>

                                                    <td className="px-3 py-4 text-center font-bold text-[#8B95A1]">{student.weeklyTotal}P</td>
                                                    <td className="px-3 py-4 text-center font-bold text-[#8B95A1]">{student.attendanceDays}일 / {student.attendancePoints}P</td>
                                                    <td className="px-3 py-4 text-center font-bold text-[#8B95A1]">{student.photoCount}회 / {student.photoPoints}P</td>
                                                    <td className="px-3 py-4 text-center font-bold text-[#8B95A1]">{student.manualAdjustment}P</td>
                                                    <td className="px-3 py-4 text-center font-bold text-[#8B95A1]">{student.spentPoints}P</td>

                                                    <td className="px-5 py-4 text-center">
                                                        {(() => {
                                                            const draftValue = getDraftValue(student.id, student.currentPoints);
                                                            const parsed = toNumberOrNull(draftValue);
                                                            const normalized = parsed === null ? null : Math.max(0, Math.floor(parsed));
                                                            const isSaveDisabled = normalized === null || normalized === student.currentPoints;

                                                            return (
                                                                <button
                                                                    onClick={() => saveCurrentPoints(student.id, draftValue, student.totalScore, student.spentPoints, student.manualAdjustment)}
                                                                    disabled={isSaveDisabled}
                                                                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#0064FF] text-white text-xs font-bold hover:bg-[#0056db] active:scale-95 disabled:bg-[#D6DFEA] disabled:text-[#8B95A1] disabled:cursor-not-allowed disabled:active:scale-100"
                                                                >
                                                                    <Save className="w-3.5 h-3.5" /> 저장
                                                                </button>
                                                            );
                                                        })()}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>

                        <p className="mt-5 text-[11px] text-[#B0B8C1] font-bold text-center">
                            * 현재 포인트를 직접 입력하면 내부 가감점이 자동 계산되어 반영됩니다.
                        </p>
                    </>
                )}
            </main>

            <ChangePinModal
                isOpen={isChangePinModalOpen}
                onClose={() => setIsChangePinModalOpen(false)}
                onSuccess={handleAdminPinChange}
                currentPin={userPins.admin || ADMIN_PIN}
                title={`${TEACHER_ACCOUNT.name} 관리자 비밀번호`}
            />
            <PinModal
                isOpen={isAdminPinModalOpen}
                onClose={() => {
                    setIsAdminPinModalOpen(false);
                    if (!isAdminVerified) navigate('/');
                }}
                onSuccess={() => {
                    setIsAdminVerified(true);
                    setIsAdminPinModalOpen(false);
                }}
                expectedPin={userPins.admin || ADMIN_PIN}
                title="임현수"
            />
        </div>
    );
}
