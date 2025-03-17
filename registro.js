// ================= IMPORTACIONES =================
import { db } from "./firebase-config.js";
import { collection, addDoc, getDocs, deleteDoc, doc } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

// ================= REFERENCIAS =================
const registroForm = document.getElementById("registroForm");
const errorMessage = document.getElementById("error-message");
const successMessage = document.getElementById("success-message");
const tablaUsuariosBody = document.querySelector("#tablaUsuarios tbody");
const eliminarUsuarioBtn = document.getElementById("eliminarUsuarioBtn");

let usuarioSeleccionadoId = null;

// ================= REGISTRO DE USUARIO =================
registroForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const username = document.getElementById("username").value;
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;
    const inviteCode = document.getElementById("inviteCode").value;

    const rol = inviteCode ? "admin" : "viewer"; // ✅ Rol automático

    try {
        await addDoc(collection(db, "usuarios"), {
            username,
            email,
            password, // ⚠️ Recuerda: en producción debería cifrarse
            inviteCode: inviteCode || null,
            role: rol
        });

        successMessage.style.display = "block";
        errorMessage.style.display = "none";
        registroForm.reset();
        cargarUsuarios(); // Recargar la tabla

    } catch (error) {
        console.error("Error al registrar usuario: ", error);
        errorMessage.style.display = "block";
        successMessage.style.display = "none";
    }
});

// ================= CARGAR USUARIOS EN LA TABLA =================
async function cargarUsuarios() {
    const querySnapshot = await getDocs(collection(db, "usuarios"));
    tablaUsuariosBody.innerHTML = ""; // Limpiar tabla

    querySnapshot.forEach((docSnap) => {
        const usuario = docSnap.data();
        const row = tablaUsuariosBody.insertRow();

        // ✅ Mostrar aunque falten datos, con valores por defecto
        row.insertCell(0).textContent = usuario.username || "No disponible";
        row.insertCell(1).textContent = usuario.email || "No disponible";
        row.insertCell(2).innerHTML = "<span style='color: gray;'>••••••••</span>"; // Contraseña oculta
        row.insertCell(3).textContent = usuario.role || "viewer"; // Por defecto viewer si no tiene rol

        // ✅ Selección de usuario para eliminar
        row.addEventListener("click", () => {
            document.querySelectorAll("#tablaUsuarios tbody tr").forEach((tr) => tr.classList.remove("table-primary"));
            row.classList.add("table-primary");
            usuarioSeleccionadoId = docSnap.id;
            eliminarUsuarioBtn.disabled = false;
        });
    });

    // Si no hay usuarios, desactivar botón eliminar
    if (querySnapshot.empty) {
        eliminarUsuarioBtn.disabled = true;
    }
}

// ================= ELIMINAR USUARIO =================
eliminarUsuarioBtn.addEventListener("click", async () => {
    if (!usuarioSeleccionadoId) return alert("Selecciona un usuario para eliminar.");

    if (confirm("¿Seguro que deseas eliminar este usuario?")) {
        await deleteDoc(doc(db, "usuarios", usuarioSeleccionadoId));
        alert("Usuario eliminado correctamente.");
        usuarioSeleccionadoId = null;
        eliminarUsuarioBtn.disabled = true;
        cargarUsuarios(); // Recargar tabla
    }
});

// ================= CARGAR USUARIOS AL INICIO =================
document.addEventListener("DOMContentLoaded", () => {
    cargarUsuarios();
});
