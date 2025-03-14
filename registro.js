// ================= IMPORTACIONES =================
import { auth, db } from "./firebase-config.js";
import { createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";
import { doc, setDoc } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

// ================= EVENTO PARA REGISTRO =================
document.getElementById("registroForm").addEventListener("submit", async function (e) {
    e.preventDefault();

    // Captura de datos
    const username = document.getElementById("username").value.trim();
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;
    const inviteCode = document.getElementById("inviteCode").value.trim();

    // Definir rol
    let role = "viewer";  // Por defecto
    if (inviteCode === "ADMIN_CODE") {  // Código para administrador
        role = "admin";
    }

    // Validación de campos
    if (username && email && password) {
        try {
            // ✅ Crear usuario en Authentication
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            // ✅ Guardar en Firestore con UID como ID del documento
            await setDoc(doc(db, "usuarios", user.uid), {
                username: username,
                email: email,
                uid: user.uid,
                role: role
            });

            // ✅ Mensaje de éxito y redirección
            document.getElementById("success-message").style.display = "block";
            document.getElementById("registroForm").reset();
            document.getElementById("error-message").style.display = "none";

            // Botón de regresar según el rol
            const regresarBtn = document.getElementById("regresar-btn");
            regresarBtn.textContent = "Regresar";
            regresarBtn.href = (role === "admin") ? "paginaadmin.html" : "paginavisual.html";
            regresarBtn.style.display = "inline-block";

        } catch (error) {
            console.error("❌ Error al registrar usuario: ", error);

            // ✅ Mensajes de error personalizados
            let mensajeError = "Hubo un error al registrar el usuario. Intenta de nuevo.";
            if (error.code === "auth/email-already-in-use") {
                mensajeError = "Este correo ya está registrado.";
            } else if (error.code === "auth/invalid-email") {
                mensajeError = "Correo electrónico no válido.";
            } else if (error.code === "auth/weak-password") {
                mensajeError = "La contraseña es demasiado débil. Usa al menos 6 caracteres.";
            }

            // Mostrar mensaje de error
            document.getElementById("error-message").innerText = mensajeError;
            document.getElementById("error-message").style.display = "block";
            document.getElementById("success-message").style.display = "none";
        }
    } else {
        alert("Por favor, completa todos los campos obligatorios.");
    }
});
