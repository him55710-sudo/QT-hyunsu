
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { BookOpen, Camera, Check, ChevronLeft, ChevronRight, Lock, RotateCcw, Search, Star, Trophy, UserCheck } from 'lucide-react';
import { ADMIN_PIN, WEEKS } from '../data/mockData';
import { useQuizContext } from '../context/QuizContext';
import PinModal from '../components/PinModal';
import ChangePinModal from '../components/ChangePinModal';

type OcrSummary = {
    bestQuestionsLength: number;
    oneVerseLength: number;
    thankOfferingsLength: number;
};

const MONTH_NAMES = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'];
const WEEK_DAYS = ['일', '월', '화', '수', '목', '금', '토'];
const PHOTO_PROOF_MIN_CHARS = 15;

const normalizeForSearch = (value: string) => value.toLowerCase().replace(/[^a-z0-9가-힣\s]/g, ' ');
const meaningfulLength = (value: string) => (value.match(/[a-zA-Z0-9가-힣]/g) || []).length;

const stripTemplateLines = (value: string) => {
    const lines = value
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
        .filter((line) => {
            const lower = line.toLowerCase();
            return !(
                lower.includes('bible question') ||
                lower.includes('one verse') ||
                lower.includes('thank offering') ||
                line.includes('오늘 말씀 가운데') ||
                line.includes('감사 제목 세가지를')
            );
        });
    return lines.join('\n');
};

const findSectionStart = (normalized: string, patterns: RegExp[]) => {
    let found = -1;
    for (const pattern of patterns) {
        const match = pattern.exec(normalized);
        if (match) {
            const idx = match.index;
            if (found === -1 || idx < found) found = idx;
        }
    }
    return found;
};

const extractSections = (rawText: string): OcrSummary => {
    const cleanedRaw = stripTemplateLines(rawText);
    const normalized = normalizeForSearch(cleanedRaw);

    const bestIdx = findSectionStart(normalized, [/bible\s*questions?/g, /best\s*questions?/g]);
    const verseIdx = findSectionStart(normalized, [/one\s*verse/g, /oneverse/g]);
    const thankIdx = findSectionStart(normalized, [/thank\s*offerings?/g, /thank\s*offering/g, /감사/g]);

    const points = [
        { key: 'best' as const, idx: bestIdx },
        { key: 'verse' as const, idx: verseIdx },
        { key: 'thank' as const, idx: thankIdx },
    ].filter((item) => item.idx >= 0).sort((a, b) => a.idx - b.idx);

    let bestText = '';
    let verseText = '';
    let thankText = '';

    if (points.length >= 2) {
        for (let i = 0; i < points.length; i += 1) {
            const current = points[i];
            const next = points[i + 1];
            const sectionText = cleanedRaw.slice(current.idx, next ? next.idx : undefined);
            if (current.key === 'best') bestText = sectionText;
            if (current.key === 'verse') verseText = sectionText;
            if (current.key === 'thank') thankText = sectionText;
        }
    } else {
        const chunk = Math.max(1, Math.floor(cleanedRaw.length / 3));
        bestText = cleanedRaw.slice(0, chunk);
        verseText = cleanedRaw.slice(chunk, chunk * 2);
        thankText = cleanedRaw.slice(chunk * 2);
    }

    return {
        bestQuestionsLength: meaningfulLength(stripTemplateLines(bestText)),
        oneVerseLength: meaningfulLength(stripTemplateLines(verseText)),
        thankOfferingsLength: meaningfulLength(stripTemplateLines(thankText)),
    };
};

const loadImage = (src: string) =>
    new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = src;
    });

const preprocessImage = async (src: string, mode: 'original' | 'enhanced') => {
    if (mode === 'original') return src;

    const image = await loadImage(src);
    const scale = Math.min(1.6, 1800 / Math.max(image.width, image.height));
    const width = Math.max(1, Math.floor(image.width * scale));
    const height = Math.max(1, Math.floor(image.height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return src;

    ctx.drawImage(image, 0, 0, width, height);
    const imgData = ctx.getImageData(0, 0, width, height);
    const data = imgData.data;

    for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        let gray = r * 0.299 + g * 0.587 + b * 0.114;
        gray = (gray - 128) * 1.35 + 128;
        gray = gray > 165 ? 255 : gray;
        gray = Math.max(0, Math.min(255, gray));
        data[i] = gray;
        data[i + 1] = gray;
        data[i + 2] = gray;
    }

    ctx.putImageData(imgData, 0, 0);
    return canvas.toDataURL('image/jpeg', 0.92);
};

const createArchivePreview = async (src: string) => {
    const image = await loadImage(src);
    const maxWidth = 720;
    const scale = Math.min(1, maxWidth / image.width);
    const width = Math.max(1, Math.floor(image.width * scale));
    const height = Math.max(1, Math.floor(image.height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return src;
    ctx.drawImage(image, 0, 0, width, height);
    return canvas.toDataURL('image/jpeg', 0.78);
};

const generateImageFingerprint = async (dataUrl: string) => {
    const bytes = new TextEncoder().encode(dataUrl);
    const digest = await crypto.subtle.digest('SHA-256', bytes);
    const hashArray = Array.from(new Uint8Array(digest));
    return hashArray.map((byte) => byte.toString(16).padStart(2, '0')).join('');
};
const chooseBestSummary = (summaries: OcrSummary[]) => {
    return summaries.reduce((best, current) => {
        const bestScore = Math.min(best.bestQuestionsLength, best.oneVerseLength, best.thankOfferingsLength) * 5 + best.bestQuestionsLength + best.oneVerseLength + best.thankOfferingsLength;
        const currentScore = Math.min(current.bestQuestionsLength, current.oneVerseLength, current.thankOfferingsLength) * 5 + current.bestQuestionsLength + current.oneVerseLength + current.thankOfferingsLength;
        return currentScore > bestScore ? current : best;
    });
};

export default function Home() {
    const navigate = useNavigate();
    const { selectedUserId, setSelectedUserId, markAttendance, scores, certifyPhotoProof, photoProofs, userPins, updatePin, isWeekPublic, users, addUser } = useQuizContext();

    const [newUserName, setNewUserName] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [showAttendanceToast, setShowAttendanceToast] = useState(false);
    const [pinModalConfig, setPinModalConfig] = useState<{ isOpen: boolean; expectedPin: string; title: string; targetId: number | 'admin' | null }>({ isOpen: false, expectedPin: '', title: '', targetId: null });
    const [isChangePinModalOpen, setIsChangePinModalOpen] = useState(false);

    const [uploadedImage, setUploadedImage] = useState<string | null>(null);
    const [uploadedFileName, setUploadedFileName] = useState('');
    const [isOcrLoading, setIsOcrLoading] = useState(false);
    const [ocrResult, setOcrResult] = useState<{ ok: boolean; message: string } | null>(null);

    const now = new Date();
    const [calendarYear, setCalendarYear] = useState(now.getFullYear());
    const [calendarMonth, setCalendarMonth] = useState(now.getMonth());

    const currentUser = users.find((u) => u.id === selectedUserId);

    const totalPoints = useMemo(() => {
        if (!selectedUserId) return 0;
        return Object.entries(scores)
            .filter(([key]) => key.startsWith(`${selectedUserId}_`))
            .reduce((sum, [, value]) => sum + value, 0);
    }, [scores, selectedUserId]);

    useEffect(() => {
        if (!selectedUserId) return;
        const marked = markAttendance(selectedUserId);
        if (marked) {
            setShowAttendanceToast(true);
            setTimeout(() => setShowAttendanceToast(false), 3500);
        }
    }, [selectedUserId, markAttendance]);

    const handleUserSelect = (user: (typeof users)[number]) => {
        if (selectedUserId === user.id) return;
        setPinModalConfig({ isOpen: true, expectedPin: userPins[user.id.toString()] || user.pin || '1234', title: `${user.name} 로그인`, targetId: user.id });
    };

    const handlePinSuccess = () => {
        const target = pinModalConfig.targetId;
        setPinModalConfig((prev) => ({ ...prev, isOpen: false }));

        setTimeout(() => {
            if (target === 'admin') {
                navigate('/admin');
                return;
            }
            if (typeof target === 'number') {
                setSelectedUserId(target);
            }
        }, 200);
    };

    const handleAdminClick = () => {
        setPinModalConfig({ isOpen: true, expectedPin: userPins.admin || ADMIN_PIN, title: '임현수', targetId: 'admin' });
    };

    const handleChangePinSuccess = (newPin: string) => {
        if (!selectedUserId) return;
        updatePin(selectedUserId, newPin);
        setIsChangePinModalOpen(false);
        alert('비밀번호가 변경되었습니다.');
    };

    const handleWeekClick = (weekId: number) => {
        if (!selectedUserId) {
            alert('먼저 본인 이름으로 로그인해주세요.');
            return;
        }
        if (!isWeekPublic(weekId)) {
            alert('이 주차 퀴즈는 현재 비공개입니다. 관리자에게 공개 요청해주세요.');
            return;
        }
        navigate(`/quiz/${weekId}`);
    };

    const handleLogout = () => {
        setSelectedUserId(null);
        setUploadedImage(null);
        setUploadedFileName('');
        setOcrResult(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploadedFileName(file.name);
        setOcrResult(null);

        const reader = new FileReader();
        reader.onload = (ev) => setUploadedImage((ev.target?.result as string) || null);
        reader.readAsDataURL(file);
    };

    const handleOcrAnalyze = async () => {
        if (!selectedUserId || !uploadedImage) return;

        setIsOcrLoading(true);
        setOcrResult(null);

        try {
            const Tesseract = await import('tesseract.js');
            const variants = await Promise.all([
                preprocessImage(uploadedImage, 'original'),
                preprocessImage(uploadedImage, 'enhanced'),
            ]);

            const summaries: OcrSummary[] = [];
            for (const image of variants) {
                const result = await Tesseract.recognize(image, 'kor+eng', {
                    tessedit_pageseg_mode: '6',
                    preserve_interword_spaces: '1',
                    user_defined_dpi: '300',
                });
                summaries.push(extractSections(result.data.text || ''));
            }

            const best = chooseBestSummary(summaries);
            const imageFingerprint = await generateImageFingerprint(uploadedImage);
            const archivePreview = await createArchivePreview(uploadedImage);
            const certifyResult = certifyPhotoProof(selectedUserId, {
                imageName: uploadedFileName,
                imageFingerprint,
                imageDataUrl: archivePreview,
                bestQuestionsLength: best.bestQuestionsLength,
                oneVerseLength: best.oneVerseLength,
                thankOfferingsLength: best.thankOfferingsLength,
            });

            if (certifyResult.ok) {
                setOcrResult({ ok: true, message: `인증 완료! +${certifyResult.points}P 지급되었습니다.` });
            } else {
                const missing: string[] = [];
                if (best.bestQuestionsLength < PHOTO_PROOF_MIN_CHARS) missing.push('Best Questions');
                if (best.oneVerseLength < PHOTO_PROOF_MIN_CHARS) missing.push('One Verse');
                if (best.thankOfferingsLength < PHOTO_PROOF_MIN_CHARS) missing.push('Thank Offerings');
                if (missing.length > 0) {
                    setOcrResult({ ok: false, message: `실패 사유: ${certifyResult.message}\n부족 항목: ${missing.join(', ')}\n(BQ ${best.bestQuestionsLength} / OV ${best.oneVerseLength} / TO ${best.thankOfferingsLength})` });
                } else {
                    setOcrResult({ ok: false, message: `실패 사유: ${certifyResult.message}` });
                }
            }
        } catch {
            setOcrResult({ ok: false, message: '실패 사유: OCR 처리 중 오류가 발생했습니다. 다시 시도해주세요.' });
        } finally {
            setIsOcrLoading(false);
        }
    };

    const attendanceDays = useMemo(() => {
        if (!selectedUserId) return new Set<number>();

        const prefix = `${selectedUserId}_attendance_`;
        const result = new Set<number>();

        for (const key of Object.keys(scores)) {
            if (!key.startsWith(prefix)) continue;
            const parts = key.slice(prefix.length).replace(/\.$/, '').split('-');
            if (parts.length !== 3) continue;

            const y = Number(parts[0]);
            const m = Number(parts[1]) - 1;
            const d = Number(parts[2]);
            if (y === calendarYear && m === calendarMonth) result.add(d);
        }

        return result;
    }, [calendarMonth, calendarYear, scores, selectedUserId]);

    const thisMonthProofCount = useMemo(() => {
        if (!selectedUserId) return 0;
        const list = photoProofs[selectedUserId.toString()] || [];
        return list.filter((item) => {
            const dt = new Date(item.submittedAt);
            return dt.getFullYear() === calendarYear && dt.getMonth() === calendarMonth;
        }).length;
    }, [calendarMonth, calendarYear, photoProofs, selectedUserId]);

    const firstDayOfMonth = new Date(calendarYear, calendarMonth, 1).getDay();
    const daysInMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate();

    return (
        <div className="flex flex-col min-h-screen bg-[#F2F6FF] text-[#191F28]">
            <div className="px-5 pt-14 pb-5">
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="bg-[#0064FF] rounded-[24px] p-6 shadow-[0_8px_32px_rgba(0,100,255,0.25)]">
                    <div className="flex items-center gap-3 mb-5">
                        <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                            <BookOpen className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <p className="text-[13px] text-blue-200 font-bold">고등부 QT 퀴즈</p>
                            <p className="text-[15px] font-black text-white">{currentUser ? `${currentUser.name} 님` : '이름을 선택해주세요'}</p>
                        </div>
                    </div>

                    <div className="mb-5">
                        <p className="text-[12px] text-blue-200 mb-1">내 포인트</p>
                        <div className="flex items-baseline gap-1">
                            <span className="text-[40px] font-black tracking-tight text-white">{selectedUserId ? totalPoints.toLocaleString() : '--'}</span>
                            <span className="text-[20px] font-black text-blue-200">P</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                        <button onClick={() => navigate('/store')} className="bg-white text-[#0064FF] rounded-[14px] py-3 text-[13px] font-black active:scale-95 transition-all shadow-sm">포인트 교환</button>
                        <button onClick={() => navigate('/leaderboard')} className="bg-white/20 text-white rounded-[14px] py-3 text-[13px] font-bold active:scale-95 transition-all hover:bg-white/30">랭킹</button>
                        <button onClick={() => navigate('/wrong-answers')} className="bg-white/20 text-white rounded-[14px] py-3 text-[13px] font-bold active:scale-95 transition-all hover:bg-white/30">오답</button>
                    </div>
                </motion.div>
            </div>

            <div className="flex-1 flex flex-col gap-4 px-5 pb-10">
                <motion.section initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white rounded-[20px] p-5 shadow-[0_2px_16px_rgba(0,100,255,0.06)] border border-blue-50">
                    <div className="flex items-center gap-2 mb-4">
                        <UserCheck className="w-4 h-4 text-[#0064FF]" />
                        <h2 className="text-[15px] font-black text-[#191F28]">이름 로그인</h2>
                    </div>

                    {!selectedUserId ? (
                        <div className="flex flex-col gap-3">
                            <div className="grid grid-cols-2 gap-2">
                                {users.map((user) => (
                                    <button
                                        key={user.id}
                                        onClick={() => handleUserSelect(user)}
                                        className="py-3 px-4 rounded-[14px] font-black text-[14px] transition-all active:scale-95 bg-[#F2F6FF] text-[#4E5968] hover:bg-blue-50"
                                    >
                                        {user.name}
                                    </button>
                                ))}
                            </div>
                            <div className="mt-2 flex items-center gap-2 bg-[#F2F6FF] rounded-[14px] p-2 border border-blue-50">
                                <input
                                    type="text"
                                    value={newUserName}
                                    onChange={(e) => setNewUserName(e.target.value)}
                                    placeholder="새 사용자 이름"
                                    className="flex-1 py-2 px-3 rounded-[10px] text-[13px] border border-blue-100 focus:outline-none focus:ring-2 focus:ring-[#0064FF] text-[#191F28] font-bold"
                                />
                                <button
                                    onClick={() => {
                                        if (newUserName.trim() !== '') {
                                            addUser(newUserName.trim(), '1234');
                                            setNewUserName('');
                                            alert(`'${newUserName.trim()}' 사용자가 추가되었습니다. (초기 비밀번호: 1234)`);
                                        }
                                    }}
                                    className="px-4 py-2.5 bg-[#0064FF] text-white rounded-[10px] text-[13px] font-black active:scale-95 transition-all w-max whitespace-nowrap"
                                >
                                    + 추가
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-[#F2F6FF] rounded-[14px] p-4">
                            <p className="text-[14px] font-black text-[#191F28] mb-3">현재 로그인: {currentUser?.name}</p>
                            <div className="flex gap-2">
                                <button onClick={() => setIsChangePinModalOpen(true)} className="flex-1 py-2.5 rounded-[12px] bg-white border border-blue-100 text-[#0064FF] text-[13px] font-bold">비밀번호 변경</button>
                                <button onClick={handleLogout} className="flex-1 py-2.5 rounded-[12px] bg-white border border-blue-100 text-[#8B95A1] text-[13px] font-bold">로그아웃</button>
                            </div>
                        </div>
                    )}
                </motion.section>

                <motion.section initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="bg-white rounded-[20px] p-5 shadow-[0_2px_16px_rgba(0,100,255,0.06)] border border-blue-50">
                    <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                            <Camera className="w-4 h-4 text-[#0064FF]" />
                            <h2 className="text-[15px] font-black text-[#191F28]">QT 사진 인증</h2>
                        </div>
                        <span className="text-[12px] font-black text-[#0064FF] bg-blue-50 px-2.5 py-0.5 rounded-full">+20P</span>
                    </div>
                    <p className="text-[12px] text-[#8B95A1] mb-4 leading-relaxed">기준: Best Questions / One Verse / Thank Offerings 각각 {PHOTO_PROOF_MIN_CHARS}자 이상 (하루 1회)</p>

                    {!selectedUserId ? (
                        <div className="text-center py-5 text-[13px] text-[#B0B8C1] bg-[#F2F6FF] rounded-[14px] font-bold">먼저 본인 계정으로 로그인해주세요.</div>
                    ) : (
                        <>
                            <input ref={fileInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleImageSelect} />

                            {!uploadedImage ? (
                                <button onClick={() => fileInputRef.current?.click()} className="w-full border-2 border-dashed border-blue-200 hover:border-[#0064FF] rounded-[16px] py-7 flex flex-col items-center gap-2 text-blue-300 hover:text-[#0064FF] transition-all active:scale-95 bg-blue-50/50">
                                    <Camera className="w-7 h-7" />
                                    <span className="text-[13px] font-black">사진 촬영 / 갤러리 선택</span>
                                </button>
                            ) : (
                                <div className="flex flex-col gap-3">
                                    <img src={uploadedImage} alt="qt proof" className="w-full rounded-[14px] object-cover max-h-52 border border-blue-100" />
                                    <p className="text-[11px] text-[#B0B8C1] truncate">{uploadedFileName}</p>

                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => {
                                                setUploadedImage(null);
                                                setUploadedFileName('');
                                                setOcrResult(null);
                                                if (fileInputRef.current) fileInputRef.current.value = '';
                                            }}
                                            className="flex items-center gap-1.5 px-4 py-2.5 bg-[#F2F6FF] hover:bg-blue-50 text-[#8B95A1] rounded-[12px] text-[13px] font-black transition-all active:scale-95"
                                        >
                                            <RotateCcw className="w-3.5 h-3.5" /> 다시
                                        </button>

                                        <button onClick={handleOcrAnalyze} disabled={isOcrLoading} className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-[#0064FF] hover:bg-[#0050CC] disabled:opacity-50 text-white rounded-[12px] text-[13px] font-black transition-all active:scale-95 shadow-[0_4px_12px_rgba(0,100,255,0.3)]">
                                            {isOcrLoading ? (
                                                <>
                                                    <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}>
                                                        <Search className="w-4 h-4" />
                                                    </motion.div>
                                                    인식 중...
                                                </>
                                            ) : (
                                                <>
                                                    <Search className="w-4 h-4" /> AI 인식
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            )}

                            <AnimatePresence>
                                {ocrResult && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 8 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0 }}
                                        className={`mt-3 p-4 rounded-[14px] text-[13px] font-bold whitespace-pre-line ${ocrResult.ok ? 'bg-blue-50 text-[#0064FF] border border-blue-100' : 'bg-red-50 text-red-500 border border-red-100'
                                            }`}
                                    >
                                        {ocrResult.ok && <Check className="w-4 h-4 inline mr-1.5" />}
                                        {ocrResult.message}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </>
                    )}
                </motion.section>
                <motion.section initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-white rounded-[20px] p-5 shadow-[0_2px_16px_rgba(0,100,255,0.06)] border border-blue-50">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h2 className="text-[15px] font-black text-[#191F28]">QT 출석 기록</h2>
                            {selectedUserId && (
                                <p className="text-[12px] text-[#8B95A1] mt-0.5">
                                    이번 달 사진 인증 <span className="text-[#0064FF] font-black">{thisMonthProofCount}회</span>
                                </p>
                            )}
                        </div>
                        <div className="flex items-center gap-1">
                            <button onClick={() => { const d = new Date(calendarYear, calendarMonth - 1); setCalendarYear(d.getFullYear()); setCalendarMonth(d.getMonth()); }} className="p-1.5 rounded-full hover:bg-blue-50 transition-colors">
                                <ChevronLeft className="w-4 h-4 text-[#8B95A1]" />
                            </button>
                            <span className="text-[13px] font-black text-[#191F28] min-w-[84px] text-center">{calendarYear}년 {MONTH_NAMES[calendarMonth]}</span>
                            <button onClick={() => { const d = new Date(calendarYear, calendarMonth + 1); setCalendarYear(d.getFullYear()); setCalendarMonth(d.getMonth()); }} className="p-1.5 rounded-full hover:bg-blue-50 transition-colors">
                                <ChevronRight className="w-4 h-4 text-[#8B95A1]" />
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-7 mb-2">
                        {WEEK_DAYS.map((day, i) => (
                            <div key={day} className={`text-center text-[11px] font-black py-1 ${i === 0 ? 'text-red-400' : i === 6 ? 'text-[#0064FF]' : 'text-[#B0B8C1]'}`}>
                                {day}
                            </div>
                        ))}
                    </div>

                    <div className="grid grid-cols-7 gap-y-1.5">
                        {Array.from({ length: firstDayOfMonth }).map((_, i) => <div key={`empty-${i}`} />)}
                        {Array.from({ length: daysInMonth }).map((_, i) => {
                            const day = i + 1;
                            const isToday = day === now.getDate() && calendarMonth === now.getMonth() && calendarYear === now.getFullYear();
                            const isDone = attendanceDays.has(day);
                            return (
                                <div key={day} className="flex items-center justify-center">
                                    <div className={`w-8 h-8 flex items-center justify-center rounded-full text-xs font-black transition-all ${isDone ? 'bg-[#0064FF] text-white shadow-[0_2px_8px_rgba(0,100,255,0.3)]' : isToday ? 'border-2 border-[#0064FF] text-[#0064FF]' : 'text-[#8B95A1] hover:bg-blue-50'
                                        }`}>
                                        {isDone ? <Check className="w-3.5 h-3.5" /> : day}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </motion.section>

                <motion.section initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="bg-white rounded-[20px] p-5 shadow-[0_2px_16px_rgba(0,100,255,0.06)] border border-blue-50">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <Trophy className="w-4 h-4 text-[#0064FF]" />
                            <h2 className="text-[15px] font-black text-[#191F28]">주차별 퀴즈</h2>
                        </div>
                        <button onClick={() => navigate('/leaderboard')} className="text-[12px] text-[#0064FF] font-black hover:opacity-70 transition-opacity">명예의 전당</button>
                    </div>

                    <div className="flex flex-col gap-2">
                        {WEEKS.map((week) => (
                            <button
                                key={week.id}
                                onClick={() => handleWeekClick(week.id)}
                                className={`flex items-center justify-between p-4 rounded-[16px] transition-all active:scale-[0.98] group ${isWeekPublic(week.id)
                                    ? 'bg-[#F2F6FF] hover:bg-blue-50'
                                    : 'bg-slate-100 text-[#8B95A1] border border-slate-200'
                                    }`}
                            >
                                <div className="text-left">
                                    <h3 className={`font-black text-[14px] transition-colors ${isWeekPublic(week.id) ? 'text-[#191F28] group-hover:text-[#0064FF]' : 'text-[#8B95A1]'}`}>{week.title}</h3>
                                    <p className="text-[12px] text-[#8B95A1] mt-0.5">{week.description}</p>
                                </div>
                                <div className={`w-7 h-7 rounded-full border flex items-center justify-center transition-all shadow-sm ${isWeekPublic(week.id)
                                    ? 'bg-white group-hover:bg-[#0064FF] border-blue-100'
                                    : 'bg-white border-slate-200'
                                    }`}>
                                    {isWeekPublic(week.id) ? (
                                        <span className="text-[#8B95A1] group-hover:text-white text-base leading-none translate-x-px font-black transition-colors">›</span>
                                    ) : (
                                        <Lock className="w-3.5 h-3.5 text-[#8B95A1]" />
                                    )}
                                </div>
                            </button>
                        ))}
                    </div>
                </motion.section>

                <div className="text-center pt-2 pb-4">
                    <button onClick={handleAdminClick} className="text-[12px] text-[#B0B8C1] hover:text-[#0064FF] font-bold transition-colors">관리자 메뉴</button>
                </div>
            </div>

            <PinModal
                isOpen={pinModalConfig.isOpen}
                onClose={() => setPinModalConfig((prev) => ({ ...prev, isOpen: false }))}
                onSuccess={handlePinSuccess}
                expectedPin={pinModalConfig.expectedPin}
                title={pinModalConfig.title}
                pinLength={pinModalConfig.targetId === 'admin' ? 6 : 4}
            />

            {currentUser && (
                <ChangePinModal
                    isOpen={isChangePinModalOpen}
                    onClose={() => setIsChangePinModalOpen(false)}
                    onSuccess={handleChangePinSuccess}
                    currentPin={userPins[currentUser.id.toString()] || currentUser.pin || '1234'}
                    title={`${currentUser.name} 비밀번호 변경`}
                />
            )}

            <AnimatePresence>
                {showAttendanceToast && (
                    <motion.div
                        initial={{ opacity: 0, y: 60, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.9 }}
                        className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-[#0064FF] text-white px-6 py-3.5 rounded-full shadow-[0_8px_32px_rgba(0,100,255,0.4)] flex items-center gap-2.5 z-50 whitespace-nowrap"
                    >
                        <Star className="w-4 h-4 fill-white" />
                        <p className="font-black text-[13px]">출석 완료! +10P 지급되었습니다.</p>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
