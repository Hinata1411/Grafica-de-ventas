// Importar las funciones necesarias de Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";



// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBL8onIxodd41sUUc8r9JLQg4lLwGPSmzc",
  authDomain: "grafica-ventas.firebaseapp.com",
  projectId: "grafica-ventas",
  storageBucket: "grafica-ventas.firebasestorage.app",
  messagingSenderId: "841964521076",
  appId: "1:841964521076:web:67d2d9d155924e92eeb321",
  measurementId: "G-QE8FMBLSL0"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);


export { db, auth, signInWithEmailAndPassword, onAuthStateChanged, signOut };