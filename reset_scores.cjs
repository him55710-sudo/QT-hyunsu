const { initializeApp } = require("firebase/app");
const { getFirestore, doc, setDoc } = require("firebase/firestore");

const app = initializeApp({
    apiKey: "AIzaSyDei63PghHK0Iq0VFDO45ka4uvhNDolGlo",
    authDomain: "polio-b456c.firebaseapp.com",
    projectId: "polio-b456c"
});

const db = getFirestore(app);

// 빈 객체로 덮어씌워 점수 초기화
setDoc(doc(db, "global_state", "scores"), {})
    .then(() => {
        console.log("모든 학생들의 점수가 초기화되었습니다!");
        process.exit(0);
    })
    .catch((error) => {
        console.error("초기화 중 오류 발생:", error);
        process.exit(1);
    });
