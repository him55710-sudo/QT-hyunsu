type QuestionShape = {
    options: string[];
    correctAnswer: number;
};

const MAX_CONSECUTIVE_SAME_ANSWER = 2;
const MIN_OPTION_COUNT_PER_WEEK = 2;

const validateQuestionShape = (question: QuestionShape, weekId: string, index: number) => {
    if (question.options.length !== 4) {
        throw new Error(`[week ${weekId}] ${index + 1}번 문제는 반드시 4지선다여야 합니다.`);
    }

    if (question.correctAnswer < 0 || question.correctAnswer > 3) {
        throw new Error(`[week ${weekId}] ${index + 1}번 문제 정답 인덱스가 0~3 범위를 벗어났습니다.`);
    }
};

const validateDistribution = (questions: QuestionShape[], weekId: string) => {
    const optionCounts = [0, 0, 0, 0];
    let consecutive = 1;

    questions.forEach((question, index) => {
        validateQuestionShape(question, weekId, index);
        optionCounts[question.correctAnswer] += 1;

        if (index > 0 && question.correctAnswer === questions[index - 1].correctAnswer) {
            consecutive += 1;
            if (consecutive > MAX_CONSECUTIVE_SAME_ANSWER) {
                throw new Error(`[week ${weekId}] 동일 정답 번호가 3회 이상 연속됩니다.`);
            }
        } else {
            consecutive = 1;
        }
    });

    const minCount = Math.min(...optionCounts);
    const maxCount = Math.max(...optionCounts);

    if (minCount < MIN_OPTION_COUNT_PER_WEEK) {
        throw new Error(`[week ${weekId}] 정답 분포가 치우쳤습니다. (각 번호 최소 ${MIN_OPTION_COUNT_PER_WEEK}회 필요)`);
    }

    if (maxCount - minCount > 1) {
        throw new Error(`[week ${weekId}] 정답 분포 편차가 큽니다. (${optionCounts.join(', ')})`);
    }
};

export const validateQuizData = (quizData: Record<string, QuestionShape[]>) => {
    Object.entries(quizData).forEach(([weekId, questions]) => {
        if (questions.length !== 10) {
            throw new Error(`[week ${weekId}] 문제 수는 10개여야 합니다.`);
        }
        validateDistribution(questions, weekId);
    });
};

