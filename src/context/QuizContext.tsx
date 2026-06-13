import React, { createContext, useContext, useEffect, useState } from 'react';
import { doc, setDoc, onSnapshot, deleteField, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { ADMIN_PIN, MOCK_SCORES, MOCK_USERS, WEEKS } from '../data/mockData';
import { normalizeDateKey, parseProofTimestamp, toKstDateKey } from '../utils/dateKst';

export interface User {
    id: number;
    name: string;
    pin?: string;
}

type UserDocEntry = User & {
    deleted?: boolean;
    deletedAt?: string;
};

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
    submittedAtMs?: number;
    submittedDateKey: string;
    imageFingerprint: string;
    imageDataUrl?: string;
    bestQuestionsLength: number;
    oneVerseLength: number;
    thankOfferingsLength: number;
    points: number;
}

export interface WrongAnswerEntry {
    questionIndex: number;
    submittedDateKey: string;
}

export interface DailyQtActivity {
    dateKey: string;
    attended: boolean;
    qtVerified: boolean;
    qtPhotoUrls: string[];
    proofs: PhotoProofSubmission[];
    timezone: 'Asia/Seoul';
}

type FirestoreDocSnapshot = {
    exists: () => boolean;
    data: () => Record<string, unknown>;
};

type QuizBackupPayload = {
    version: number;
    exportedAt: string;
    data: {
        selectedUserId: number | null;
        scores: Record<string, number>;
        userPins: Record<string, string>;
        wrongAnswers: Record<string, WrongAnswerEntry[]>;
        purchasedCoupons: Record<string, PurchasedCoupon[]>;
        photoProofs: Record<string, PhotoProofSubmission[]>;
        weekVisibility: Record<string, boolean>;
    };
};

type QuizContextType = {
    users: User[];
    addUser: (name: string, pin: string) => void;
    deleteUser: (userId: number) => { ok: true } | { ok: false; message: string };
    selectedUserId: number | null;
    setSelectedUserId: (id: number | null) => void;
    scores: Record<string, number>;
    saveScore: (userId: number, weekId: number, score: number) => void;
    markAttendance: (userId: number) => boolean;
    userPins: Record<string, string>;
    updatePin: (targetId: number | 'admin', newPin: string) => void;
    wrongAnswers: Record<string, WrongAnswerEntry[]>;
    addWrongAnswer: (userId: number, questionIndex: number, submittedDateKey?: string) => void;
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
    getUserDailyActivity: (userId: number) => Record<string, DailyQtActivity>;
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
const LEGACY_SCORE_STORAGE_KEYS = ['qt_quiz_scores_v2', 'qt_quiz_scores_v1', 'qt_quiz_scores'];
const DELETED_USERS_STORAGE_KEY = 'qt_quiz_deleted_users_v1';
const PIN_STORAGE_KEY = 'qt_quiz_pins';
const WRONG_ANSWER_STORAGE_KEY = 'qt_quiz_wrong_answers_v2';
const COUPON_STORAGE_KEY = 'qt_quiz_coupons_v2';
const PHOTO_PROOF_STORAGE_KEY = 'qt_quiz_photo_proofs_v1';
const PHOTO_PROOF_MIN_CHARS = 15;
const WEEK_VISIBILITY_STORAGE_KEY = 'qt_quiz_week_visibility_v1';
const BACKUP_VERSION = 1;
const defaultWeekVisibility: Record<string, boolean> = WEEKS.reduce((acc, week) => {
    acc[week.id.toString()] = false;
    return acc;
}, {} as Record<string, boolean>);

const PROTECTED_USER_ID_MIN = 900;

const parseDeletedUserIds = (raw: unknown) => {
    if (!Array.isArray(raw)) return [] as number[];
    return raw
        .map((value) => Number(value))
        .filter((value, index, self) => Number.isFinite(value) && value > 0 && self.indexOf(value) === index);
};

const normalizeWrongAnswerEntry = (raw: unknown): WrongAnswerEntry | null => {
    if (typeof raw === 'number') {
        const questionIndex = Math.floor(raw);
        if (!Number.isFinite(questionIndex) || questionIndex < 0) return null;
        return {
            questionIndex,
            submittedDateKey: '',
        };
    }

    if (!raw || typeof raw !== 'object') return null;

    const source = raw as {
        questionIndex?: unknown;
        submittedDateKey?: unknown;
        dateKey?: unknown;
    };

    const questionIndex = Math.floor(Number(source.questionIndex));
    if (!Number.isFinite(questionIndex) || questionIndex < 0) return null;

    const rawDate =
        typeof source.submittedDateKey === 'string'
            ? source.submittedDateKey
            : typeof source.dateKey === 'string'
                ? source.dateKey
                : '';

    return {
        questionIndex,
        submittedDateKey: normalizeDateKey(rawDate) || '',
    };
};

const mergeWrongAnswerLists = (...sources: WrongAnswerEntry[][]) => {
    const merged = new Map<number, WrongAnswerEntry>();

    sources.forEach((list) => {
        list.forEach((entry) => {
            const prev = merged.get(entry.questionIndex);
            if (!prev) {
                merged.set(entry.questionIndex, entry);
                return;
            }

            const prevDate = normalizeDateKey(prev.submittedDateKey || '') || '';
            const nextDate = normalizeDateKey(entry.submittedDateKey || '') || '';
            if (nextDate && (!prevDate || nextDate > prevDate)) {
                merged.set(entry.questionIndex, entry);
            }
        });
    });

    return Array.from(merged.values()).sort((a, b) => a.questionIndex - b.questionIndex);
};

const parseWrongAnswerRecord = (raw: unknown) => {
    if (!raw || typeof raw !== 'object') return {} as Record<string, WrongAnswerEntry[]>;

    const parsed: Record<string, WrongAnswerEntry[]> = {};
    Object.entries(raw as Record<string, unknown>).forEach(([userKey, value]) => {
        if (!/^\d+$/.test(userKey) || !Array.isArray(value)) return;

        const normalizedList = value
            .map(normalizeWrongAnswerEntry)
            .filter((entry): entry is WrongAnswerEntry => Boolean(entry));
        if (normalizedList.length === 0) return;

        parsed[userKey] = mergeWrongAnswerLists(normalizedList);
    });

    return parsed;
};

const mergeWrongAnswerRecords = (...sources: Record<string, WrongAnswerEntry[]>[]) => {
    const merged: Record<string, WrongAnswerEntry[]> = {};

    sources.forEach((source) => {
        Object.entries(source).forEach(([userKey, list]) => {
            if (!Array.isArray(list)) return;
            merged[userKey] = mergeWrongAnswerLists(merged[userKey] || [], list);
        });
    });

    return merged;
};

const parseScoreRecord = (raw: unknown) => {
    if (!raw || typeof raw !== 'object') return {} as Record<string, number>;

    const parsed: Record<string, number> = {};
    Object.entries(raw as Record<string, unknown>).forEach(([key, value]) => {
        const numeric = Number(value);
        if (!Number.isFinite(numeric)) return;
        if (!/^(\d+)_/.test(key)) return;
        parsed[key] = numeric;
    });

    // Legacy nested format fallback: { "1": { "1": 90, "2": 80 } }
    Object.entries(raw as Record<string, unknown>).forEach(([userKey, nested]) => {
        if (!/^\d+$/.test(userKey) || !nested || typeof nested !== 'object') return;

        Object.entries(nested as Record<string, unknown>).forEach(([weekKey, nestedValue]) => {
            if (!/^\d+$/.test(weekKey)) return;
            const numeric = Number(nestedValue);
            if (!Number.isFinite(numeric)) return;

            const key = `${userKey}_${weekKey}`;
            parsed[key] = Math.max(parsed[key] ?? Number.NEGATIVE_INFINITY, numeric);
        });
    });

    return parsed;
};

const mergeScoresByMax = (...sources: Record<string, number>[]) => {
    const merged: Record<string, number> = {};
    sources.forEach((source) => {
        Object.entries(source).forEach(([key, value]) => {
            const prev = merged[key] ?? Number.NEGATIVE_INFINITY;
            merged[key] = Math.max(prev, value);
        });
    });
    return merged;
};

const buildDefaultScoreRecord = () => {
    return MOCK_SCORES.reduce<Record<string, number>>((acc, row) => {
        const key = `${row.userId}_${row.weekId}`;
        const prev = acc[key] ?? Number.NEGATIVE_INFINITY;
        acc[key] = Math.max(prev, Number(row.score) || 0);
        return acc;
    }, {});
};

const recoverScoresFromLocalStorage = () => {
    const sourceList: Record<string, number>[] = [];
    const baselineScores = buildDefaultScoreRecord();

    try {
        const direct = localStorage.getItem(SCORE_STORAGE_KEY);
        if (direct) sourceList.push(parseScoreRecord(JSON.parse(direct)));
    } catch {
        // ignore
    }

    LEGACY_SCORE_STORAGE_KEYS.forEach((key) => {
        try {
            const raw = localStorage.getItem(key);
            if (raw) sourceList.push(parseScoreRecord(JSON.parse(raw)));
        } catch {
            // ignore legacy parse errors
        }
    });

    // Backup JSON fallback: if a backup payload exists in localStorage, recover from data.scores.
    for (let i = 0; i < localStorage.length; i += 1) {
        const key = localStorage.key(i);
        if (!key || !key.toLowerCase().includes('backup')) continue;

        try {
            const payload = JSON.parse(localStorage.getItem(key) || 'null') as { data?: { scores?: unknown } } | null;
            if (payload?.data?.scores) {
                sourceList.push(parseScoreRecord(payload.data.scores));
            }
        } catch {
            // ignore invalid backups
        }
    }

    if (sourceList.length === 0) return baselineScores;
    return mergeScoresByMax(baselineScores, ...sourceList);
};

export function QuizProvider({ children }: { children: React.ReactNode }) {
    const [users, setUsers] = useState<User[]>(() => {
        try {
            const savedDeleted = localStorage.getItem(DELETED_USERS_STORAGE_KEY);
            const deletedIds = savedDeleted ? parseDeletedUserIds(JSON.parse(savedDeleted)) : [];
            return MOCK_USERS.filter((user) => !deletedIds.includes(user.id));
        } catch {
            return MOCK_USERS;
        }
    });

    const [selectedUserId, setSelectedUserId] = useState<number | null>(() => {
        const saved = localStorage.getItem('qt_quiz_user_v2');
        if (!saved) return null;
        const parsedId = parseInt(saved, 10);
        // 초기화 시점에 삭제된 사용자인지 확인
        const savedDeleted = localStorage.getItem(DELETED_USERS_STORAGE_KEY);
        try {
            const deletedIds = savedDeleted ? parseDeletedUserIds(JSON.parse(savedDeleted)) : [];
            if (deletedIds.includes(parsedId)) return null;
        } catch { /* ignore */ }
        return parsedId;
    });

    const [deletedUserIds, setDeletedUserIds] = useState<number[]>(() => {
        try {
            const saved = localStorage.getItem(DELETED_USERS_STORAGE_KEY);
            if (!saved) return [];
            return parseDeletedUserIds(JSON.parse(saved));
        } catch (e) {
            console.error('Failed to parse deleted users', e);
            return [];
        }
    });
    const deletedUserIdsRef = React.useRef<number[]>(deletedUserIds);

    const [scores, setScores] = useState<Record<string, number>>(() => {
        return recoverScoresFromLocalStorage();
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

    const [wrongAnswers, setWrongAnswers] = useState<Record<string, WrongAnswerEntry[]>>(() => {
        try {
            const saved = localStorage.getItem(WRONG_ANSWER_STORAGE_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                if (typeof parsed === 'object' && parsed !== null) {
                    return parseWrongAnswerRecord(parsed);
                }
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

    useEffect(() => {
        deletedUserIdsRef.current = deletedUserIds;
        localStorage.setItem(DELETED_USERS_STORAGE_KEY, JSON.stringify(deletedUserIds));
    }, [deletedUserIds]);

    useEffect(() => {
        if (selectedUserId !== null && users.length > 0) {
            const userExists = users.some(u => u.id === selectedUserId);
            if (!userExists) {
                console.log(`User ${selectedUserId} no longer exists, logging out.`);
                setSelectedUserId(null);
            }
        }
    }, [users, selectedUserId]);

    useEffect(() => {
        setUsers((prev) => prev.filter((user) => !deletedUserIds.includes(user.id)));
    }, [deletedUserIds]);

    // Firebase Sync for Scores
    const pushScoreUpdate = async (updateObj: Record<string, number | null>) => {
        try {
            const safeObj: Record<string, unknown> = { ...updateObj };
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
                [newUser.id]: {
                    ...newUser,
                    deleted: false,
                },
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
                let currentWrongAnswers = mergeWrongAnswerRecords(wrongAnswers);
                const wrongAnswersSnap = await getDoc(doc(db, 'global_state', 'wrongAnswers'));
                if (wrongAnswersSnap.exists()) {
                    currentWrongAnswers = mergeWrongAnswerRecords(
                        currentWrongAnswers,
                        parseWrongAnswerRecord(wrongAnswersSnap.data())
                    );
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
            const uUnsub = onSnapshot(doc(db, 'global_state', 'users'), (snapshot: FirestoreDocSnapshot) => {
                if (snapshot.exists()) {
                    const data = snapshot.data();
                    const cmap = new Map<number, User>();
                    
                    // 기본 사용자 목록 추가 (이미 삭제된 ID는 제외)
                    MOCK_USERS.forEach((u) => {
                        if (!deletedUserIdsRef.current.includes(u.id)) {
                            cmap.set(u.id, u);
                        }
                    });

                    Object.values(data).forEach((raw) => {
                        if (!raw || typeof raw !== 'object') return;

                        const entry = raw as UserDocEntry;
                        if (!Number.isFinite(entry.id)) return;

                        if (entry.deleted) {
                            cmap.delete(entry.id);
                            // 다른 기기에서 삭제된 경우에도 로컬 삭제 목록 동기화
                            setDeletedUserIds((prev) => {
                                if (prev.includes(entry.id)) return prev;
                                return [...prev, entry.id];
                            });
                            return;
                        }

                        const existing = cmap.get(entry.id);
                        cmap.set(entry.id, {
                            id: entry.id,
                            name: entry.name || existing?.name || `사용자 ${entry.id}`,
                            pin: entry.pin || existing?.pin,
                        });
                    });

                    // 로컬 삭제 목록 최후 필터링
                    deletedUserIdsRef.current.forEach((deletedId) => {
                        cmap.delete(deletedId);
                    });

                    setUsers(Array.from(cmap.values()).sort((a, b) => a.id - b.id));
                } else {
                    setUsers(MOCK_USERS.filter((user) => !deletedUserIdsRef.current.includes(user.id)));
                }
            });

            const sUnsub = onSnapshot(doc(db, 'global_state', 'scores'), (snapshot: FirestoreDocSnapshot) => {
                if (snapshot.exists()) {
                    setScores((prev) => ({ ...prev, ...(snapshot.data() as Record<string, number>) }));
                }
            });

            const pUnsub = onSnapshot(doc(db, 'global_state', 'userPins'), (snapshot: FirestoreDocSnapshot) => {
                if (snapshot.exists()) {
                    setUserPins((prev) => ({ ...prev, ...(snapshot.data() as Record<string, string>) }));
                }
            });

            const wUnsub = onSnapshot(doc(db, 'global_state', 'wrongAnswers'), (snapshot: FirestoreDocSnapshot) => {
                if (snapshot.exists()) {
                    setWrongAnswers((prev) => mergeWrongAnswerRecords(prev, parseWrongAnswerRecord(snapshot.data())));
                }
            });

            const cUnsub = onSnapshot(doc(db, 'global_state', 'purchasedCoupons'), (snapshot: FirestoreDocSnapshot) => {
                if (snapshot.exists()) {
                    setPurchasedCoupons((prev) => ({ ...prev, ...(snapshot.data() as Record<string, PurchasedCoupon[]>) }));
                }
            });

            const ppUnsub = onSnapshot(doc(db, 'global_state', 'photoProofs'), (snapshot: FirestoreDocSnapshot) => {
                if (snapshot.exists()) {
                    setPhotoProofs((prev) => ({ ...prev, ...(snapshot.data() as Record<string, PhotoProofSubmission[]>) }));
                }
            });

            const wvUnsub = onSnapshot(doc(db, 'global_state', 'weekVisibility'), (snapshot: FirestoreDocSnapshot) => {
                if (snapshot.exists()) {
                    setWeekVisibility((prev) => ({ ...prev, ...(snapshot.data() as Record<string, boolean>) }));
                }
            });

            // Initial scores merge without overwriting firebase completely, just pushing local ones
            try {
                const currentScores = recoverScoresFromLocalStorage();
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
        const currentIds = [...users.map((u) => u.id), ...deletedUserIds].filter((id) => id < PROTECTED_USER_ID_MIN);
        const nextId = currentIds.length > 0 ? Math.max(...currentIds) + 1 : 1;
        const newUser: User = { id: nextId, name, pin };
        setDeletedUserIds((prev) => prev.filter((id) => id !== nextId));
        pushUserUpdate(newUser);
        updatePin(nextId, pin);
    };

    const deleteUser = (userId: number) => {
        if (!Number.isFinite(userId) || userId >= PROTECTED_USER_ID_MIN) {
            return { ok: false as const, message: '보호된 계정은 삭제할 수 없습니다.' };
        }

        const userKey = userId.toString();

        setUsers((prev) => prev.filter((user) => user.id !== userId));

        if (selectedUserId === userId) {
            setSelectedUserId(null);
        }

        setDeletedUserIds((prev) => {
            if (prev.includes(userId)) return prev;
            return [...prev, userId];
        });

        setScores((prev) => {
            const next = { ...prev };
            const scoreDeletePatch: Record<string, number | null> = {};

            Object.keys(prev).forEach((scoreKey) => {
                if (!scoreKey.startsWith(`${userId}_`)) return;
                delete next[scoreKey];
                scoreDeletePatch[scoreKey] = null;
            });

            if (Object.keys(scoreDeletePatch).length > 0) {
                pushScoreUpdate(scoreDeletePatch);
            }

            return next;
        });

        setUserPins((prev) => {
            if (!(userKey in prev)) return prev;
            const next = { ...prev };
            delete next[userKey];
            return next;
        });

        setWrongAnswers((prev) => {
            if (!(userKey in prev)) return prev;
            const next = { ...prev };
            delete next[userKey];
            return next;
        });

        setPurchasedCoupons((prev) => {
            if (!(userKey in prev)) return prev;
            const next = { ...prev };
            delete next[userKey];
            return next;
        });

        setPhotoProofs((prev) => {
            if (!(userKey in prev)) return prev;
            const next = { ...prev };
            delete next[userKey];
            return next;
        });

        setDoc(doc(db, 'global_state', 'users'), {
            [userId]: {
                id: userId,
                deleted: true,
                deletedAt: new Date().toISOString(),
            },
        }, { merge: true }).catch((e: unknown) => {
            console.error('Failed to mark user deleted', e);
        });

        setDoc(doc(db, 'global_state', 'userPins'), { [userKey]: deleteField() }, { merge: true }).catch((e: unknown) => {
            console.error('Failed to delete user pin', e);
        });
        setDoc(doc(db, 'global_state', 'wrongAnswers'), { [userKey]: deleteField() }, { merge: true }).catch((e: unknown) => {
            console.error('Failed to delete user wrong answers', e);
        });
        setDoc(doc(db, 'global_state', 'purchasedCoupons'), { [userKey]: deleteField() }, { merge: true }).catch((e: unknown) => {
            console.error('Failed to delete user coupons', e);
        });
        setDoc(doc(db, 'global_state', 'photoProofs'), { [userKey]: deleteField() }, { merge: true }).catch((e: unknown) => {
            console.error('Failed to delete user photo proofs', e);
        });

        return { ok: true as const };
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
        const todayKey = toKstDateKey();
        const attendanceKey = `${userId}_attendance_${todayKey}`;

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

    const addWrongAnswer = (userId: number, questionIndex: number, submittedDateKey: string = toKstDateKey()) => {
        const normalizedQuestionIndex = Math.floor(questionIndex);
        if (!Number.isFinite(normalizedQuestionIndex) || normalizedQuestionIndex < 0) return;
        const normalizedSubmittedDateKey = normalizeDateKey(submittedDateKey) || toKstDateKey();

        setWrongAnswers(prev => {
            const userKey = userId.toString();
            const prevAnswers = prev[userKey] || [];
            if (prevAnswers.some((answer) => answer.questionIndex === normalizedQuestionIndex)) return prev;

            const nextAnswer: WrongAnswerEntry = {
                questionIndex: normalizedQuestionIndex,
                submittedDateKey: normalizedSubmittedDateKey,
            };
            const updatedUserAnswers = [...prevAnswers, nextAnswer].sort((a, b) => a.questionIndex - b.questionIndex);
            const updated = {
                ...prev,
                [userKey]: updatedUserAnswers,
            };
            setDoc(doc(db, 'global_state', 'wrongAnswers'), { [userKey]: updatedUserAnswers }, { merge: true }).catch(console.error);
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
        const todayKey = toKstDateKey();
        const userProofs = photoProofs[userId.toString()] || [];

        if (userProofs.some((proof) => proof.submittedDateKey === todayKey)) {
            return { ok: false as const, message: '?섎（??1踰덈쭔 ?ъ쭊 ?몄쬆??媛?ν빀?덈떎.' };
        }

        if (userProofs.some((proof) => proof.imageFingerprint === payload.imageFingerprint)) {
            return { ok: false as const, message: '?댁쟾???듦낵???ъ쭊怨??숈씪???대?吏?낅땲?? ???ъ쭊?쇰줈 ?몄쬆?댁＜?몄슂.' };
        }

        if (
            payload.bestQuestionsLength < PHOTO_PROOF_MIN_CHARS ||
            payload.oneVerseLength < PHOTO_PROOF_MIN_CHARS ||
            payload.thankOfferingsLength < PHOTO_PROOF_MIN_CHARS
        ) {
            return { ok: false as const, message: `?먮룆 湲곗? 誘몃떖: 媛???ぉ 理쒖냼 ${PHOTO_PROOF_MIN_CHARS}???꾩슂` };
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
            submittedAt: new Date().toISOString(),
            submittedAtMs: Date.now(),
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

    const getUserDailyActivity = React.useCallback((userId: number) => {
        const records: Record<string, DailyQtActivity> = {};
        const attendancePrefix = `${userId}_attendance_`;

        Object.entries(scores).forEach(([key, value]) => {
            if (!key.startsWith(attendancePrefix) || value <= 0) return;

            const dateKey = normalizeDateKey(key.slice(attendancePrefix.length));
            if (!dateKey) return;

            if (!records[dateKey]) {
                records[dateKey] = {
                    dateKey,
                    attended: false,
                    qtVerified: false,
                    qtPhotoUrls: [],
                    proofs: [],
                    timezone: 'Asia/Seoul',
                };
            }

            records[dateKey].attended = true;
        });

        const userProofs = photoProofs[userId.toString()] || [];
        userProofs.forEach((proof) => {
            const dateKey = normalizeDateKey(proof.submittedDateKey) || normalizeDateKey(proof.submittedAt);
            if (!dateKey) return;

            if (!records[dateKey]) {
                records[dateKey] = {
                    dateKey,
                    attended: false,
                    qtVerified: false,
                    qtPhotoUrls: [],
                    proofs: [],
                    timezone: 'Asia/Seoul',
                };
            }

            records[dateKey].qtVerified = true;
            records[dateKey].proofs.push(proof);

            if (proof.imageDataUrl) {
                records[dateKey].qtPhotoUrls.push(proof.imageDataUrl);
            }
        });

        Object.values(records).forEach((record) => {
            const deduped = Array.from(new Set(record.qtPhotoUrls));
            record.qtPhotoUrls = deduped;
            record.proofs.sort((a, b) => parseProofTimestamp(b.submittedAt, b.submittedAtMs, b.submittedDateKey) - parseProofTimestamp(a.submittedAt, a.submittedAtMs, a.submittedDateKey));
        });

        return records;
    }, [photoProofs, scores]);

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
                return { ok: false as const, message: '諛깆뾽 ?뚯씪 ?뺤떇???щ컮瑜댁? ?딆뒿?덈떎.' };
            }
            if (!parsed.data || typeof parsed.data !== 'object') {
                return { ok: false as const, message: '諛깆뾽 ?곗씠?곌? ?놁뒿?덈떎.' };
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
                return { ok: false as const, message: '諛깆뾽 ?곗씠??寃利앹뿉 ?ㅽ뙣?덉뒿?덈떎.' };
            }

            const normalizedPins = { ...(incomingPins as Record<string, string>) };
            if (!/^\d{6}$/.test(normalizedPins.admin || '')) {
                normalizedPins.admin = ADMIN_PIN;
            }

            setSelectedUserId(incomingSelectedUserId ?? null);
            setScores(incomingScores as Record<string, number>);
            setUserPins(normalizedPins);
            setWrongAnswers(parseWrongAnswerRecord(incomingWrongAnswers));
            setPurchasedCoupons(incomingCoupons as Record<string, PurchasedCoupon[]>);
            setPhotoProofs(incomingPhotoProofs as Record<string, PhotoProofSubmission[]>);
            setWeekVisibility({
                ...defaultWeekVisibility,
                ...(incomingWeekVisibility as Record<string, boolean>),
            });
            setDeletedUserIds([]);

            return { ok: true as const };
        } catch {
            return { ok: false as const, message: '諛깆뾽 ?뚯씪???쎈뒗 以??ㅻ쪟媛 諛쒖깮?덉뒿?덈떎.' };
        }
    };

    return (
        <QuizContext.Provider
            value={{
                users,
                addUser,
                deleteUser,
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
                getUserDailyActivity,
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

