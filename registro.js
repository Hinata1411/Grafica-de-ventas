import { auth, db } from "./firebase-config.js";
import { createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";
import { doc, setDoc } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

document.getElementById("registroForm").addEventListener("submit", async function (e) {
    e.preventDefault();

    const username = document.getElementById("username").value;
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;
    const inviteCode = document.getElementById("inviteCode").value;

    let role = "viewer";  
    if (inviteCode === "ADMIN_CODE") {  
        role = "admin";
    }

    if (username && email && password) {
        try {
            // Crear usuario con Firebase Authentication
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            // Aquí está la corrección: usa setDoc() con UID como ID del documento
            await setDoc(doc(db, "usuarios", user.uid), {
                username: username,
                email: email,
                uid: user.uid,
                role: role
            });

            document.getElementById("success-message").style.display = "block";
            document.getElementById("registroForm").reset();
            document.getElementById("error-message").style.display = "none";

            const regresarBtn = document.getElementById("regresar-btn");
            regresarBtn.textContent = "Regresar";
            regresarBtn.href = (role === "admin") ? "paginaadmin.html" : "paginavisual.html";
            regresarBtn.style.display = "inline-block";

        } catch (error) {
            console.error("Error al registrar usuario: ", error);
            if (error.code === "auth/email-already-in-use") {
                document.getElementById("error-message").innerText = "Este correo ya está registrado.";
            } else {
                document.getElementById("error-message").innerText = "Hubo un error al registrar el usuario.";
            }

            document.getElementById("error-message").style.display = "block";
            document.getElementById("success-message").style.display = "none";
        }
    } else {
        alert("Por favor, completa todos los campos.");
    }
});
