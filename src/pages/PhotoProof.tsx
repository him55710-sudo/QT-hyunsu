import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, CalendarDays, Camera, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useQuizContext } from '../context/QuizContext';

const toDate = (dateKey: string) => {
    const [y, m, d] = dateKey.split('-').map(Number);
    return new Date(y, (m || 1) - 1, d || 1);
};

const formatDateKey = (dateKey: string) => {
    const dt = toDate(dateKey);
    return dt.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' });
};

export default function PhotoProof() {
    const navigate = useNavigate();
    const { selectedUserId, photoProofs, users } = useQuizContext();
    const currentUser = users.find((u) => u.id === selectedUserId);

    const [selectedProofId, setSelectedProofId] = useState<string | null>(null);

    const myProofs = photoProofs[(selectedUserId || '').toString()] || [];

    const sortedProofs = useMemo(
        () => [...myProofs].sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()),
        [myProofs]
    );

    const selectedProof = useMemo(
        () => sortedProofs.find((proof) => proof.id === selectedProofId) || null,
        [selectedProofId, sortedProofs]
    );

    if (!selectedUserId) {
        return (
            <div className="flex flex-col min-h-screen bg-slate-50 p-6 items-center justify-center">
                <p className="text-slate-500 mb-4">먼저 홈에서 이름을 선택해주세요.</p>
                <button onClick={() => navigate('/')} className="px-5 py-3 bg-indigo-500 text-white rounded-xl shadow-sm">
                    홈으로
                </button>
            </div>
        );
    }

    return (
        <div className="min-h-[100dvh] bg-[radial-gradient(circle_at_top,#eaf2ff_0%,#f8fbff_45%,#f8fafc_100%)] text-slate-800 pb-10">
            <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/90 backdrop-blur px-5 pt-12 pb-4">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => navigate('/')}
                        className="p-2 bg-white text-slate-600 border border-slate-200 rounded-full active:scale-95"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className="text-[18px] font-black flex items-center gap-2">
                            <Camera className="w-5 h-5 text-[#0064FF]" /> 나의 사진 아카이브
                        </h1>
                        <p className="text-[12px] text-slate-500 font-bold">{currentUser?.name}님의 저장된 QT 인증 사진</p>
                    </div>
                </div>
            </header>

            <main className="px-5 pt-5">
                {sortedProofs.length === 0 ? (
                    <div className="bg-white rounded-[18px] border border-slate-200 py-16 text-center text-slate-400">
                        <Camera className="w-9 h-9 mx-auto mb-2" />
                        <p className="text-[14px] font-bold">아직 저장된 인증 사진이 없습니다.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 gap-2">
                        {sortedProofs.map((proof) => (
                            <button
                                key={proof.id}
                                onClick={() => setSelectedProofId(proof.id)}
                                className="text-left rounded-[14px] border border-slate-200 bg-slate-50 overflow-hidden active:scale-[0.99]"
                            >
                                <div className="aspect-[4/3] bg-slate-200">
                                    {proof.imageDataUrl ? (
                                        <img src={proof.imageDataUrl} alt="QT 인증 사진" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-slate-400">
                                            <Camera className="w-5 h-5" />
                                        </div>
                                    )}
                                </div>
                                <div className="p-2.5">
                                    <p className="text-[11px] font-bold text-slate-500 inline-flex items-center gap-1">
                                        <CalendarDays className="w-3.5 h-3.5" /> 업로드 {formatDateKey(proof.submittedDateKey)}
                                    </p>
                                    <p className="mt-1 text-[11px] font-black text-emerald-600 inline-flex items-center gap-1">
                                        <CheckCircle2 className="w-3.5 h-3.5" /> +{proof.points}P
                                    </p>
                                </div>
                            </button>
                        ))}
                    </div>
                )}
            </main>

            <AnimatePresence>
                {selectedProof && (
                    <motion.div
                        className="fixed inset-0 z-50 bg-slate-900/75 backdrop-blur-sm p-4 flex items-center justify-center"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setSelectedProofId(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.94, y: 12 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.96, y: 8 }}
                            onClick={(e) => e.stopPropagation()}
                            className="w-full max-w-md bg-white rounded-[18px] overflow-hidden"
                        >
                            {selectedProof.imageDataUrl && (
                                <img src={selectedProof.imageDataUrl} alt="QT 인증 사진" className="w-full max-h-[60vh] object-cover" />
                            )}
                            <div className="p-4 space-y-1.5">
                                <p className="text-[12px] font-bold text-slate-500">업로드 날짜: {formatDateKey(selectedProof.submittedDateKey)}</p>
                                <p className="text-[12px] font-black text-emerald-600">+{selectedProof.points}P 획득</p>
                                <button
                                    onClick={() => setSelectedProofId(null)}
                                    className="mt-2 w-full h-10 rounded-[12px] bg-slate-100 text-slate-700 text-[13px] font-black"
                                >
                                    닫기
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
