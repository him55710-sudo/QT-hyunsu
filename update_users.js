const fs = require('fs');

const contextPath = "src/context/QuizContext.tsx";
let content = fs.readFileSync(contextPath, 'utf8');

// 1. Add User type definition
if (!content.includes('export interface User')) {
    content = content.replace(
        `export interface PurchasedCoupon {`,
        `export interface User {\n    id: number;\n    name: string;\n    pin?: string;\n}\n\nexport interface PurchasedCoupon {`
    );
}

// 2. Add users to QuizContextType
if (!content.includes('users: User[];')) {
    content = content.replace(
        `selectedUserId: number | null;`,
        `users: User[];\n    addUser: (name: string, pin: string) => void;\n    selectedUserId: number | null;`
    );
}

if (!content.includes('mockData')) {
    content = content.replace(
        `import { db } from '../firebase';`,
        `import { db } from '../firebase';\nimport { MOCK_USERS } from '../data/mockData';`
    );
}

// 3. Add state and effect in QuizProvider
if (!content.includes('const [users, setUsers] = useState<User[]>')) {
    content = content.replace(
        `const [selectedUserId, setSelectedUserId] = useState<number | null>`,
        `const [users, setUsers] = useState<User[]>(MOCK_USERS);\n\n    const [selectedUserId, setSelectedUserId] = useState<number | null>`
    );

    const firebaseUsersLogic = `// Firebase Sync for Users
    const pushUserUpdate = async (newUser: User) => {
        try {
            await setDoc(doc(db, 'global_state', 'users'), {
                [newUser.id]: newUser
            }, { merge: true });
        } catch (e) {
            console.error('Firebase save error:', e);
        }
    };

    useEffect(() => {
        const unsub = onSnapshot(doc(db, 'global_state', 'users'), (snapshot) => {
            if (snapshot.exists()) {
                const data = snapshot.data();
                const fetchedUsers = Object.values(data) as User[];
                // Merge initial MOCK_USERS with fetchedUsers
                setUsers((prev) => {
                    const cmap = new Map(MOCK_USERS.map(u => [u.id, u]));
                    fetchedUsers.forEach(u => cmap.set(u.id, u));
                    return Array.from(cmap.values()).sort((a, b) => a.id - b.id);
                });
            } else {
                 setUsers([...MOCK_USERS]);
            }
        });
        return () => unsub();
    }, []);

    const addUser = (name: string, pin: string) => {
        // find max id (excluding admin 999 if present? actually we sort by id and pick max)
        const currentIds = users.filter(u => u.id < 900).map(u => u.id);
        const nextId = currentIds.length > 0 ? Math.max(...currentIds) + 1 : 1;
        const newUser: User = { id: nextId, name, pin };
        
        // update pin list
        let changedPins = false;
        setUserPins(prev => {
           if(prev[nextId]) return prev;
           return { ...prev, [nextId]: pin };
        });

        // also we should update pins in users context if needed 
        pushUserUpdate(newUser);
        setUsers(prev => [...prev, newUser].sort((a, b) => a.id - b.id));
    };
`;
    // Add logic after the pushScoreUpdate async function ends
    content = content.replace(
        /const pushScoreUpdate = async \(updateObj: Record<string, number \| null>\) => \{[\s\S]*?console\.error\('Firebase save error:', e\);\n        \}\n    \};/m,
        `const pushScoreUpdate = async (updateObj: Record<string, number | null>) => {
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

    ${firebaseUsersLogic}`
    );
}

if (!content.includes('users,')) {
    content = content.replace(
        `value={{`,
        `value={{\n                users,\n                addUser,`
    );
}

fs.writeFileSync(contextPath, content, 'utf8');

// Replace MOCK_USERS usage in components
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

    for (const f of components) {
        if (!fs.existsSync(f)) continue;
        let pContent = fs.readFileSync(f, 'utf8');

        // Remove MOCK_USERS from import { MOCK_USERS ... } from '../data/mockData'
        pContent = pContent.replace(/MOCK_USERS,\s*/g, '');
        pContent = pContent.replace(/,\s*MOCK_USERS/g, '');
        pContent = pContent.replace(/import \{ MOCK_USERS \} from '\.\.\/data\/mockData';/g, '');
        pContent = pContent.replace(/import \{\s*MOCK_USERS\s*\} from '\.\/data\/mockData';/g, '');
        pContent = pContent.replace(/import \{\s*\} from '\.\.\/data\/mockData';/g, ''); // cleanup empty

        // Find useQuizContext
        if (!pContent.includes('users') && pContent.includes('useQuizContext()')) {
            pContent = pContent.replace(/\} = useQuizContext\(\);/, ' users } = useQuizContext();');
            pContent = pContent.replace(/\} = useQuizContext\(\);/, ' users } = useQuizContext();'); // just in case
        } else if (!pContent.includes('useQuizContext')) {
            if (pContent.includes('MOCK_USERS')) {
                // we need to inject useQuizContext if missing, but it's likely present
            }
        }

        // Ensure "users" is extracted if useQuizContext exists but we haven't added it yet
        if (pContent.includes('useQuizContext') && !pContent.match(/(?:const|let|var)\s+\{[^}]*\busers\b[^}]*\}\s*=\s*useQuizContext\(\)/)) {
            pContent = pContent.replace(/useQuizContext\(\);/, 'useQuizContext(); // needs users manual fix if not extracted');
            // Instead of manually fixing here all varied syntax, I'll just use simple approach
            pContent = pContent.replace(/const { ([^}]*) } = useQuizContext\(\);/, 'const { $1, users } = useQuizContext();');
        }

        // Replace MOCK_USERS with users
        pContent = pContent.replace(/MOCK_USERS/g, 'users');

        fs.writeFileSync(f, pContent, 'utf8');
    }
}

replaceInComponents();
console.log("Done updating context and components");
