// ================= IMPORTACIONES =================
import { db } from "./firebase-config.js";
import { collection, addDoc, getDocs, deleteDoc, doc, updateDoc } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

// ================= REFERENCIAS =================
const registroForm = document.getElementById("registroForm");
const errorMessage = document.getElementById("error-message");
const successMessage = document.getElementById("success-message");
const tablaUsuariosBody = document.querySelector("#tablaUsuarios tbody");
const eliminarUsuarioBtn = document.getElementById("eliminarUsuarioBtn");
const editarUsuarioBtn = document.getElementById("editarUsuarioBtn");

let usuarioSeleccionadoId = null;
let usuarioSeleccionado = null;

// ================= REGISTRO DE USUARIO =================
registroForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const username = document.getElementById("username").value.trim();
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value.trim();
    const inviteCode = document.getElementById("inviteCode").value.trim();

    if (!username || !email || !password) {
        alert("Todos los campos son obligatorios.");
        return;
    }

    const rol = inviteCode ? "admin" : "viewer";

    try {
        await addDoc(collection(db, "usuarios"), {
            username,
            email,
            password,
            inviteCode: inviteCode || null,
            role: rol
        });

        successMessage.style.display = "block";
        errorMessage.style.display = "none";
        registroForm.reset();
        cargarUsuarios();

    } catch (error) {
        console.error("Error al registrar usuario:", error);
        errorMessage.style.display = "block";
        successMessage.style.display = "none";
    }
});

// ================= CARGAR USUARIOS EN LA TABLA =================
async function cargarUsuarios() {
    console.log("Cargando usuarios...");
    const querySnapshot = await getDocs(collection(db, "usuarios"));
    tablaUsuariosBody.innerHTML = "";

    if (querySnapshot.empty) {
        console.warn("No se encontraron usuarios.");
        eliminarUsuarioBtn.disabled = true;
        editarUsuarioBtn.disabled = true;
        return;
    }

    querySnapshot.forEach((docSnap) => {
        const usuario = docSnap.data();
        const row = tablaUsuariosBody.insertRow();

        row.insertCell(0).textContent = usuario.username || "No disponible";
        row.insertCell(1).textContent = usuario.email || "No disponible";

        // ✅ Botón en la columna de contraseña
        const cellPassword = row.insertCell(2);
        const passwordButton = document.createElement("button");
        passwordButton.textContent = "👁 Ver";
        passwordButton.classList.add("btn", "btn-sm", "btn-info");
        passwordButton.addEventListener("click", () => {
            alert(`Contraseña de ${usuario.username}: ${usuario.password}`);
        });
        cellPassword.appendChild(passwordButton);

        row.insertCell(3).textContent = usuario.role || "viewer";

        row.addEventListener("click", () => {
            document.querySelectorAll("#tablaUsuarios tbody tr").forEach((tr) => tr.classList.remove("table-primary"));
            row.classList.add("table-primary");
            usuarioSeleccionadoId = docSnap.id;
            usuarioSeleccionado = { ...usuario, id: docSnap.id };

            console.log("Usuario seleccionado:", usuarioSeleccionado);

            eliminarUsuarioBtn.disabled = false;
            editarUsuarioBtn.disabled = false;
        });
    });
}

// ================= EDITAR USUARIO =================
editarUsuarioBtn.addEventListener("click", async () => {
    if (!usuarioSeleccionadoId) {
        alert("Selecciona un usuario para editar.");
        return;
    }

    const newUsername = prompt("Nuevo nombre de usuario:", usuarioSeleccionado.username);
    const newEmail = prompt("Nuevo correo electrónico:", usuarioSeleccionado.email);
    const newPassword = prompt("Nueva contraseña:", usuarioSeleccionado.password);

    if (!newUsername || !newEmail || !newPassword) {
        alert("Todos los campos son obligatorios.");
        return;
    }

    try {
        await updateDoc(doc(db, "usuarios", usuarioSeleccionadoId), {
            username: newUsername,
            email: newEmail,
            password: newPassword
        });

        alert("Usuario actualizado correctamente.");
        cargarUsuarios();
    } catch (error) {
        console.error("Error al actualizar usuario:", error);
    }
});

// ================= ELIMINAR USUARIO =================
eliminarUsuarioBtn.addEventListener("click", async () => {
    if (!usuarioSeleccionadoId) return alert("Selecciona un usuario para eliminar.");

    if (confirm(`¿Seguro que deseas eliminar a ${usuarioSeleccionado.username}?`)) {
        await deleteDoc(doc(db, "usuarios", usuarioSeleccionadoId));
        alert("Usuario eliminado correctamente.");
        usuarioSeleccionadoId = null;
        usuarioSeleccionado = null;
        eliminarUsuarioBtn.disabled = true;
        editarUsuarioBtn.disabled = true;
        cargarUsuarios();
    }
});

// ================= CARGAR USUARIOS AL INICIO =================
document.addEventListener("DOMContentLoaded", () => {
    cargarUsuarios();
});
