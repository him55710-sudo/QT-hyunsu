import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { MOCK_USERS, WEEKS, ADMIN_PIN } from '../data/mockData';
import { BookOpen, Trophy, UserCheck, Camera, ChevronLeft, ChevronRight, Check, RotateCcw, Search, Star } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuizContext } from '../context/QuizContext';
import PinModal from '../components/PinModal';
import ChangePinModal from '../components/ChangePinModal';

export default function Home() {
    const navigate = useNavigate();
    const { selectedUserId, setSelectedUserId, markAttendance, scores, certifyPhotoProof, photoProofs, userPins, updatePin } = useQuizContext();
    const [showAttendanceToast, setShowAttendanceToast] = useState(false);
    const [pinModalConfig, setPinModalConfig] = useState<{ isOpen: boolean; expectedPin: string; title: string; targetId: number | 'admin' | null }>({ isOpen: false, expectedPin: '', title: '', targetId: null });
    const [isChangePinModalOpen, setIsChangePinModalOpen] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [uploadedImage, setUploadedImage] = useState<string | null>(null);
    const [uploadedFileName, setUploadedFileName] = useState('');
    const [isOcrLoading, setIsOcrLoading] = useState(false);
    const [ocrResult, setOcrResult] = useState<{ ok: boolean; message: string; points?: number } | null>(null);
    const today = new Date();
    const [calendarYear, setCalendarYear] = useState(today.getFullYear());
    const [calendarMonth, setCalendarMonth] = useState(today.getMonth());

    useEffect(() => {
        if (selectedUserId) {
            const marked = markAttendance(selectedUserId);
            if (marked) { setShowAttendanceToast(true); setTimeout(() => setShowAttendanceToast(false), 3500); }
        }
    }, [selectedUserId, markAttendance]);

    const handleUserSelect = (user: typeof MOCK_USERS[0]) => {
        if (selectedUserId === user.id) return;
        setPinModalConfig({ isOpen: true, expectedPin: user.pin, title: `${user.name} 님`, targetId: user.id });
    };
    const handleAdminClick = () => setPinModalConfig({ isOpen: true, expectedPin: userPins['admin'] || ADMIN_PIN, title: '임현수 선생님', targetId: 'admin' });
    const handlePinSuccess = () => {
        setPinModalConfig(prev => ({ ...prev, isOpen: false }));
        setTimeout(() => {
            if (pinModalConfig.targetId === 'admin') navigate('/admin');
            else if (typeof pinModalConfig.targetId === 'number') setSelectedUserId(pinModalConfig.targetId);
        }, 200);
    };
    const handleWeekClick = (weekId: number) => {
        if (!selectedUserId) { alert('먼저 내 이름을 선택해주세요!'); return; }
        navigate(`/quiz/${weekId}`);
    };
    const handleChangePinSuccess = (newPin: string) => {
        if (selectedUserId) updatePin(selectedUserId, newPin);
        setIsChangePinModalOpen(false);
        alert('비밀번호가 변경되었습니다!');
    };

    const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]; if (!file) return;
        setUploadedFileName(file.name); setOcrResult(null);
        const reader = new FileReader();
        reader.onload = (ev) => setUploadedImage(ev.target?.result as string);
        reader.readAsDataURL(file);
    };
    const handleOcrAnalyze = async () => {
        if (!selectedUserId || !uploadedImage) return;
        setIsOcrLoading(true); setOcrResult(null);
        try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const Tesseract = await import('tesseract.js') as any;
            const { data: { text } } = await Tesseract.recognize(uploadedImage, 'kor+eng', {});
            const lower = text.toLowerCase();
            const bestIdx = lower.search(/best\s*question/), verseIdx = lower.search(/one\s*verse/), thankIdx = lower.search(/thank/);
            const extract = (si: number, ni: number) => { if (si === -1) return ''; const end = ni !== -1 && ni > si ? ni : si + 300; return text.slice(si, end).trim(); };
            const bestText = extract(bestIdx, Math.min(...[verseIdx, thankIdx].filter(i => i > bestIdx && i !== -1).concat([Infinity])));
            const verseText = extract(verseIdx, Math.min(...[bestIdx, thankIdx].filter(i => i > verseIdx && i !== -1).concat([Infinity])));
            const thankText = extract(thankIdx, -1);
            const result = certifyPhotoProof(selectedUserId, { imageName: uploadedFileName, bestQuestionsLength: bestText.length, oneVerseLength: verseText.length, thankOfferingsLength: thankText.length });
            if (result.ok) {
                setOcrResult({ ok: true, message: `인증 완료! +${result.points}P 적립됐어요 🎉`, points: result.points });
            } else {
                const missing: string[] = [];
                if (bestText.length < 20) missing.push('Best Questions');
                if (verseText.length < 20) missing.push('One Verse');
                if (thankText.length < 20) missing.push('Thank Offerings');
                setOcrResult({ ok: false, message: missing.length > 0 ? `인식 부족: ${missing.join(', ')}\n더 선명하게 찍어 다시 시도해주세요.` : result.message });
            }
        } catch { setOcrResult({ ok: false, message: '분석 중 오류가 발생했어요.' }); }
        finally { setIsOcrLoading(false); }
    };

    const getAttendanceDays = (): Set<number> => {
        if (!selectedUserId) return new Set();
        const prefix = `${selectedUserId}_attendance_`, result = new Set<number>();
        Object.keys(scores).forEach(key => {
            if (!key.startsWith(prefix)) return;
            const parts = key.slice(prefix.length).replace(/\.$/, '').split('-');
            if (parts.length === 3) { const y = parseInt(parts[0]), m = parseInt(parts[1]) - 1, d = parseInt(parts[2]); if (y === calendarYear && m === calendarMonth) result.add(d); }
        });
        return result;
    };
    const thisMonthProofCount = selectedUserId ? (photoProofs[selectedUserId.toString()] || []).filter(p => { const d = new Date(p.submittedAt); return d.getFullYear() === calendarYear && d.getMonth() === calendarMonth; }).length : 0;
    const attendanceDays = getAttendanceDays();
    const firstDayOfMonth = new Date(calendarYear, calendarMonth, 1).getDay();
    const daysInMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate();
    const monthNames = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'];
    const weekDays = ['일', '월', '화', '수', '목', '금', '토'];
    const currentUser = MOCK_USERS.find(u => u.id === selectedUserId);
    const totalPoints = selectedUserId ? Object.entries(scores).filter(([k]) => k.startsWith(`${selectedUserId}_`)).reduce((s, [, v]) => s + v, 0) : 0;

    return (
        <div className="flex flex-col min-h-screen bg-[#F2F6FF] text-[#191F28]">
            {/* ── 상단 포인트 헤더 카드 ── */}
            <div className="px-5 pt-14 pb-5">
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="bg-[#0064FF] rounded-[24px] p-6 shadow-[0_8px_32px_rgba(0,100,255,0.25)]">
                    <div className="flex items-center gap-3 mb-5">
                        <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                            <BookOpen className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <p className="text-[13px] text-blue-200 font-bold">고등부 큐티 퀴즈</p>
                            <p className="text-[15px] font-black text-white">{currentUser ? `${currentUser.name} 님` : '이름을 선택해주세요'}</p>
                        </div>
                    </div>
                    <div className="mb-5">
                        <p className="text-[12px] text-blue-200 mb-1">내 포인트</p>
                        <div className="flex items-baseline gap-1">
                            <span className="text-[40px] font-black tracking-tight text-white">{selectedUserId ? totalPoints.toLocaleString() : '—'}</span>
                            <span className="text-[20px] font-black text-blue-200">P</span>
                        </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                        <button onClick={() => navigate('/store')} className="bg-white text-[#0064FF] rounded-[14px] py-3 text-[13px] font-black active:scale-95 transition-all shadow-sm">🎁 교환소</button>
                        <button onClick={() => navigate('/leaderboard')} className="bg-white/20 text-white rounded-[14px] py-3 text-[13px] font-bold active:scale-95 transition-all hover:bg-white/30">🏆 전당</button>
                        <button onClick={() => navigate('/wrong-answers')} className="bg-white/20 text-white rounded-[14px] py-3 text-[13px] font-bold active:scale-95 transition-all hover:bg-white/30">📝 오답</button>
                    </div>
                </motion.div>
            </div>

            <div className="flex-1 flex flex-col gap-4 px-5 pb-10">
                {/* ── 이름 선택 ── */}
                <motion.section initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white rounded-[20px] p-5 shadow-[0_2px_16px_rgba(0,100,255,0.06)] border border-blue-50">
                    <div className="flex items-center gap-2 mb-4">
                        <UserCheck className="w-4 h-4 text-[#0064FF]" />
                        <h2 className="text-[15px] font-black text-[#191F28]">내 이름 선택</h2>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        {MOCK_USERS.map((user) => (
                            <button key={user.id} onClick={() => handleUserSelect(user)}
                                className={`py-3 px-4 rounded-[14px] font-black text-[14px] transition-all active:scale-95 ${selectedUserId === user.id ? 'bg-[#0064FF] text-white shadow-[0_4px_12px_rgba(0,100,255,0.35)]' : 'bg-[#F2F6FF] text-[#4E5968] hover:bg-blue-50'}`}>
                                {user.name}
                            </button>
                        ))}
                    </div>
                    {selectedUserId && (
                        <div className="mt-3 pt-3 border-t border-slate-100 text-center">
                            <button onClick={() => setIsChangePinModalOpen(true)} className="text-[13px] text-[#0064FF] hover:opacity-70 font-bold transition-opacity">비밀번호 변경</button>
                        </div>
                    )}
                </motion.section>

                {/* ── 큐티 사진 인증 ── */}
                <motion.section initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="bg-white rounded-[20px] p-5 shadow-[0_2px_16px_rgba(0,100,255,0.06)] border border-blue-50">
                    <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                            <Camera className="w-4 h-4 text-[#0064FF]" />
                            <h2 className="text-[15px] font-black text-[#191F28]">큐티 사진 인증</h2>
                        </div>
                        <span className="text-[12px] font-black text-[#0064FF] bg-blue-50 px-2.5 py-0.5 rounded-full">+10P</span>
                    </div>
                    <p className="text-[12px] text-[#8B95A1] mb-4 leading-relaxed">QT 노트 사진 업로드 → AI 판독 → 포인트 적립<br /><span className="text-[#0064FF] font-bold">Best Questions · One Verse · Thank Offerings</span> 필요</p>
                    {!selectedUserId ? (
                        <div className="text-center py-5 text-[13px] text-[#B0B8C1] bg-[#F2F6FF] rounded-[14px] font-bold">이름을 먼저 선택해주세요</div>
                    ) : (
                        <>
                            <input ref={fileInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleImageSelect} />
                            {!uploadedImage ? (
                                <button onClick={() => fileInputRef.current?.click()} className="w-full border-2 border-dashed border-blue-200 hover:border-[#0064FF] rounded-[16px] py-7 flex flex-col items-center gap-2 text-blue-300 hover:text-[#0064FF] transition-all active:scale-95 bg-blue-50/50">
                                    <Camera className="w-7 h-7" />
                                    <span className="text-[13px] font-black">사진 촬영 / 갤러리</span>
                                </button>
                            ) : (
                                <div className="flex flex-col gap-3">
                                    <img src={uploadedImage} alt="큐티 사진" className="w-full rounded-[14px] object-cover max-h-44 border border-blue-100" />
                                    <p className="text-[11px] text-[#B0B8C1] truncate">{uploadedFileName}</p>
                                    <div className="flex gap-2">
                                        <button onClick={() => { setUploadedImage(null); setUploadedFileName(''); setOcrResult(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                                            className="flex items-center gap-1.5 px-4 py-2.5 bg-[#F2F6FF] hover:bg-blue-50 text-[#8B95A1] rounded-[12px] text-[13px] font-black transition-all active:scale-95">
                                            <RotateCcw className="w-3.5 h-3.5" />다시
                                        </button>
                                        <button onClick={handleOcrAnalyze} disabled={isOcrLoading}
                                            className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-[#0064FF] hover:bg-[#0050CC] disabled:opacity-50 text-white rounded-[12px] text-[13px] font-black transition-all active:scale-95 shadow-[0_4px_12px_rgba(0,100,255,0.3)]">
                                            {isOcrLoading ? (<><motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}><Search className="w-4 h-4" /></motion.div>판독 중...</>) : (<><Search className="w-4 h-4" />AI 판독</>)}
                                        </button>
                                    </div>
                                </div>
                            )}
                            <AnimatePresence>
                                {ocrResult && (
                                    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                                        className={`mt-3 p-4 rounded-[14px] text-[13px] font-bold whitespace-pre-line ${ocrResult.ok ? 'bg-blue-50 text-[#0064FF] border border-blue-100' : 'bg-red-50 text-red-500 border border-red-100'}`}>
                                        {ocrResult.ok && <Check className="w-4 h-4 inline mr-1.5" />}{ocrResult.message}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </>
                    )}
                </motion.section>

                {/* ── 큐티 출석 캘린더 ── */}
                <motion.section initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-white rounded-[20px] p-5 shadow-[0_2px_16px_rgba(0,100,255,0.06)] border border-blue-50">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h2 className="text-[15px] font-black text-[#191F28]">큐티 기록</h2>
                            {selectedUserId && <p className="text-[12px] text-[#8B95A1] mt-0.5">이번 달 인증 <span className="text-[#0064FF] font-black">{thisMonthProofCount}회</span></p>}
                        </div>
                        <div className="flex items-center gap-1">
                            <button onClick={() => { const d = new Date(calendarYear, calendarMonth - 1); setCalendarYear(d.getFullYear()); setCalendarMonth(d.getMonth()); }} className="p-1.5 rounded-full hover:bg-blue-50 transition-colors"><ChevronLeft className="w-4 h-4 text-[#8B95A1]" /></button>
                            <span className="text-[13px] font-black text-[#191F28] min-w-[68px] text-center">{calendarYear}년 {monthNames[calendarMonth]}</span>
                            <button onClick={() => { const d = new Date(calendarYear, calendarMonth + 1); setCalendarYear(d.getFullYear()); setCalendarMonth(d.getMonth()); }} className="p-1.5 rounded-full hover:bg-blue-50 transition-colors"><ChevronRight className="w-4 h-4 text-[#8B95A1]" /></button>
                        </div>
                    </div>
                    <div className="grid grid-cols-7 mb-2">
                        {weekDays.map((d, i) => (<div key={d} className={`text-center text-[11px] font-black py-1 ${i === 0 ? 'text-red-400' : i === 6 ? 'text-[#0064FF]' : 'text-[#B0B8C1]'}`}>{d}</div>))}
                    </div>
                    <div className="grid grid-cols-7 gap-y-1.5">
                        {Array.from({ length: firstDayOfMonth }).map((_, i) => <div key={`e-${i}`} />)}
                        {Array.from({ length: daysInMonth }).map((_, i) => {
                            const day = i + 1;
                            const isToday = day === today.getDate() && calendarMonth === today.getMonth() && calendarYear === today.getFullYear();
                            const isDone = attendanceDays.has(day);
                            return (
                                <div key={day} className="flex items-center justify-center">
                                    <div className={`w-8 h-8 flex items-center justify-center rounded-full text-xs font-black transition-all ${isDone ? 'bg-[#0064FF] text-white shadow-[0_2px_8px_rgba(0,100,255,0.3)]' : isToday ? 'border-2 border-[#0064FF] text-[#0064FF]' : 'text-[#8B95A1] hover:bg-blue-50'}`}>
                                        {isDone ? <Check className="w-3.5 h-3.5" /> : day}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </motion.section>

                {/* ── 주차별 퀴즈 ── */}
                <motion.section initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="bg-white rounded-[20px] p-5 shadow-[0_2px_16px_rgba(0,100,255,0.06)] border border-blue-50">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <Trophy className="w-4 h-4 text-[#0064FF]" />
                            <h2 className="text-[15px] font-black text-[#191F28]">주차별 퀴즈</h2>
                        </div>
                        <button onClick={() => navigate('/leaderboard')} className="text-[12px] text-[#0064FF] font-black hover:opacity-70 transition-opacity">명예의 전당 →</button>
                    </div>
                    <div className="flex flex-col gap-2">
                        {WEEKS.map((week) => (
                            <button key={week.id} onClick={() => handleWeekClick(week.id)}
                                className="flex items-center justify-between p-4 bg-[#F2F6FF] hover:bg-blue-50 rounded-[16px] transition-all active:scale-[0.98] group">
                                <div className="text-left">
                                    <h3 className="font-black text-[14px] text-[#191F28] group-hover:text-[#0064FF] transition-colors">{week.title}</h3>
                                    <p className="text-[12px] text-[#8B95A1] mt-0.5">{week.description}</p>
                                </div>
                                <div className="w-7 h-7 rounded-full bg-white group-hover:bg-[#0064FF] border border-blue-100 flex items-center justify-center transition-all shadow-sm">
                                    <span className="text-[#8B95A1] group-hover:text-white text-base leading-none translate-x-px font-black transition-colors">›</span>
                                </div>
                            </button>
                        ))}
                    </div>
                </motion.section>

                <div className="text-center pt-2 pb-4">
                    <button onClick={handleAdminClick} className="text-[12px] text-[#B0B8C1] hover:text-[#0064FF] font-bold transition-colors">선생님 전용 관리자 메뉴</button>
                </div>
            </div>

            <PinModal isOpen={pinModalConfig.isOpen} onClose={() => setPinModalConfig(prev => ({ ...prev, isOpen: false }))} onSuccess={handlePinSuccess} expectedPin={pinModalConfig.expectedPin} title={pinModalConfig.title} />
            {currentUser && (
                <ChangePinModal isOpen={isChangePinModalOpen} onClose={() => setIsChangePinModalOpen(false)} onSuccess={handleChangePinSuccess} currentPin={userPins[currentUser.id.toString()] || currentUser.pin} title={`${currentUser.name} 님`} />
            )}

            <AnimatePresence>
                {showAttendanceToast && (
                    <motion.div initial={{ opacity: 0, y: 60, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 20, scale: 0.9 }}
                        className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-[#0064FF] text-white px-6 py-3.5 rounded-full shadow-[0_8px_32px_rgba(0,100,255,0.4)] flex items-center gap-2.5 z-50 whitespace-nowrap">
                        <Star className="w-4 h-4 fill-white" />
                        <p className="font-black text-[13px]">출석 완료! +20P 적립됐어요 🎉</p>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
