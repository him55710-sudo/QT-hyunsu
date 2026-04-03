export type SummaryContextCard = {
    emoji: string;
    frontTitle: string;
    backTitle: string;
    backDesc: string;
};

export type SummaryEquation = {
    leftEmoji: string;
    leftTitle: string;
    leftDesc: string;
    rightEmoji: string;
    rightTitle: string;
    rightDesc: string;
    resultEmoji: string;
    resultTitle: string;
    resultDesc: string;
};

export type SummarySegment = {
    id: string;
    tabTitle: string;
    title: string;
    desc: string;
    pointTitle: string;
    pointDesc: string;
};

export type SummaryQna = {
    q: string;
    a: string;
    highlightText?: string;
};

export type MonthlyQtSummary = {
    id: string;
    monthLabel: string;
    heroSubtitle: string;
    heroTitleLine1: string;
    heroTitleLine2: string;
    heroTitleGradient: string;
    heroDesc: string;
    cards: SummaryContextCard[];
    coreMessageSubtitle: string;
    coreMessageTitleLine1: string;
    coreMessageTitleLine2: string;
    coreMessageDesc: string;
    equation: SummaryEquation;
    segments: SummarySegment[];
    theologyTitle: string;
    theologyDesc: string;
    qna: SummaryQna[];
};

export const QT_MONTHLY_SUMMARIES: MonthlyQtSummary[] = [
    {
        id: '2026-03',
        monthLabel: '2026년 3월 말씀',
        heroSubtitle: '디도서-히브리서-야고보서-베드로전서/후서',
        heroTitleLine1: '복음의 기초를 세우고',
        heroTitleLine2: '삶으로 증명하는 믿음',
        heroTitleGradient: 'from-blue-600 via-indigo-500 to-sky-500',
        heroDesc:
            '3월 말씀은 은혜로 시작된 구원이 실제 삶의 습관으로 이어져야 함을 꾸준히 보여 줍니다. 바른 교리와 바른 실천은 따로 가지 않고, 고난 속에서도 거룩과 분별을 지키는 제자도를 요청합니다.',
        cards: [
            {
                emoji: '📖',
                frontTitle: '복음의 토대',
                backTitle: '구원의 시작은 은혜',
                backDesc: '디도서와 히브리서는 우리의 공로가 아니라 하나님의 긍휼로 구원이 시작됨을 분명히 선언합니다.',
            },
            {
                emoji: '🧭',
                frontTitle: '흔들릴 때 붙드는 것',
                backTitle: '단번 속죄의 확신',
                backDesc: '예수님의 완전한 중보와 단번 속죄가 불안한 마음의 닻이 되어 믿음을 붙들게 합니다.',
            },
            {
                emoji: '🔥',
                frontTitle: '믿음의 열매',
                backTitle: '행함과 거룩의 실천',
                backDesc: '야고보서와 베드로서신은 말과 관계, 선택 속에서 믿음이 실제 행동으로 드러나야 함을 강조합니다.',
            },
        ],
        coreMessageSubtitle: 'CORE MESSAGE',
        coreMessageTitleLine1: '바른 진리와',
        coreMessageTitleLine2: '바른 삶은 함께 간다',
        coreMessageDesc:
            '말씀을 아는 것에서 멈추지 않고, 관계와 선택과 언어의 자리에서 복음의 방향을 드러내는 것이 3월 흐름의 핵심입니다.',
        equation: {
            leftEmoji: '🕊️',
            leftTitle: '받은 은혜',
            leftDesc: '공로 아닌 긍휼',
            rightEmoji: '🛠️',
            rightTitle: '지속적 순종',
            rightDesc: '말·관계·생활의 거룩',
            resultEmoji: '🌿',
            resultTitle: '성숙한 제자도',
            resultDesc: '믿음이 삶으로 보이는 공동체',
        },
        segments: [
            {
                id: '2026-03-w1',
                tabTitle: '1주차',
                title: '딛 3장 ~ 히 5장',
                desc: '구원은 행위의 성취가 아니라 하나님의 긍휼입니다. 히브리서는 예수님이 더 크신 대제사장으로 우리를 은혜의 보좌 앞으로 이끄심을 강조합니다.',
                pointTitle: '묵상 포인트',
                pointDesc: '나는 실패와 불안의 순간에 나 자신이 아니라, 은혜의 보좌 앞으로 담대히 나아가고 있는가?',
            },
            {
                id: '2026-03-w2',
                tabTitle: '2주차',
                title: '히 6장 ~ 히 11:19',
                desc: '새 언약은 하나님의 말씀이 마음에 새겨지는 언약입니다. 믿음은 현재의 불확실함 속에서도 약속의 신실하심을 선택하는 태도입니다.',
                pointTitle: '묵상 포인트',
                pointDesc: '내 선택을 결정하는 기준은 감정의 파도인가, 약속의 신실하심인가?',
            },
            {
                id: '2026-03-w3',
                tabTitle: '3주차',
                title: '히 11:20 ~ 약 3장',
                desc: '믿음의 사람들은 각자의 현실에서 순종으로 미래를 준비했습니다. 야고보서는 특히 말과 관계에서 드러나는 믿음의 진실성을 점검하게 합니다.',
                pointTitle: '묵상 포인트',
                pointDesc: '오늘 내가 뱉는 말은 생명을 세우는가, 상처를 남기는가?',
            },
            {
                id: '2026-03-w4',
                tabTitle: '4주차',
                title: '약 4장 ~ 벧전 5장',
                desc: '세상과 벗됨의 유혹을 경계하며 하나님께 가까이 가라는 부르심이 이어집니다. 베드로전서는 고난 속에서도 정체성을 잃지 않는 믿음을 보여 줍니다.',
                pointTitle: '묵상 포인트',
                pointDesc: '나는 압박이 올수록 누구의 사람인지 더 분명해지는가?',
            },
            {
                id: '2026-03-w5',
                tabTitle: '5주차',
                title: '벧후 1장 ~ 벧후 2장',
                desc: '베드로후서는 성숙을 향해 자라가되 거짓 가르침을 분별하라고 경고합니다. 열심보다 먼저 진리 위에 서는 것이 중요합니다.',
                pointTitle: '묵상 포인트',
                pointDesc: '내가 붙드는 확신은 진리에서 온 것인가, 분위기에서 온 것인가?',
            },
        ],
        theologyTitle: '3월 정리 질문',
        theologyDesc: '한 달 말씀을 바탕으로 바른 교리와 실천의 연결을 점검해 보세요.',
        qna: [
            {
                q: 'Q1. 3월 말씀 전체에서 반복되는 “구원의 출발점”은 무엇인가요?',
                highlightText: '우리의 행위가 아니라 하나님의 은혜',
                a: '디도서와 히브리서는 구원의 근거가 인간의 성취가 아니라 하나님의 긍휼에 있음을 계속 강조합니다.',
            },
            {
                q: 'Q2. “믿음이 있다”는 말이 실제로 검증되는 자리는 어디인가요?',
                highlightText: '관계, 언어, 선택의 일상',
                a: '야고보서가 강조하듯 믿음은 말과 행동, 공동체 안에서의 태도를 통해 드러납니다.',
            },
            {
                q: 'Q3. 흔들리는 시즌에 성도가 끝까지 지켜야 할 태도는?',
                highlightText: '분별과 인내',
                a: '베드로서신은 거짓됨을 분별하고 약속을 붙들며 끝까지 거룩을 지키는 인내를 요청합니다.',
            },
        ],
    },
    {
        id: '2026-04',
        monthLabel: '2026년 4월 말씀',
        heroSubtitle: '요한복음 1장-21장',
        heroTitleLine1: '요한복음으로 만나는',
        heroTitleLine2: '예수님의 정체성과 제자도',
        heroTitleGradient: 'from-rose-500 via-orange-400 to-sky-500',
        heroDesc:
            '4월은 요한복음 전장을 따라가며 “예수님이 누구신가”와 “우리는 어떻게 믿고 따를 것인가”를 함께 묵상합니다. 표적, 대화, 갈등, 십자가와 부활의 흐름 속에서 믿음과 불신앙의 대비가 선명하게 드러납니다.',
        cards: [
            {
                emoji: '💡',
                frontTitle: '정체성의 계시',
                backTitle: '말씀이 육신이 되신 예수',
                backDesc: '요한복음은 예수님을 단순한 스승이 아니라 생명의 근원이신 하나님 아들로 증언합니다.',
            },
            {
                emoji: '🫱',
                frontTitle: '표적의 목적',
                backTitle: '기적보다 믿음으로',
                backDesc: '표적은 감탄으로 끝나지 않고, 예수님을 신뢰하는 인격적 믿음으로 초대합니다.',
            },
            {
                emoji: '🕯️',
                frontTitle: '믿음의 분기점',
                backTitle: '빛을 따를 것인가 거부할 것인가',
                backDesc: '같은 예수님 앞에서 어떤 이는 고백하고 어떤 이는 거절합니다. 요한복음은 그 선택을 직면하게 합니다.',
            },
        ],
        coreMessageSubtitle: 'CORE MESSAGE',
        coreMessageTitleLine1: '예수님을 아는 지식은',
        coreMessageTitleLine2: '따르는 삶으로 완성된다',
        coreMessageDesc:
            '요한복음은 표적의 나열이 아니라, 예수님의 사랑 안에 거하며 끝까지 따르는 제자도의 복음을 우리에게 제시합니다.',
        equation: {
            leftEmoji: '👑',
            leftTitle: '예수님의 계시',
            leftDesc: '빛, 생명, 진리의 선포',
            rightEmoji: '🧎',
            rightTitle: '응답하는 믿음',
            rightDesc: '거함, 사랑, 순종',
            resultEmoji: '🌅',
            resultTitle: '새로운 삶',
            resultDesc: '십자가와 부활을 사는 제자',
        },
        segments: [
            {
                id: '2026-04-s1',
                tabTitle: '요 1-3',
                title: '요한복음 1-3장 | 말씀이 육신이 되어 오신 빛',
                desc: '예수님은 창조 이전부터 계신 말씀으로 소개됩니다. 니고데모와의 대화는 거듭남이 종교적 경력이 아니라 성령의 역사임을 드러냅니다.',
                pointTitle: '묵상 포인트',
                pointDesc: '나는 예수님을 정보로 아는가, 생명의 주로 영접하는가?',
            },
            {
                id: '2026-04-s2',
                tabTitle: '요 4-6',
                title: '요한복음 4-6장 | 목마른 영혼을 찾아오시는 주님',
                desc: '사마리아 여인, 왕의 신하, 오병이어 사건은 예수님이 필요 해결사를 넘어 생명의 근원이심을 보여 줍니다. 제자도는 소비가 아니라 헌신입니다.',
                pointTitle: '묵상 포인트',
                pointDesc: '내가 찾는 예수님은 문제 해결 수단인가, 삶의 주인인가?',
            },
            {
                id: '2026-04-s3',
                tabTitle: '요 7-9',
                title: '요한복음 7-9장 | 빛 앞에서 드러나는 믿음과 불신앙',
                desc: '초막절 논쟁과 맹인 치유는 같은 사건 앞에서도 전혀 다른 반응이 가능함을 보여 줍니다. 진짜 눈멂은 빛을 거부하는 마음입니다.',
                pointTitle: '묵상 포인트',
                pointDesc: '나는 체면을 지키려는가, 진리를 따르려는가?',
            },
            {
                id: '2026-04-s4',
                tabTitle: '요 10-12',
                title: '요한복음 10-12장 | 선한 목자와 생명의 주',
                desc: '선한 목자 선언과 나사로 사건은 예수님이 생명을 주관하시는 분이심을 드러냅니다. 믿음은 안전한 길보다 순종의 길을 택하는 결단입니다.',
                pointTitle: '묵상 포인트',
                pointDesc: '나는 목자의 음성을 듣고 실제로 따라가고 있는가?',
            },
            {
                id: '2026-04-s5',
                tabTitle: '요 13-15',
                title: '요한복음 13-15장 | 끝까지 사랑하시는 주님의 제자도',
                desc: '발 씻김과 새 계명, 포도나무 비유는 제자도의 본질이 섬김과 사랑, 그리고 주님 안에 거함임을 보여 줍니다.',
                pointTitle: '묵상 포인트',
                pointDesc: '내 신앙은 바쁜 활동인가, 주님 안에 거하는 관계인가?',
            },
            {
                id: '2026-04-s6',
                tabTitle: '요 16-18',
                title: '요한복음 16-18장 | 환난 속에서도 흔들리지 않는 진리',
                desc: '예수님은 환난을 예고하시지만 이미 이기신 승리와 성령의 도우심을 약속하십니다. 체포와 심문 속에서도 진리의 왕으로 서 계십니다.',
                pointTitle: '묵상 포인트',
                pointDesc: '두려움이 커질 때, 나는 상황보다 약속을 크게 보고 있는가?',
            },
            {
                id: '2026-04-s7',
                tabTitle: '요 19-21',
                title: '요한복음 19-21장 | 십자가, 부활, 다시 맡기시는 사명',
                desc: '십자가는 사랑의 완성이고, 부활은 무너진 제자를 다시 세우는 시작입니다. 예수님은 사랑의 고백을 사명으로 연결하십니다.',
                pointTitle: '묵상 포인트',
                pointDesc: '주님께 받은 사랑이 오늘 내 책임과 섬김으로 이어지고 있는가?',
            },
        ],
        theologyTitle: '4월 정리 질문',
        theologyDesc: '요한복음의 핵심 메시지를 내 삶의 선택으로 연결해 보세요.',
        qna: [
            {
                q: 'Q1. 요한복음의 표적은 왜 중요한가요?',
                highlightText: '표적은 예수님의 정체성을 가리키는 표지',
                a: '표적 자체가 목적이 아니라, 예수님이 누구신지 깨닫고 믿음으로 나아가도록 이끄는 통로이기 때문입니다.',
            },
            {
                q: 'Q2. 요한복음이 말하는 제자도의 핵심은 무엇인가요?',
                highlightText: '주님 안에 거함',
                a: '순간적 열심보다 말씀 안에 머물며 사랑으로 순종하는 지속성이 제자도의 핵심입니다.',
            },
            {
                q: 'Q3. 십자가와 부활은 오늘의 삶에 어떤 의미가 있나요?',
                highlightText: '실패 이후에도 다시 시작할 수 있는 근거',
                a: '요한복음은 실패를 끝으로 두지 않고, 부활의 주님이 다시 맡기시는 사명으로 우리를 초대합니다.',
            },
        ],
    },
];
