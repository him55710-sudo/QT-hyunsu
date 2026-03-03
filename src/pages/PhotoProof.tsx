import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Camera, CheckCircle2, Upload } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useQuizContext } from '../context/QuizContext';
import { MOCK_USERS } from '../data/mockData';

const countMeaningfulChars = (text: string) => text.replace(/\s/g, '').length;

export default function PhotoProof() {
    const navigate = useNavigate();
    const fileInputRef = useRef<HTMLInputElement | null>(null);

    const { selectedUserId, photoProofs, certifyPhotoProof } = useQuizContext();
    const currentUser = MOCK_USERS.find(u => u.id === selectedUserId);

    const [imageFile, setImageFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string>('');
    const [bestQuestionsText, setBestQuestionsText] = useState('');
    const [oneVerseText, setOneVerseText] = useState('');
    const [thankOfferingsText, setThankOfferingsText] = useState('');

    const bestQuestionsLength = useMemo(() => countMeaningfulChars(bestQuestionsText), [bestQuestionsText]);
    const oneVerseLength = useMemo(() => countMeaningfulChars(oneVerseText), [oneVerseText]);
    const thankOfferingsLength = useMemo(() => countMeaningfulChars(thankOfferingsText), [thankOfferingsText]);

    const canSubmit = !!imageFile && bestQuestionsLength >= 20 && oneVerseLength >= 20 && thankOfferingsLength >= 20;
    const myProofs = photoProofs[(selectedUserId || '').toString()] || [];

    useEffect(() => {
        if (!imageFile) {
            setPreviewUrl('');
            return;
        }

        const objectUrl = URL.createObjectURL(imageFile);
        setPreviewUrl(objectUrl);

        return () => {
            URL.revokeObjectURL(objectUrl);
        };
    }, [imageFile]);

    const clearForm = () => {
        setImageFile(null);
        setBestQuestionsText('');
        setOneVerseText('');
        setThankOfferingsText('');
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleSubmit = () => {
        if (!selectedUserId || !imageFile) return;

        const result = certifyPhotoProof(selectedUserId, {
            imageName: imageFile.name,
            bestQuestionsLength,
            oneVerseLength,
            thankOfferingsLength,
        });

        if (!result.ok) {
            alert(result.message);
            return;
        }

        alert(`인증 완료! ${result.points}포인트가 지급되었습니다.`);
        clearForm();
    };

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
        <div className="flex flex-col min-h-[100dvh] bg-slate-50 text-slate-800 p-6">
            <header className="flex items-center gap-4 mb-6 sticky top-0 bg-slate-50/95 backdrop-blur-sm py-2 z-10">
                <button
                    onClick={() => navigate('/')}
                    className="p-2 bg-white text-slate-600 shadow-sm border border-slate-200 rounded-full hover:bg-slate-100 transition-colors active:scale-95"
                >
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <h1 className="text-lg font-bold flex items-center gap-2">
                    <Camera className="w-5 h-5 text-indigo-500" /> 사진 인증 (+10P)
                </h1>
            </header>

            <main className="flex-1 flex flex-col gap-5">
                <section className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                    <p className="text-sm text-slate-600">
                        {currentUser?.name} 인증 기준: <strong>Best Questions</strong>, <strong>One Verse</strong>, <strong>Thank Offerings</strong> 각각 20자 이상
                    </p>
                </section>

                <section className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
                    <label className="block text-sm font-semibold text-slate-700">1) 사진 업로드</label>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                        className="block w-full text-sm text-slate-600 file:mr-4 file:rounded-lg file:border-0 file:bg-indigo-50 file:px-3 file:py-2 file:text-indigo-600 file:font-semibold"
                    />

                    {previewUrl && (
                        <img src={previewUrl} alt="proof preview" className="w-full rounded-xl border border-slate-200 object-cover max-h-72" />
                    )}

                    <div className="grid gap-3">
                        <label className="text-sm font-semibold text-slate-700">2) Best Questions 내용</label>
                        <textarea
                            value={bestQuestionsText}
                            onChange={(e) => setBestQuestionsText(e.target.value)}
                            rows={3}
                            className="w-full rounded-xl border border-slate-200 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                        />
                        <p className={`text-xs ${bestQuestionsLength >= 20 ? 'text-emerald-600' : 'text-rose-500'}`}>
                            공백 제외 {bestQuestionsLength}자 / 20자 이상
                        </p>

                        <label className="text-sm font-semibold text-slate-700">3) One Verse 내용</label>
                        <textarea
                            value={oneVerseText}
                            onChange={(e) => setOneVerseText(e.target.value)}
                            rows={3}
                            className="w-full rounded-xl border border-slate-200 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                        />
                        <p className={`text-xs ${oneVerseLength >= 20 ? 'text-emerald-600' : 'text-rose-500'}`}>
                            공백 제외 {oneVerseLength}자 / 20자 이상
                        </p>

                        <label className="text-sm font-semibold text-slate-700">4) Thank Offerings 내용</label>
                        <textarea
                            value={thankOfferingsText}
                            onChange={(e) => setThankOfferingsText(e.target.value)}
                            rows={3}
                            className="w-full rounded-xl border border-slate-200 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                        />
                        <p className={`text-xs ${thankOfferingsLength >= 20 ? 'text-emerald-600' : 'text-rose-500'}`}>
                            공백 제외 {thankOfferingsLength}자 / 20자 이상
                        </p>
                    </div>

                    <button
                        onClick={handleSubmit}
                        disabled={!canSubmit}
                        className="w-full mt-2 px-4 py-3 rounded-xl bg-indigo-600 text-white font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
                    >
                        <Upload className="w-4 h-4" /> 인증하고 10포인트 받기
                    </button>
                </section>

                <section className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                    <h2 className="font-bold text-slate-800 mb-3">최근 인증 기록</h2>
                    {myProofs.length === 0 ? (
                        <p className="text-sm text-slate-500">아직 인증 기록이 없습니다.</p>
                    ) : (
                        <ul className="space-y-2">
                            {myProofs.slice(0, 5).map((proof) => (
                                <li key={proof.id} className="text-sm p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-start justify-between gap-3">
                                    <div>
                                        <p className="font-semibold text-slate-700">{proof.imageName}</p>
                                        <p className="text-xs text-slate-500">{proof.submittedAt}</p>
                                        <p className="text-xs text-slate-500 mt-1">
                                            BQ {proof.bestQuestionsLength} / OV {proof.oneVerseLength} / TO {proof.thankOfferingsLength}
                                        </p>
                                    </div>
                                    <span className="inline-flex items-center gap-1 text-emerald-600 font-bold text-xs whitespace-nowrap">
                                        <CheckCircle2 className="w-4 h-4" /> +{proof.points}P
                                    </span>
                                </li>
                            ))}
                        </ul>
                    )}
                </section>
            </main>
        </div>
    );
}
