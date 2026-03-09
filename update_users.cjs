const fs = require('fs');
const path = require('path');

const contextFile = 'src/context/QuizContext.tsx';
let txt = fs.readFileSync(contextFile, 'utf8');

if (!txt.includes('export interface User {')) {
    txt = txt.replace(
        `import { db } from '../firebase';`,
        `import { db } from '../firebase';\nimport { MOCK_USERS } from '../data/mockData';`
    );

    txt = txt.replace(
        `export interface PurchasedCoupon`,
        `export interface User {\n    id: number;\n    name: string;\n    pin?: string;\n}\n\nexport interface PurchasedCoupon`
    );

    txt = txt.replace(
        `type QuizContextType = {\n    selectedUserId`,
        `type QuizContextType = {\n    users: User[];\n    addUser: (name: string, pin: string) => void;\n    selectedUserId`
    );

    txt = txt.replace(
        `export function QuizProvider({ children }: { children: React.ReactNode }) {\n    const [selectedUserId, setSelectedUserId] = useState`,
        `export function QuizProvider({ children }: { children: React.ReactNode }) {\n    const [users, setUsers] = useState<User[]>(MOCK_USERS);\n\n    const [selectedUserId, setSelectedUserId] = useState`
    );

    // After scores effect, insert users sync logic
    txt = txt.replace(
        `const unsub = onSnapshot(doc(db, 'global_state', 'scores'), (snapshot) => {`,
        `const pushUserUpdate = async (newUser: User) => {\n        try {\n            await setDoc(doc(db, 'global_state', 'users'), {\n                [newUser.id]: newUser\n            }, { merge: true });\n        } catch (e) {\n            console.error('Firebase save error:', e);\n        }\n    };\n\n    useEffect(() => {\n        const unsub = onSnapshot(doc(db, 'global_state', 'users'), (snapshot) => {\n            if (snapshot.exists()) {\n                const data = snapshot.data();\n                const fetchedUsers = Object.values(data) as User[];\n                setUsers(prev => {\n                    const cmap = new Map(MOCK_USERS.map(u => [u.id, u]));\n                    fetchedUsers.forEach(u => cmap.set(u.id, u));\n                    return Array.from(cmap.values()).sort((a, b) => a.id - b.id);\n                });\n            } else {\n                setUsers([...MOCK_USERS]);\n            }\n        });\n        return () => unsub();\n    }, []);\n\n    const addUser = (name: string, pin: string) => {\n        const currentIds = users.filter(u => u.id < 900).map(u => u.id);\n        const nextId = currentIds.length > 0 ? Math.max(...currentIds) + 1 : 1;\n        const newUser: User = { id: nextId, name, pin };\n        pushUserUpdate(newUser);\n        setUserPins(prev => {\n             if(prev[nextId]) return prev;\n             return { ...prev, [nextId]: pin };\n        });\n    };\n\n    const unsub = onSnapshot(doc(db, 'global_state', 'scores'), (snapshot) => {`
    );

    txt = txt.replace(
        `value={{\n                selectedUserId,`,
        `value={{\n                users,\n                addUser,\n                selectedUserId,`
    );

    fs.writeFileSync(contextFile, txt, 'utf8');
}

// Do replacements for MOCK_USERS -> users in all files
function replaceInComponents() {
    const components = [
        "src/pages/WrongAnswers.tsx",
        "src/pages/Store.tsx",
        "src/pages/PhotoProof.tsx",
        "src/pages/Leaderboard.tsx",
        "src/pages/Home.tsx",
        "src/pages/Diary.tsx",
        "src/pages/Community.tsx",
        "src/pages/Admin.tsx",
        "src/components/Sidebar.tsx"
    ];

    for (let i = 0; i < components.length; i++) {
        const file = components[i];
        if (!fs.existsSync(file)) continue;

        let ptxt = fs.readFileSync(file, 'utf8');

        // Remove MOCK_USERS from imports
        ptxt = ptxt.replace(/ MOCK_USERS, /g, ' ');
        ptxt = ptxt.replace(/MOCK_USERS, /g, '');
        ptxt = ptxt.replace(/, MOCK_USERS/g, '');
        ptxt = ptxt.replace(/import { MOCK_USERS } from '\.\.\/data\/mockData';\r?\n?/g, '');
        ptxt = ptxt.replace(/import { MOCK_USERS } from '\.\/data\/mockData';\r?\n?/g, '');

        if (!ptxt.includes('users') && ptxt.includes('useQuizContext()')) {
            ptxt = ptxt.replace(/} = useQuizContext\(\);/, ' users } = useQuizContext();');
        }

        if (file === "src/pages/Home.tsx") {
            // Skip direct replacement for Home, since I'll use multi_replace.
            // However wait! Just do it and I'll add the new user UI manually.
        }

        if (ptxt.includes('MOCK_USERS')) {
            ptxt = ptxt.replace(/MOCK_USERS/g, 'users');
            fs.writeFileSync(file, ptxt, 'utf8');
        }
    }
}
replaceInComponents();
console.log('Done!');
