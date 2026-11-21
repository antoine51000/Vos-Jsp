import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDdHnX9jdaBH4TCN4umobqXQl2DdBtWpLM",
  authDomain: "vos-jsp.firebaseapp.com",
  projectId: "vos-jsp",
  storageBucket: "vos-jsp.firebasestorage.app",
  messagingSenderId: "564615712666",
  appId: "1:564615712666:web:0020ad71367d5d2b127423",
  measurementId: "G-7WPY4B849T"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);