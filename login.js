// ================= IMPORTACIONES =================
import { auth, signInWithEmailAndPassword } from './firebase-config.js';
import { collection, query, getDocs, doc, getDoc } from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js';
import { db } from './firebase-config.js';

document.addEventListener("DOMContentLoaded", async () => {
  const userSelect = document.getElementById("userSelect");

  try {
    // Consultar todos los usuarios registrados en Firestore
    const querySnapshot = await getDocs(collection(db, "usuarios"));
    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      // Crear una opción para el combobox.
      // Se asume que el campo "username" existe y se muestra, y que "email" es el valor para autenticación.
      const option = document.createElement("option");
      option.value = data.email; // Valor a usar en la autenticación
      option.textContent = data.username; // Texto que se muestra en el combobox
      userSelect.appendChild(option);
    });
  } catch (error) {
    console.error("Error al cargar usuarios:", error);
    alert("Error al cargar los usuarios. Intenta de nuevo más tarde.");
  }

  // Agregar el listener para el submit del formulario
  document.getElementById("loginForm").addEventListener("submit", async (e) => {
    e.preventDefault();

    const userSelect = document.getElementById("userSelect");
    const passwordInput = document.getElementById("password");

    if (!userSelect || !passwordInput) {
      alert("No se encontró el campo de usuario o contraseña en el HTML.");
      return;
    }

    // El correo se obtiene del valor de la opción seleccionada
    const email = userSelect.value;
    const password = passwordInput.value;

    try {
      // Autenticar con Firebase Auth usando el correo obtenido y la contraseña ingresada
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Obtener datos del usuario desde Firestore para redirigir según el rol
      const docRef = doc(db, "usuarios", user.uid);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const userData = docSnap.data();
        if (userData.role === "admin") {
          window.location.href = 'paginaadmin.html';
        } else {
          window.location.href = 'paginavisual.html'; // Asegúrate de que esta página exista
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
