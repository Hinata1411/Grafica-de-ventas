// ================= IMPORTACIONES =================
import { db, auth } from "./firebase-config.js";
import { collection, getDocs, deleteDoc, doc, setDoc } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, deleteUser } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";

// ================= REFERENCIAS =================
const registroForm = document.getElementById("registroForm");
const errorMessage = document.getElementById("error-message");
const successMessage = document.getElementById("success-message");
const tablaUsuariosBody = document.getElementById("tablaUsuarios"); // Asegúrate de que este ID está en el tbody
const eliminarUsuarioBtn = document.getElementById("eliminarUsuarioBtn");
const regresarBtn = document.getElementById("regresar-btn");

let usuarioSeleccionadoId = null; // Para saber qué usuario está seleccionado

// ================= REGISTRO DE USUARIO =================
registroForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const username = document.getElementById("username").value;
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  const inviteCode = document.getElementById("inviteCode").value.trim(); // Quitar espacios extra

  let role = "viewer"; // Rol por defecto
  if (inviteCode === "CODIGO-ADMIN") {
    role = "admin"; // Solo si el código es exacto
  }

  // Guardar credenciales del admin actual antes de crear el nuevo usuario
  const adminEmail = auth.currentUser.email;
  const adminPassword = prompt("Por seguridad, ingresa tu contraseña para continuar:");

  if (!adminPassword) return alert("Debes ingresar tu contraseña para continuar.");

  try {
    // Crear usuario en Authentication
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Guardar datos adicionales en Firestore
    await setDoc(doc(db, "usuarios", user.uid), {
      username,
      email,
      role
    });

    console.log("Usuario registrado exitosamente con rol:", role);

    // Volver a iniciar sesión como el admin
    await signInWithEmailAndPassword(auth, adminEmail, adminPassword);
    console.log("Sesión del admin restaurada.");

    // Mostrar mensajes
    successMessage.style.display = "block";
    errorMessage.style.display = "none";

    // Limpiar formulario
    registroForm.reset();
    // Cargar usuarios nuevamente
    cargarUsuarios();

  } catch (error) {
    console.error("Error al registrar usuario: ", error);
    if (error.code === "auth/email-already-in-use") {
      alert("El correo ya está en uso. Por favor usa otro.");
    } else {
      alert("Error: " + error.message);
    }
    errorMessage.style.display = "block";
    successMessage.style.display = "none";
  }
});

// ================= CARGAR USUARIOS EN LA TABLA =================
async function cargarUsuarios() {
  try {
    const querySnapshot = await getDocs(collection(db, "usuarios"));
    // Limpiar tabla
    tablaUsuariosBody.innerHTML = "";

    querySnapshot.forEach((docSnap) => {
      const usuario = docSnap.data();
      // Insertar nueva fila en la tabla
      const row = tablaUsuariosBody.insertRow();

      // Mostrar datos
      row.insertCell(0).textContent = usuario.username || "No disponible";
      row.insertCell(1).textContent = usuario.email || "No disponible";
      row.insertCell(2).innerHTML = "<span style='color: gray;'>••••••••</span>"; // Contraseña oculta
      row.insertCell(3).textContent = usuario.role || "viewer";

      // Selección de usuario para eliminar
      row.addEventListener("click", () => {
        // Desmarcar todas las filas dentro del tbody
        const rows = tablaUsuariosBody.getElementsByTagName("tr");
        for (let i = 0; i < rows.length; i++) {
          rows[i].classList.remove("table-primary");
        }
        // Marcar la fila seleccionada
        row.classList.add("table-primary");
        usuarioSeleccionadoId = docSnap.id;
        eliminarUsuarioBtn.disabled = false;
      });
    });

    // Si no hay usuarios, desactivar botón eliminar
    eliminarUsuarioBtn.disabled = querySnapshot.empty;
  } catch (error) {
    console.error("Error al cargar usuarios:", error);
  }
}

// ================= ELIMINAR USUARIO (Firestore) =================
eliminarUsuarioBtn.addEventListener("click", async () => {
  if (!usuarioSeleccionadoId) return alert("Selecciona un usuario para eliminar.");

  if (confirm("¿Seguro que deseas eliminar este usuario? Esta acción no se puede deshacer.")) {
    try {
      // Eliminar de Firestore
      await deleteDoc(doc(db, "usuarios", usuarioSeleccionadoId));
      alert("Usuario eliminado correctamente de Firestore.");
      usuarioSeleccionadoId = null;
      eliminarUsuarioBtn.disabled = true;
      cargarUsuarios(); // Recargar tabla
    } catch (error) {
      console.error("Error al eliminar usuario:", error);
      alert("Error al eliminar el usuario. Intenta de nuevo.");
    }
  }
});

// ================= CARGAR USUARIOS AL INICIO =================
document.addEventListener("DOMContentLoaded", () => {
  cargarUsuarios();
});
