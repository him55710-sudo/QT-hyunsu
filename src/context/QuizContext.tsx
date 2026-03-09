import React, { createContext, useContext, useEffect, useState } from 'react';
import { doc, setDoc, onSnapshot, deleteField, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { ADMIN_PIN, MOCK_USERS } from '../data/mockData';

export interface User {
    id: number;
    name: string;
    pin?: string;
}

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
    users: User[];
    addUser: (name: string, pin: string) => void;
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
    const [users, setUsers] = useState<User[]>(MOCK_USERS);

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

    const isInitializedRef = React.useRef(false);

    useEffect(() => {
        if (selectedUserId !== null) {
            localStorage.setItem('qt_quiz_user_v2', selectedUserId.toString());
        } else {
            localStorage.removeItem('qt_quiz_user_v2');
        }
    }, [selectedUserId]);

    // Firebase Sync for Scores
    const pushScoreUpdate = async (updateObj: Record<string, number | null>) => {
        try {
            const safeObj: any = { ...updateObj };
            for (const key in safeObj) {
                if (safeObj[key] === null) {
                    safeObj[key] = deleteField();
                }
            }
            await setDoc(doc(db, 'global_state', 'scores'), safeObj, { merge: true });
        } catch (e) {
            console.error('Firebase save error:', e);
        }
    };

    const pushUserUpdate = async (newUser: User) => {
        try {
            await setDoc(doc(db, 'global_state', 'users'), {
                [newUser.id]: newUser,
            }, { merge: true });
        } catch (e) {
            console.error('Firebase save error:', e);
        }
    };

    useEffect(() => {
        const initData = async () => {
            if (isInitializedRef.current) return;
            isInitializedRef.current = true;

            try {
                // Initialize User Pins
                let currentPins = { ...userPins };
                const pinsSnap = await getDoc(doc(db, 'global_state', 'userPins'));
                if (pinsSnap.exists()) {
                    currentPins = { ...currentPins, ...pinsSnap.data() };
                } else {
                    await setDoc(doc(db, 'global_state', 'userPins'), currentPins, { merge: true });
                }
                setUserPins(currentPins);

                // Initialize wrong answers
                let currentWrongAnswers = { ...wrongAnswers };
                const wrongAnswersSnap = await getDoc(doc(db, 'global_state', 'wrongAnswers'));
                if (wrongAnswersSnap.exists()) {
                    currentWrongAnswers = { ...currentWrongAnswers, ...wrongAnswersSnap.data() };
                } else {
                    await setDoc(doc(db, 'global_state', 'wrongAnswers'), currentWrongAnswers, { merge: true });
                }
                setWrongAnswers(currentWrongAnswers);

                // Initialize purchased coupons
                let currentPurchasedCoupons = { ...purchasedCoupons };
                const couponsSnap = await getDoc(doc(db, 'global_state', 'purchasedCoupons'));
                if (couponsSnap.exists()) {
                    currentPurchasedCoupons = { ...currentPurchasedCoupons, ...couponsSnap.data() };
                } else {
                    await setDoc(doc(db, 'global_state', 'purchasedCoupons'), currentPurchasedCoupons, { merge: true });
                }
                setPurchasedCoupons(currentPurchasedCoupons);

                // Initialize photo proofs
                let currentPhotoProofs = { ...photoProofs };
                const proofsSnap = await getDoc(doc(db, 'global_state', 'photoProofs'));
                if (proofsSnap.exists()) {
                    currentPhotoProofs = { ...currentPhotoProofs, ...proofsSnap.data() };
                } else {
                    await setDoc(doc(db, 'global_state', 'photoProofs'), currentPhotoProofs, { merge: true });
                }
                setPhotoProofs(currentPhotoProofs);

                // Initialize week visibility
                let currentWeekVisibility = { ...weekVisibility };
                const weekVizSnap = await getDoc(doc(db, 'global_state', 'weekVisibility'));
                if (weekVizSnap.exists()) {
                    currentWeekVisibility = { ...defaultWeekVisibility, ...currentWeekVisibility, ...weekVizSnap.data() };
                } else {
                    await setDoc(doc(db, 'global_state', 'weekVisibility'), currentWeekVisibility, { merge: true });
                }
                setWeekVisibility(currentWeekVisibility);

            } catch (e) {
                console.error("Error initializing existing data:", e);
            }

            // Start listeners
            const uUnsub = onSnapshot(doc(db, 'global_state', 'users'), (snapshot) => {
                if (snapshot.exists()) {
                    const data = snapshot.data();
                    const fetchedUsers = Object.values(data) as User[];
                    const cmap = new Map<number, User>();
                    MOCK_USERS.forEach((u) => cmap.set(u.id, u));
                    fetchedUsers.forEach((u) => cmap.set(u.id, u));
                    setUsers(Array.from(cmap.values()).sort((a, b) => a.id - b.id));
                } else {
                    setUsers([...MOCK_USERS]);
                }
            });

            const sUnsub = onSnapshot(doc(db, 'global_state', 'scores'), (snapshot) => {
                if (snapshot.exists()) {
                    setScores((prev) => ({ ...prev, ...snapshot.data() }));
                }
            });

            const pUnsub = onSnapshot(doc(db, 'global_state', 'userPins'), (snapshot) => {
                if (snapshot.exists()) {
                    setUserPins((prev) => ({ ...prev, ...snapshot.data() }));
                }
            });

            const wUnsub = onSnapshot(doc(db, 'global_state', 'wrongAnswers'), (snapshot) => {
                if (snapshot.exists()) {
                    setWrongAnswers((prev) => ({ ...prev, ...snapshot.data() }));
                }
            });

            const cUnsub = onSnapshot(doc(db, 'global_state', 'purchasedCoupons'), (snapshot) => {
                if (snapshot.exists()) {
                    setPurchasedCoupons((prev) => ({ ...prev, ...snapshot.data() }));
                }
            });

            const ppUnsub = onSnapshot(doc(db, 'global_state', 'photoProofs'), (snapshot) => {
                if (snapshot.exists()) {
                    setPhotoProofs((prev) => ({ ...prev, ...snapshot.data() }));
                }
            });

            const wvUnsub = onSnapshot(doc(db, 'global_state', 'weekVisibility'), (snapshot) => {
                if (snapshot.exists()) {
                    setWeekVisibility((prev) => ({ ...prev, ...snapshot.data() }));
                }
            });

            // Initial scores merge without overwriting firebase completely, just pushing local ones
            try {
                const currentScores = JSON.parse(localStorage.getItem(SCORE_STORAGE_KEY) || '{}');
                if (Object.keys(currentScores).length > 0) {
                    await setDoc(doc(db, 'global_state', 'scores'), currentScores, { merge: true });
                }
            } catch (e) {
                console.error("Failed to push initial scores", e);
            }

            return () => {
                uUnsub();
                sUnsub();
                pUnsub();
                wUnsub();
                cUnsub();
                ppUnsub();
                wvUnsub();
            };
        };

        const cleanupPromise = initData();
        return () => {
            cleanupPromise.then(cleanup => cleanup && cleanup());
        };
    }, []);

    useEffect(() => {
        localStorage.setItem(SCORE_STORAGE_KEY, JSON.stringify(scores));
    }, [scores]);

    useEffect(() => {
        localStorage.setItem(PIN_STORAGE_KEY, JSON.stringify(userPins));
    }, [userPins]);

    const addUser = (name: string, pin: string) => {
        const currentIds = users.filter(u => u.id < 900).map(u => u.id);
        const nextId = currentIds.length > 0 ? Math.max(...currentIds) + 1 : 1;
        const newUser: User = { id: nextId, name, pin };
        pushUserUpdate(newUser);
        updatePin(nextId, pin);
    };

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
                '999': '0000',
                admin: ADMIN_PIN,
            };
            let changed = false;
            const next = { ...prev };
            Object.entries(defaults).forEach(([key, value]) => {
                if (!next[key]) {
                    next[key] = value;
                    changed = true;
                }
            });

            if (!/^\d{6}$/.test(next.admin || '')) {
                next.admin = ADMIN_PIN;
                changed = true;
            }

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
        setScores(prev => {
            const key = `${userId}_${weekId}`;
            const newScore = Math.max(prev[key] || 0, score);
            pushScoreUpdate({ [key]: newScore });
            return {
                ...prev,
                [key]: newScore,
            };
        });
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
            pushScoreUpdate({ [attendanceKey]: 10 });
            return {
                ...prev,
                [attendanceKey]: 10,
            };
        });

        return isNewlyMarked;
    };

    const updatePin = (targetId: number | 'admin', newPin: string) => {
        setUserPins(prev => {
            const next = {
                ...prev,
                [targetId.toString()]: newPin,
            };
            setDoc(doc(db, 'global_state', 'userPins'), { [targetId.toString()]: newPin }, { merge: true }).catch(console.error);
            return next;
        });
    };

    const addWrongAnswer = (userId: number, questionIndex: number) => {
        setWrongAnswers(prev => {
            const userKey = userId.toString();
            const prevAnswers = prev[userKey] || [];
            if (prevAnswers.includes(questionIndex)) return prev;
            const updated = {
                ...prev,
                [userKey]: [...prevAnswers, questionIndex],
            };
            setDoc(doc(db, 'global_state', 'wrongAnswers'), { [userKey]: updated[userKey] }, { merge: true }).catch(console.error);
            return updated;
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

        setPurchasedCoupons(prev => {
            const updated = {
                ...prev,
                [userId.toString()]: [newCoupon, ...(prev[userId.toString()] || [])],
            };
            setDoc(doc(db, 'global_state', 'purchasedCoupons'), { [userId.toString()]: updated[userId.toString()] }, { merge: true }).catch(console.error);
            return updated;
        });

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
        const scoreKey = `${userId}_photo_proof_${proofId}`;

        pushScoreUpdate({ [scoreKey]: awardedPoints });

        setScores(prev => ({
            ...prev,
            [scoreKey]: awardedPoints,
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

        setPhotoProofs(prev => {
            const updated = {
                ...prev,
                [userId.toString()]: [submission, ...(prev[userId.toString()] || [])],
            };
            setDoc(doc(db, 'global_state', 'photoProofs'), { [userId.toString()]: updated[userId.toString()] }, { merge: true }).catch(console.error);
            return updated;
        });

        return { ok: true as const, points: awardedPoints };
    };

    const setScoreEntry = (scoreKey: string, score: number | null) => {
        setScores(prev => {
            if (score === null) {
                if (!(scoreKey in prev)) return prev;
                const next = { ...prev };
                delete next[scoreKey];
                pushScoreUpdate({ [scoreKey]: null });
                return next;
            }
            const normalized = Math.floor(score);
            const isManualAdjustment = scoreKey.endsWith('_manual_adjustment');
            const newScore = isManualAdjustment ? normalized : Math.max(0, normalized);
            pushScoreUpdate({ [scoreKey]: newScore });
            return {
                ...prev,
                [scoreKey]: newScore,
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
        setWeekVisibility(prev => {
            const updated = {
                ...prev,
                [weekId.toString()]: isPublic,
            };
            setDoc(doc(db, 'global_state', 'weekVisibility'), { [weekId.toString()]: isPublic }, { merge: true }).catch(console.error);
            return updated;
        });
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

            const normalizedPins = { ...(incomingPins as Record<string, string>) };
            if (!/^\d{6}$/.test(normalizedPins.admin || '')) {
                normalizedPins.admin = ADMIN_PIN;
            }

            setSelectedUserId(incomingSelectedUserId ?? null);
            setScores(incomingScores as Record<string, number>);
            setUserPins(normalizedPins);
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
                users,
                addUser,
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
