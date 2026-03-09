const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/context/QuizContext.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Add Firebase imports
if (!content.includes('import { db }')) {
    content = content.replace(
        `import React, { createContext, useContext, useEffect, useState } from 'react';`,
        `import React, { createContext, useContext, useEffect, useState } from 'react';\nimport { doc, setDoc, onSnapshot, updateDoc, deleteField } from 'firebase/firestore';\nimport { db } from '../firebase';`
    );
}

// 2. Add Firebase synchronization for scores
if (!content.includes('pushScoreUpdate')) {
    const pushScoreUpdateLogic = `
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

    useEffect(() => {
        const unsub = onSnapshot(doc(db, 'global_state', 'scores'), (snapshot) => {
            if (snapshot.exists()) {
                setScores(prev => ({ ...prev, ...snapshot.data() }));
            }
        });
        return () => unsub();
    }, []);
`;
    // Insert after "const [weekVisibility, setWeekVisibility] = useState<..." hook completes
    content = content.replace(
        /return defaultWeekVisibility;\n    \}\);\n/g,
        `return defaultWeekVisibility;\n    });\n\n${pushScoreUpdateLogic}\n`
    );
}

// 3. Update saveScore
content = content.replace(
    /const saveScore = \(userId: number, weekId: number, score: number\) => \{\n        setScores\(prev => \(\{\n            \.\.\.prev,\n            \[\`\$\{userId\}_\$\{weekId\}\`]: Math.max\(prev\[\`\$\{userId\}_\$\{weekId\}\`] || 0, score\),\n        \}\)\);\n    \};/g,
    `const saveScore = (userId: number, weekId: number, score: number) => {
        setScores(prev => {
            const key = \`\${userId}_\${weekId}\`;
            const newScore = Math.max(prev[key] || 0, score);
            pushScoreUpdate({ [key]: newScore });
            return {
                ...prev,
                [key]: newScore,
            };
        });
    };`
);

// 4. Update markAttendance
content = content.replace(
    /setScores\(prev => {\n            if \(prev\[attendanceKey]\) return prev;\n\n            isNewlyMarked = true;\n            return {\n                \.\.\.prev,\n                \[attendanceKey]: 10,\n            };\n        }\);/g,
    `setScores(prev => {
            if (prev[attendanceKey]) return prev;

            isNewlyMarked = true;
            pushScoreUpdate({ [attendanceKey]: 10 });
            return {
                ...prev,
                [attendanceKey]: 10,
            };
        });`
);

// 5. Update certifyPhotoProof
content = content.replace(
    /setScores\(prev => \(\{\n            \.\.\.prev,\n            \[\`\$\{userId\}_photo_proof_\$\{proofId\}\`]: awardedPoints,\n        \}\)\);/g,
    `const scoreKey = \`\${userId}_photo_proof_\${proofId}\`;
        pushScoreUpdate({ [scoreKey]: awardedPoints });
        setScores(prev => ({
            ...prev,
            [scoreKey]: awardedPoints,
        }));`
);

// 6. Update setScoreEntry
content = content.replace(
    /const setScoreEntry = \(scoreKey: string, score: number \| null\) => \{\n        setScores\(prev => \{\n            if \(score === null\) \{\n                if \(!\(scoreKey in prev\)\) return prev;\n                const next = \{ \.\.\.prev \};\n                delete next\[scoreKey\];\n                return next;\n            \}\n            const normalized = Math\.floor\(score\);\n            const isManualAdjustment = scoreKey\.endsWith\('_manual_adjustment'\);\n            return \{\n                \.\.\.prev,\n                \[scoreKey\]: isManualAdjustment \? normalized : Math\.max\(0, normalized\),\n            \};\n        \}\);\n    \};/g,
    `const setScoreEntry = (scoreKey: string, score: number | null) => {
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
    };`
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('QuizContext updated successfully');
