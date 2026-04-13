/* =============================================
   RECEITAS DA ISA — Firebase Configuration
   ============================================= */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, updateDoc, arrayUnion, arrayRemove } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDSr3_Nnzdz-_QFsStd8oBCQNhH2qfVf08",
  authDomain: "receitas-da-isa.firebaseapp.com",
  projectId: "receitas-da-isa",
  storageBucket: "receitas-da-isa.firebasestorage.app",
  messagingSenderId: "350952761898",
  appId: "1:350952761898:web:00445d77ac1ab2126f3153",
  measurementId: "G-VLD739BWGM"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

export { 
  auth, db, provider, 
  signInWithPopup, signOut, onAuthStateChanged,
  doc, getDoc, setDoc, updateDoc, arrayUnion, arrayRemove 
};
