const fs = require('fs');

const files = ["Sidebar", "WrongAnswers", "Store", "PhotoProof", "Leaderboard", "Home", "Diary", "Community", "Admin"];

files.forEach(f => {
    let p = `src/pages/${f}.tsx`;
    if (f === "Sidebar") p = `src/components/${f}.tsx`;

    if (fs.existsSync(p)) {
        let text = fs.readFileSync(p, "utf8");
        text = text.replace(/setSelectedUserId  users }/g, "setSelectedUserId, users }");
        text = text.replace(/selectedUserId  users }/g, "selectedUserId, users }");
        text = text.replace(/updateWeekVisibility  users }/g, "updateWeekVisibility, users }");
        text = text.replace(/importBackup  users }/g, "importBackup, users }");
        text = text.replace(/\} \= useQuizContext\(\)\; users \} \= useQuizContext\(\)\;/g, "users } = useQuizContext();");
        text = text.replace(/\} = useQuizContext\(\); users } = useQuizContext\(\);/g, "users } = useQuizContext();");
        fs.writeFileSync(p, text, "utf8");
    }
});
