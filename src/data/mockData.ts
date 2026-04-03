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

export const WEEKS = [
    { id: 1, title: '1주차', description: '요한복음 1장 ~ 7장' },
    { id: 2, title: '2주차', description: '요한복음 8장 ~ 14장' },
    { id: 3, title: '3주차', description: '요한복음 15장 ~ 21장' },
    { id: 4, title: '4주차', description: '요한복음 1장 ~ 21장 (전체)' },
];

export const MOCK_SCORES = [
    { userId: 1, score: 95, weekId: 1 },
    { userId: 2, score: 90, weekId: 1 },
    { userId: 3, score: 85, weekId: 1 },
    { userId: 4, score: 80, weekId: 1 },
    { userId: 5, score: 75, weekId: 1 },
];
