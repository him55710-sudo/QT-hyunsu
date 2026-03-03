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
    bestQuestionsLength: number;
    oneVerseLength: number;
    thankOfferingsLength: number;
    points: number;
}

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
        bestQuestionsLength: number;
        oneVerseLength: number;
        thankOfferingsLength: number;
    }) => { ok: true; points: number } | { ok: false; message: string };
    setScoreEntry: (scoreKey: string, score: number | null) => void;
};

const QuizContext = createContext<QuizContextType | undefined>(undefined);

const SCORE_STORAGE_KEY = 'qt_quiz_scores_v3';
const USER_ONE_RESET_MARKER_KEY = 'qt_quiz_user1_reset_v1';
const PIN_STORAGE_KEY = 'qt_quiz_pins';
const WRONG_ANSWER_STORAGE_KEY = 'qt_quiz_wrong_answers_v2';
const COUPON_STORAGE_KEY = 'qt_quiz_coupons_v2';
const PHOTO_PROOF_STORAGE_KEY = 'qt_quiz_photo_proofs_v1';

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
        localStorage.setItem(WRONG_ANSWER_STORAGE_KEY, JSON.stringify(wrongAnswers));
    }, [wrongAnswers]);

    useEffect(() => {
        localStorage.setItem(COUPON_STORAGE_KEY, JSON.stringify(purchasedCoupons));
    }, [purchasedCoupons]);

    useEffect(() => {
        localStorage.setItem(PHOTO_PROOF_STORAGE_KEY, JSON.stringify(photoProofs));
    }, [photoProofs]);

    useEffect(() => {
        if (localStorage.getItem(USER_ONE_RESET_MARKER_KEY)) return;

        setScores(prev => Object.fromEntries(Object.entries(prev).filter(([key]) => !key.startsWith('1_'))));

        setWrongAnswers(prev => {
            if (!prev['1']) return prev;
            const next = { ...prev };
            delete next['1'];
            return next;
        });

        setPurchasedCoupons(prev => {
            if (!prev['1']) return prev;
            const next = { ...prev };
            delete next['1'];
            return next;
        });

        setPhotoProofs(prev => {
            if (!prev['1']) return prev;
            const next = { ...prev };
            delete next['1'];
            return next;
        });

        localStorage.removeItem('qt_quiz_diary_v3_1');
        localStorage.setItem(USER_ONE_RESET_MARKER_KEY, 'done');
    }, []);

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
                [attendanceKey]: 20,
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
        bestQuestionsLength: number;
        oneVerseLength: number;
        thankOfferingsLength: number;
    }) => {
        if (
            payload.bestQuestionsLength < 20 ||
            payload.oneVerseLength < 20 ||
            payload.thankOfferingsLength < 20
        ) {
            return { ok: false as const, message: 'All three sections must be at least 20 chars.' };
        }

        const awardedPoints = 10;
        const proofId = Date.now().toString() + Math.random().toString(36).slice(2, 7);

        setScores(prev => ({
            ...prev,
            [`${userId}_photo_proof_${proofId}`]: awardedPoints,
        }));

        const submission: PhotoProofSubmission = {
            id: proofId,
            imageName: payload.imageName,
            submittedAt: new Date().toLocaleString('ko-KR'),
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
            return {
                ...prev,
                [scoreKey]: Math.max(0, Math.floor(score)),
            };
        });
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
