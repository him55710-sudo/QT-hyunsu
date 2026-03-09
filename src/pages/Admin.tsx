import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, BarChart3, Download, KeyRound, Lock, LockOpen, ShieldAlert, Upload, Users } from 'lucide-react';
import { useQuizContext } from '../context/QuizContext';
import { ADMIN_PIN, MOCK_USERS, TEACHER_ACCOUNT, WEEKS } from '../data/mockData';
import ChangePinModal from '../components/ChangePinModal';
import PinModal from '../components/PinModal';

export default function Admin() {
    const navigate = useNavigate();
    const { scores, userPins, updatePin, getUserTotalPoints, getUserSpentPoints, getUserCurrentPoints, isWeekPublic, updateWeekVisibility, exportBackup, importBackup } = useQuizContext();

    const [isChangePinModalOpen, setIsChangePinModalOpen] = useState(false);
    const [isAdminVerified, setIsAdminVerified] = useState(false);
    const [isAdminPinModalOpen, setIsAdminPinModalOpen] = useState(true);
    const fileInputRef = useRef<HTMLInputElement>(null);

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

    const handleDownloadBackup = () => {
        const backupRaw = exportBackup();
        const blob = new Blob([backupRaw], { type: 'application/json;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        const today = new Date().toISOString().slice(0, 10);

        anchor.href = url;
        anchor.download = `qt-quiz-backup-${today}.json`;
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        URL.revokeObjectURL(url);
    };

    const handleBackupFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        try {
            const raw = await file.text();
            const result = importBackup(raw);
            if (result.ok) {
                alert('백업 복원이 완료되었습니다.');
            } else {
                alert(result.message);
            }
        } catch {
            alert('파일을 읽을 수 없습니다. 다시 시도해주세요.');
        } finally {
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
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
                                                className={`inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-black border transition-colors min-w-[84px] whitespace-nowrap leading-none shrink-0 ${isPublic
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

                        <div className="bg-white border border-slate-200 rounded-[18px] p-4 mb-4">
                            <div className="flex items-center gap-2 mb-3">
                                <Users className="w-4 h-4 text-[#0064FF]" />
                                <h2 className="text-[14px] font-black text-[#8B95A1]">기기 변경 데이터 이전</h2>
                            </div>
                            <p className="text-[12px] text-[#8B95A1] font-bold leading-relaxed">
                                현재 기기에서 백업 파일을 저장한 뒤, 새 기기 관리자 페이지에서 파일을 업로드하면 전체 데이터가 복원됩니다.
                            </p>
                            <div className="mt-3 flex flex-col sm:flex-row gap-2">
                                <button
                                    onClick={handleDownloadBackup}
                                    className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-[12px] bg-[#0064FF] text-white text-[13px] font-black hover:bg-[#0056db] active:scale-95"
                                >
                                    <Download className="w-4 h-4" /> 백업 다운로드
                                </button>
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-[12px] bg-white border border-slate-300 text-[#4E5968] text-[13px] font-black hover:bg-[#F8FAFC] active:scale-95"
                                >
                                    <Upload className="w-4 h-4" /> 백업 복원
                                </button>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="application/json,.json"
                                    className="hidden"
                                    onChange={handleBackupFileChange}
                                />
                            </div>
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
                                                <th className="px-3 py-4 text-[12px] font-black text-[#8B95A1] text-center">현재 포인트</th>
                                                <th className="px-3 py-4 text-[12px] font-black text-[#8B95A1] text-center">주차퀴즈</th>
                                                <th className="px-3 py-4 text-[12px] font-black text-[#8B95A1] text-center">출석(일/점)</th>
                                                <th className="px-3 py-4 text-[12px] font-black text-[#8B95A1] text-center">사진(회/점)</th>
                                                <th className="px-3 py-4 text-[12px] font-black text-[#8B95A1] text-center">사용포인트</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {studentData.map((student) => (
                                                <tr key={student.id} className="border-b border-blue-50 last:border-0 hover:bg-blue-50/40 transition-colors">
                                                    <td className="px-5 py-4 font-black text-[14px] text-[#191F28] whitespace-nowrap">{student.name}</td>

                                                    <td className="px-3 py-4 text-center font-black text-[#0064FF]">{student.currentPoints}P</td>

                                                    <td className="px-3 py-4 text-center font-bold text-[#8B95A1]">{student.weeklyTotal}P</td>
                                                    <td className="px-3 py-4 text-center font-bold text-[#8B95A1]">{student.attendanceDays}일 / {student.attendancePoints}P</td>
                                                    <td className="px-3 py-4 text-center font-bold text-[#8B95A1]">{student.photoCount}회 / {student.photoPoints}P</td>
                                                    <td className="px-3 py-4 text-center font-bold text-[#8B95A1]">{student.spentPoints}P</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
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

