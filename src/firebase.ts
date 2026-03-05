// src/firebase.ts
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// 👇 아까 Firebase 화면에서 복사했던 본인의 설정 코드로 바꿔주세요!
const firebaseConfig = {
    apiKey: "AIzaSyDei63PghHK0Iq0VFDO45ka4uvhNDolGlo",
    authDomain: "polio-b456c.firebaseapp.com",
    projectId: "polio-b456c",
    storageBucket: "polio-b456c.firebasestorage.app",
    messagingSenderId: "281335227940",
    appId: "1:281335227940:web:ffbef375a8146645231ab1",
    measurementId: "G-T9EXMK0681"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
