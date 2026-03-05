import React, { createContext, useContext, useEffect, useState } from 'react';

export interface PurchasedCoupon {
    id: string;
    couponId: string;
    title: string;
    price: number;
    purchasedAt: string;
}

export interface PhotoProofSubmission {
    id: string;
    imageName: string;
    submittedAt: string;
    submittedDateKey: string;
    imageFingerprint: string;
    imageDataUrl?: string;
    bestQuestionsLength: number;
    oneVerseLength: number;
    thankOfferingsLength: number;
    points: number;
}

type QuizBackupPayload = {
    version: number;
    exportedAt: string;
    data: {
        selectedUserId: number | null;
        scores: Record<string, number>;
        userPins: Record<string, string>;
        wrongAnswers: Record<string, number[]>;
        purchasedCoupons: Record<string, PurchasedCoupon[]>;
        photoProofs: Record<string, PhotoProofSubmission[]>;
        weekVisibility: Record<string, boolean>;
    };
};

type QuizContextType = {
    selectedUserId: number | null;
    setSelectedUserId: (id: number | null) => void;
    scores: Record<string, number>;
    saveScore: (userId: number, weekId: number, score: number) => void;
    markAttendance: (userId: number) => boolean;
    userPins: Record<string, string>;
    updatePin: (targetId: number | 'admin', newPin: string) => void;
    wrongAnswers: Record<string, number[]>;
    addWrongAnswer: (userId: number, questionIndex: number) => void;
    purchasedCoupons: Record<string, PurchasedCoupon[]>;
    buyCoupon: (userId: number, coupon: Omit<PurchasedCoupon, 'id' | 'purchasedAt'>) => boolean;
    photoProofs: Record<string, PhotoProofSubmission[]>;
    certifyPhotoProof: (userId: number, payload: {
        imageName: string;
        imageFingerprint: string;
        imageDataUrl?: string;
        bestQuestionsLength: number;
        oneVerseLength: number;
        thankOfferingsLength: number;
    }) => { ok: true; points: number } | { ok: false; message: string };
    setScoreEntry: (scoreKey: string, score: number | null) => void;
    getUserTotalPoints: (userId: number) => number;
    getUserSpentPoints: (userId: number) => number;
    getUserCurrentPoints: (userId: number) => number;
    isWeekPublic: (weekId: number) => boolean;
    updateWeekVisibility: (weekId: number, isPublic: boolean) => void;
    weekVisibility: Record<string, boolean>;
    exportBackup: () => string;
    importBackup: (raw: string) => { ok: true } | { ok: false; message: string };
};

const QuizContext = createContext<QuizContextType | undefined>(undefined);

const SCORE_STORAGE_KEY = 'qt_quiz_scores_v3';
const PIN_STORAGE_KEY = 'qt_quiz_pins';
const WRONG_ANSWER_STORAGE_KEY = 'qt_quiz_wrong_answers_v2';
const COUPON_STORAGE_KEY = 'qt_quiz_coupons_v2';
const PHOTO_PROOF_STORAGE_KEY = 'qt_quiz_photo_proofs_v1';
const PHOTO_PROOF_MIN_CHARS = 15;
const WEEK_VISIBILITY_STORAGE_KEY = 'qt_quiz_week_visibility_v1';
const BACKUP_VERSION = 1;
const defaultWeekVisibility: Record<string, boolean> = {
    '1': false,
    '2': false,
    '3': false,
    '4': false,
    '5': false,
};

const toDateKey = (date: Date) => {
    const y = date.getFullYear();
    const m = `${date.getMonth() + 1}`.padStart(2, '0');
    const d = `${date.getDate()}`.padStart(2, '0');
    return `${y}-${m}-${d}`;
};

export function QuizProvider({ children }: { children: React.ReactNode }) {
    const [selectedUserId, setSelectedUserId] = useState<number | null>(() => {
        const saved = localStorage.getItem('qt_quiz_user_v2');
        return saved ? parseInt(saved, 10) : null;
    });

    const [scores, setScores] = useState<Record<string, number>>(() => {
        const saved = localStorage.getItem(SCORE_STORAGE_KEY);
        if (saved) return JSON.parse(saved);
        return {};
    });

    const [userPins, setUserPins] = useState<Record<string, string>>(() => {
        try {
            const saved = localStorage.getItem(PIN_STORAGE_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                if (typeof parsed === 'object' && parsed !== null) return parsed;
            }
        } catch (e) {
            console.error('Failed to parse user pins', e);
        }
        return {};
    });

    const [wrongAnswers, setWrongAnswers] = useState<Record<string, number[]>>(() => {
        try {
            const saved = localStorage.getItem(WRONG_ANSWER_STORAGE_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                if (typeof parsed === 'object' && parsed !== null) return parsed;
            }
        } catch (e) {
            console.error('Failed to parse wrong answers', e);
        }
        return {};
    });

    const [purchasedCoupons, setPurchasedCoupons] = useState<Record<string, PurchasedCoupon[]>>(() => {
        try {
            const saved = localStorage.getItem(COUPON_STORAGE_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                if (typeof parsed === 'object' && parsed !== null) return parsed;
            }
        } catch (e) {
            console.error('Failed to parse coupons', e);
        }
        return {};
    });

    const [photoProofs, setPhotoProofs] = useState<Record<string, PhotoProofSubmission[]>>(() => {
        try {
            const saved = localStorage.getItem(PHOTO_PROOF_STORAGE_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                if (typeof parsed === 'object' && parsed !== null) return parsed;
            }
        } catch (e) {
            console.error('Failed to parse photo proofs', e);
        }
        return {};
    });

    const [weekVisibility, setWeekVisibility] = useState<Record<string, boolean>>(() => {
        try {
            const saved = localStorage.getItem(WEEK_VISIBILITY_STORAGE_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                if (typeof parsed === 'object' && parsed !== null) {
                    return {
                        ...defaultWeekVisibility,
                        ...parsed,
                    };
                }
            }
        } catch (e) {
            console.error('Failed to parse week visibility', e);
        }
        return defaultWeekVisibility;
    });

    useEffect(() => {
        if (selectedUserId !== null) {
            localStorage.setItem('qt_quiz_user_v2', selectedUserId.toString());
        } else {
            localStorage.removeItem('qt_quiz_user_v2');
        }
    }, [selectedUserId]);

    useEffect(() => {
        localStorage.setItem(SCORE_STORAGE_KEY, JSON.stringify(scores));
    }, [scores]);

    useEffect(() => {
        localStorage.setItem(PIN_STORAGE_KEY, JSON.stringify(userPins));
    }, [userPins]);

    useEffect(() => {
        setUserPins((prev) => {
            const defaults: Record<string, string> = {
                '1': '1234',
                '2': '1234',
                '3': '1234',
                '4': '1234',
                '5': '1234',
                '6': '1234',
                '7': '1234',
                '8': '1234',
            };
            let changed = false;
            const next = { ...prev };
            Object.entries(defaults).forEach(([key, value]) => {
                if (!next[key]) {
                    next[key] = value;
                    changed = true;
                }
            });
            return changed ? next : prev;
        });
    }, []);

    useEffect(() => {
        localStorage.setItem(WRONG_ANSWER_STORAGE_KEY, JSON.stringify(wrongAnswers));
    }, [wrongAnswers]);

    useEffect(() => {
        localStorage.setItem(COUPON_STORAGE_KEY, JSON.stringify(purchasedCoupons));
    }, [purchasedCoupons]);

    useEffect(() => {
        localStorage.setItem(PHOTO_PROOF_STORAGE_KEY, JSON.stringify(photoProofs));
    }, [photoProofs]);

    useEffect(() => {
        localStorage.setItem(WEEK_VISIBILITY_STORAGE_KEY, JSON.stringify(weekVisibility));
    }, [weekVisibility]);

    const saveScore = (userId: number, weekId: number, score: number) => {
        setScores(prev => ({
            ...prev,
            [`${userId}_${weekId}`]: Math.max(prev[`${userId}_${weekId}`] || 0, score),
        }));
    };

    const markAttendance = (userId: number) => {
        const todayStr = new Date()
            .toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' })
            .replace(/\. /g, '-')
            .replace('.', '');
        const attendanceKey = `${userId}_attendance_${todayStr}`;

        let isNewlyMarked = false;
        setScores(prev => {
            if (prev[attendanceKey]) return prev;

            isNewlyMarked = true;
            return {
                ...prev,
                [attendanceKey]: 10,
            };
        });

        return isNewlyMarked;
    };

    const updatePin = (targetId: number | 'admin', newPin: string) => {
        setUserPins(prev => ({
            ...prev,
            [targetId.toString()]: newPin,
        }));
    };

    const addWrongAnswer = (userId: number, questionIndex: number) => {
        setWrongAnswers(prev => {
            const userKey = userId.toString();
            const prevAnswers = prev[userKey] || [];
            if (prevAnswers.includes(questionIndex)) return prev;
            return {
                ...prev,
                [userKey]: [...prevAnswers, questionIndex],
            };
        });
    };

    const buyCoupon = (userId: number, coupon: Omit<PurchasedCoupon, 'id' | 'purchasedAt'>) => {
        let totalScore = 0;
        Object.entries(scores).forEach(([key, score]) => {
            if (key.startsWith(`${userId}_`)) totalScore += score;
        });

        const userCoupons = purchasedCoupons[userId.toString()] || [];
        const spentPoints = userCoupons.reduce((sum, c) => sum + c.price, 0);
        const currentPoints = totalScore - spentPoints;

        if (currentPoints < coupon.price) return false;

        const newCoupon: PurchasedCoupon = {
            ...coupon,
            id: Date.now().toString() + Math.random().toString(36).slice(2, 7),
            purchasedAt: new Date().toLocaleDateString('ko-KR', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
            }),
        };

        setPurchasedCoupons(prev => ({
            ...prev,
            [userId.toString()]: [newCoupon, ...(prev[userId.toString()] || [])],
        }));

        return true;
    };

    const certifyPhotoProof = (userId: number, payload: {
        imageName: string;
        imageFingerprint: string;
        imageDataUrl?: string;
        bestQuestionsLength: number;
        oneVerseLength: number;
        thankOfferingsLength: number;
    }) => {
        const todayKey = toDateKey(new Date());
        const userProofs = photoProofs[userId.toString()] || [];

        if (userProofs.some((proof) => proof.submittedDateKey === todayKey)) {
            return { ok: false as const, message: '하루에 1번만 사진 인증이 가능합니다.' };
        }

        if (userProofs.some((proof) => proof.imageFingerprint === payload.imageFingerprint)) {
            return { ok: false as const, message: '이전에 통과한 사진과 동일한 이미지입니다. 새 사진으로 인증해주세요.' };
        }

        if (
            payload.bestQuestionsLength < PHOTO_PROOF_MIN_CHARS ||
            payload.oneVerseLength < PHOTO_PROOF_MIN_CHARS ||
            payload.thankOfferingsLength < PHOTO_PROOF_MIN_CHARS
        ) {
            return { ok: false as const, message: `판독 기준 미달: 각 항목 최소 ${PHOTO_PROOF_MIN_CHARS}자 필요` };
        }

        const awardedPoints = 20;
        const proofId = Date.now().toString() + Math.random().toString(36).slice(2, 7);

        setScores(prev => ({
            ...prev,
            [`${userId}_photo_proof_${proofId}`]: awardedPoints,
        }));

        const submission: PhotoProofSubmission = {
            id: proofId,
            imageName: payload.imageName,
            submittedAt: new Date().toLocaleString('ko-KR'),
            submittedDateKey: todayKey,
            imageFingerprint: payload.imageFingerprint,
            imageDataUrl: payload.imageDataUrl,
            bestQuestionsLength: payload.bestQuestionsLength,
            oneVerseLength: payload.oneVerseLength,
            thankOfferingsLength: payload.thankOfferingsLength,
            points: awardedPoints,
        };

        setPhotoProofs(prev => ({
            ...prev,
            [userId.toString()]: [submission, ...(prev[userId.toString()] || [])],
        }));

        return { ok: true as const, points: awardedPoints };
    };

    const setScoreEntry = (scoreKey: string, score: number | null) => {
        setScores(prev => {
            if (score === null) {
                if (!(scoreKey in prev)) return prev;
                const next = { ...prev };
                delete next[scoreKey];
                return next;
            }
            const normalized = Math.floor(score);
            const isManualAdjustment = scoreKey.endsWith('_manual_adjustment');
            return {
                ...prev,
                [scoreKey]: isManualAdjustment ? normalized : Math.max(0, normalized),
            };
        });
    };

    const getUserTotalPoints = (userId: number) => {
        let total = 0;
        Object.entries(scores).forEach(([key, value]) => {
            if (key.startsWith(`${userId}_`)) total += value;
        });
        return total;
    };

    const getUserSpentPoints = (userId: number) => {
        const userCoupons = purchasedCoupons[userId.toString()] || [];
        return userCoupons.reduce((sum, coupon) => sum + coupon.price, 0);
    };

    const getUserCurrentPoints = (userId: number) => {
        return getUserTotalPoints(userId) - getUserSpentPoints(userId);
    };

    const isWeekPublic = (weekId: number) => {
        return Boolean(weekVisibility[weekId.toString()]);
    };

    const updateWeekVisibility = (weekId: number, isPublic: boolean) => {
        setWeekVisibility(prev => ({
            ...prev,
            [weekId.toString()]: isPublic,
        }));
    };

    const exportBackup = () => {
        const payload: QuizBackupPayload = {
            version: BACKUP_VERSION,
            exportedAt: new Date().toISOString(),
            data: {
                selectedUserId,
                scores,
                userPins,
                wrongAnswers,
                purchasedCoupons,
                photoProofs,
                weekVisibility,
            },
        };
        return JSON.stringify(payload, null, 2);
    };

    const importBackup = (raw: string) => {
        try {
            const parsed = JSON.parse(raw) as Partial<QuizBackupPayload>;
            if (!parsed || typeof parsed !== 'object') {
                return { ok: false as const, message: '백업 파일 형식이 올바르지 않습니다.' };
            }
            if (!parsed.data || typeof parsed.data !== 'object') {
                return { ok: false as const, message: '백업 데이터가 없습니다.' };
            }

            const incomingSelectedUserId = parsed.data.selectedUserId;
            const incomingScores = parsed.data.scores;
            const incomingPins = parsed.data.userPins;
            const incomingWrongAnswers = parsed.data.wrongAnswers;
            const incomingCoupons = parsed.data.purchasedCoupons;
            const incomingPhotoProofs = parsed.data.photoProofs;
            const incomingWeekVisibility = parsed.data.weekVisibility;

            if (
                (incomingSelectedUserId !== null && typeof incomingSelectedUserId !== 'number') ||
                typeof incomingScores !== 'object' || incomingScores === null ||
                typeof incomingPins !== 'object' || incomingPins === null ||
                typeof incomingWrongAnswers !== 'object' || incomingWrongAnswers === null ||
                typeof incomingCoupons !== 'object' || incomingCoupons === null ||
                typeof incomingPhotoProofs !== 'object' || incomingPhotoProofs === null ||
                typeof incomingWeekVisibility !== 'object' || incomingWeekVisibility === null
            ) {
                return { ok: false as const, message: '백업 데이터 검증에 실패했습니다.' };
            }

            setSelectedUserId(incomingSelectedUserId ?? null);
            setScores(incomingScores as Record<string, number>);
            setUserPins(incomingPins as Record<string, string>);
            setWrongAnswers(incomingWrongAnswers as Record<string, number[]>);
            setPurchasedCoupons(incomingCoupons as Record<string, PurchasedCoupon[]>);
            setPhotoProofs(incomingPhotoProofs as Record<string, PhotoProofSubmission[]>);
            setWeekVisibility({
                ...defaultWeekVisibility,
                ...(incomingWeekVisibility as Record<string, boolean>),
            });

            return { ok: true as const };
        } catch {
            return { ok: false as const, message: '백업 파일을 읽는 중 오류가 발생했습니다.' };
        }
    };

    return (
        <QuizContext.Provider
            value={{
                selectedUserId,
                setSelectedUserId,
                scores,
                saveScore,
                markAttendance,
                userPins,
                updatePin,
                wrongAnswers,
                addWrongAnswer,
                purchasedCoupons,
                buyCoupon,
                photoProofs,
                certifyPhotoProof,
                setScoreEntry,
                getUserTotalPoints,
                getUserSpentPoints,
                getUserCurrentPoints,
                isWeekPublic,
                updateWeekVisibility,
                weekVisibility,
                exportBackup,
                importBackup,
            }}
        >
            {children}
        </QuizContext.Provider>
    );
}

export function useQuizContext() {
    const context = useContext(QuizContext);
    if (context === undefined) {
        throw new Error('useQuizContext must be used within a QuizProvider');
    }
    return context;
}
