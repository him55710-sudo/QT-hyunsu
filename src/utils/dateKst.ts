export const KST_TIMEZONE = 'Asia/Seoul';

const KST_OFFSET_MINUTES = 9 * 60;
const MS_PER_MINUTE = 60 * 1000;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

const toKstPseudoUtcDate = (date: Date) => {
    const offsetToKst = KST_OFFSET_MINUTES + date.getTimezoneOffset();
    return new Date(date.getTime() + offsetToKst * MS_PER_MINUTE);
};

export const toKstDateKey = (date: Date = new Date()) => {
    const kst = toKstPseudoUtcDate(date);
    const year = kst.getUTCFullYear();
    const month = `${kst.getUTCMonth() + 1}`.padStart(2, '0');
    const day = `${kst.getUTCDate()}`.padStart(2, '0');
    return `${year}-${month}-${day}`;
};

export const parseDateKey = (dateKey: string) => {
    const match = dateKey.match(/(\d{4})-(\d{2})-(\d{2})/);
    if (!match) return null;

    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);

    if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null;
    if (month < 1 || month > 12 || day < 1 || day > 31) return null;

    return { year, month, day };
};

export const normalizeDateKey = (value: string) => {
    const direct = parseDateKey(value);
    if (direct) return `${direct.year}-${`${direct.month}`.padStart(2, '0')}-${`${direct.day}`.padStart(2, '0')}`;

    const fallback = value.match(/(\d{4})[^\d]?(\d{2})[^\d]?(\d{2})/);
    if (!fallback) return null;

    const year = Number(fallback[1]);
    const month = Number(fallback[2]);
    const day = Number(fallback[3]);
    if (month < 1 || month > 12 || day < 1 || day > 31) return null;

    return `${year}-${`${month}`.padStart(2, '0')}-${`${day}`.padStart(2, '0')}`;
};

export const dateKeyToDayNumber = (dateKey: string) => {
    const parsed = parseDateKey(dateKey);
    if (!parsed) return null;

    return Math.floor(Date.UTC(parsed.year, parsed.month - 1, parsed.day) / MS_PER_DAY);
};

export const addDaysToDateKey = (dateKey: string, days: number) => {
    const dayNumber = dateKeyToDayNumber(dateKey);
    if (dayNumber === null) return null;

    const next = new Date((dayNumber + days) * MS_PER_DAY);
    const year = next.getUTCFullYear();
    const month = `${next.getUTCMonth() + 1}`.padStart(2, '0');
    const day = `${next.getUTCDate()}`.padStart(2, '0');

    return `${year}-${month}-${day}`;
};

export const formatDateKey = (dateKey: string, options?: Intl.DateTimeFormatOptions) => {
    const parsed = parseDateKey(dateKey);
    if (!parsed) return dateKey;

    const dt = new Date(Date.UTC(parsed.year, parsed.month - 1, parsed.day));
    return new Intl.DateTimeFormat('ko-KR', {
        timeZone: KST_TIMEZONE,
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        weekday: 'short',
        ...options,
    }).format(dt);
};

export const parseProofTimestamp = (submittedAt?: string, submittedAtMs?: number, submittedDateKey?: string) => {
    if (typeof submittedAtMs === 'number' && Number.isFinite(submittedAtMs)) {
        return submittedAtMs;
    }

    if (submittedAt) {
        const parsed = Date.parse(submittedAt);
        if (Number.isFinite(parsed)) return parsed;
    }

    if (submittedDateKey) {
        const parsedDate = parseDateKey(submittedDateKey);
        if (parsedDate) {
            return Date.UTC(parsedDate.year, parsedDate.month - 1, parsedDate.day, 3, 0, 0);
        }
    }

    return 0;
};

