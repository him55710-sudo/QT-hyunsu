export const MOCK_USERS = [
    { id: 1, name: '천예지', pin: '1234' },
    { id: 2, name: '임가온', pin: '1234' },
    { id: 3, name: '신은찬', pin: '1234' },
    { id: 4, name: '박대니', pin: '1234' },
    { id: 5, name: '장연서', pin: '1234' },
    { id: 6, name: '석연준', pin: '1234' },
    { id: 7, name: '서은율', pin: '1234' },
    { id: 8, name: '이주아', pin: '1234' },
    { id: 999, name: '임현수', pin: '0000' },
];

export const TEACHER_ACCOUNT = {
    id: 'teacher_admin',
    name: '임현수 선생님',
    pin: '000000',
};

export const ADMIN_PIN = TEACHER_ACCOUNT.pin;

export const QUIZ_MONTHS = [
    { id: '2026-03', label: '2026년 3월', title: '디도서-히브리서-야고보서-베드로서신' },
    { id: '2026-04', label: '2026년 4월', title: '요한복음' },
    { id: '2026-05', label: '2026년 5월', title: '민수기' },
    { id: '2026-06', label: '2026년 6월', title: '신명기' },
] as const;

export const WEEKS = [
    { id: 13, monthId: '2026-03', monthLabel: '2026년 3월', title: '1주차', description: '딛 3장 ~ 히 5장', availableFrom: '2026-03-01' },
    { id: 14, monthId: '2026-03', monthLabel: '2026년 3월', title: '2주차', description: '히 6장 ~ 히 11:19', availableFrom: '2026-03-08' },
    { id: 15, monthId: '2026-03', monthLabel: '2026년 3월', title: '3주차', description: '히 11:20 ~ 약 3장', availableFrom: '2026-03-15' },
    { id: 16, monthId: '2026-03', monthLabel: '2026년 3월', title: '4주차', description: '약 4장 ~ 벧전 5장', availableFrom: '2026-03-22' },
    { id: 17, monthId: '2026-03', monthLabel: '2026년 3월', title: '5주차', description: '벧후 1장 ~ 벧후 2장', availableFrom: '2026-03-29' },
    { id: 1, monthId: '2026-04', monthLabel: '2026년 4월', title: '1주차', description: '요한복음 1장 ~ 7장', availableFrom: '2026-04-01' },
    { id: 2, monthId: '2026-04', monthLabel: '2026년 4월', title: '2주차', description: '요한복음 8장 ~ 14장', availableFrom: '2026-04-08' },
    { id: 3, monthId: '2026-04', monthLabel: '2026년 4월', title: '3주차', description: '요한복음 15장 ~ 21장', availableFrom: '2026-04-15' },
    { id: 4, monthId: '2026-04', monthLabel: '2026년 4월', title: '4주차', description: '요한복음 1장 ~ 21장 (전체)', availableFrom: '2026-04-22' },
    { id: 5, monthId: '2026-05', monthLabel: '2026년 5월', title: '1주차', description: '민수기 1장 ~ 10장', availableFrom: '2026-05-01' },
    { id: 6, monthId: '2026-05', monthLabel: '2026년 5월', title: '2주차', description: '민수기 11장 ~ 20장', availableFrom: '2026-05-08' },
    { id: 7, monthId: '2026-05', monthLabel: '2026년 5월', title: '3주차', description: '민수기 21장 ~ 30장', availableFrom: '2026-05-15' },
    { id: 8, monthId: '2026-05', monthLabel: '2026년 5월', title: '4주차', description: '민수기 31장 ~ 36장', availableFrom: '2026-05-22' },
    { id: 9, monthId: '2026-06', monthLabel: '2026년 6월', title: '1주차', description: '신명기 1장 ~ 8장', availableFrom: '2026-06-01' },
    { id: 10, monthId: '2026-06', monthLabel: '2026년 6월', title: '2주차', description: '신명기 9장 ~ 18장', availableFrom: '2026-06-08' },
    { id: 11, monthId: '2026-06', monthLabel: '2026년 6월', title: '3주차', description: '신명기 19장 ~ 28장', availableFrom: '2026-06-15' },
    { id: 12, monthId: '2026-06', monthLabel: '2026년 6월', title: '4주차', description: '신명기 29장 ~ 34장', availableFrom: '2026-06-22' },
];

export const MOCK_SCORES = [
    { userId: 1, score: 95, weekId: 1 },
    { userId: 2, score: 90, weekId: 1 },
    { userId: 3, score: 85, weekId: 1 },
    { userId: 4, score: 80, weekId: 1 },
    { userId: 5, score: 75, weekId: 1 },
];
