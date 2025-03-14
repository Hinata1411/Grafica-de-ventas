import { auth, signInWithEmailAndPassword } from './firebase-config.js';
import { doc, getDoc } from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js';
import { db } from "./firebase-config.js";

document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("loginForm").addEventListener("submit", async (e) => {
        e.preventDefault();

        const emailElement = document.getElementById("email");
        const passwordElement = document.getElementById("password");

        if (!emailElement || !passwordElement) {
            alert("No se encontró el campo de email o contraseña en el HTML.");
            return;
        }

        const email = email.value;
        const password = password.value;

        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            const docRef = doc(db, "usuarios", user.uid);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                const userData = docSnap.data();
                if (userData.role === "admin") {
                    window.location.href = 'paginaadmin.html';
                } else {
                    window.location.href = 'paginausuario.html';
                }
            } else {
                alert("No existe información del usuario en Firestore.");
            }
        } catch (error) {
            console.error("Error en autenticación:", error);
            alert("Usuario o contraseña incorrectos.");
        }
    });
});
