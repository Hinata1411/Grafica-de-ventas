// ================= IMPORTACIONES =================
import { db, auth } from "./firebase-config.js";
import {
  collection,
  getDocs,
  deleteDoc,
  doc,
  setDoc,
  updateDoc
} from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  reauthenticateWithCredential,
  updatePassword,
  EmailAuthProvider
} from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";

// ================= VARIABLES GLOBALES =================
let usuarioSeleccionadoId = null; // Para saber qué usuario está seleccionado

// ================= REGISTRO DE USUARIO =================
function setupRegistroUsuario() {
  const registroForm = document.getElementById("registroForm");
  const errorMessage = document.getElementById("error-message");
  const successMessage = document.getElementById("success-message");

  registroForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const username = document.getElementById("username").value;
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;
    
    // Leer el rol desde el nuevo select (que reemplaza el campo código de invitación)
    const role = document.getElementById("roleSelect").value; // 'admin' o 'viewer'
    
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

      // Mostrar mensajes de éxito y limpiar formulario
      successMessage.style.display = "block";
      errorMessage.style.display = "none";
      registroForm.reset();

      // Recargar la tabla de usuarios
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
}

// ================= CARGAR USUARIOS EN LA TABLA =================
export async function cargarUsuarios() {
  try {
    const tablaUsuariosBody = document.getElementById("tablaUsuarios");
    if (!tablaUsuariosBody) {
      console.error("No se encontró el elemento con id 'tablaUsuarios'. Asegúrate de inyectar el template de Usuarios.");
      return;
    }
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

      // Selección de usuario para eliminar/editar
      row.addEventListener("click", () => {
        // Desmarcar todas las filas
        const rows = tablaUsuariosBody.getElementsByTagName("tr");
        for (let i = 0; i < rows.length; i++) {
          rows[i].classList.remove("table-primary");
        }
        row.classList.add("table-primary");
        usuarioSeleccionadoId = docSnap.id;
        // Habilitar botones de edición y eliminación
        const eliminarUsuarioBtn = document.getElementById("eliminarUsuarioBtn");
        const editarUsuarioBtn = document.getElementById("editarUsuarioBtn");
        if (eliminarUsuarioBtn) eliminarUsuarioBtn.disabled = false;
        if (editarUsuarioBtn) editarUsuarioBtn.disabled = false;
      });
    });

    // Deshabilitar botones si no hay usuarios
    const eliminarUsuarioBtn = document.getElementById("eliminarUsuarioBtn");
    const editarUsuarioBtn = document.getElementById("editarUsuarioBtn");
    if (eliminarUsuarioBtn) {
      eliminarUsuarioBtn.disabled = querySnapshot.empty;
    }
    if (editarUsuarioBtn) {
      editarUsuarioBtn.disabled = querySnapshot.empty;
    }
  } catch (error) {
    console.error("Error al cargar usuarios:", error);
  }
}

// ================= ELIMINAR USUARIO (Firestore) =================
function setupEliminarUsuario() {
  const eliminarUsuarioBtn = document.getElementById("eliminarUsuarioBtn");
  eliminarUsuarioBtn.addEventListener("click", async () => {
    if (!usuarioSeleccionadoId) return alert("Selecciona un usuario para eliminar.");

    if (confirm("¿Seguro que deseas eliminar este usuario? Esta acción no se puede deshacer.")) {
      try {
        await deleteDoc(doc(db, "usuarios", usuarioSeleccionadoId));
        alert("Usuario eliminado correctamente de Firestore.");
        usuarioSeleccionadoId = null;
        eliminarUsuarioBtn.disabled = true;
        cargarUsuarios(); // Recargar tabla de usuarios
      } catch (error) {
        console.error("Error al eliminar usuario:", error);
        alert("Error al eliminar el usuario. Intenta de nuevo.");
      }
    }
  });
}

// ================= EDITAR USUARIO (Firestore + Auth para contraseña) =================
function setupEditarUsuario() {
  const editarUsuarioBtn = document.getElementById("editarUsuarioBtn");
  editarUsuarioBtn.addEventListener("click", async () => {
    if (!usuarioSeleccionadoId) return alert("Selecciona un usuario para editar.");

    const newUsername = prompt("Ingresa el nuevo nombre de usuario:");
    const newPassword = prompt("Ingresa la nueva contraseña:");
    
    if (!newUsername || newUsername.trim() === "" || !newPassword || newPassword.trim() === "") {
      return alert("Debes ingresar tanto un nuevo nombre de usuario como una nueva contraseña.");
    }

    try {
      const userDocRef = doc(db, "usuarios", usuarioSeleccionadoId);
      await updateDoc(userDocRef, { username: newUsername.trim() });
      
      if (usuarioSeleccionadoId === auth.currentUser.uid) {
        const currentPassword = prompt("Por seguridad, ingresa tu contraseña actual para confirmar la operación:");
        if (!currentPassword) {
          return alert("Operación cancelada.");
        }
        const credential = EmailAuthProvider.credential(auth.currentUser.email, currentPassword);
        await reauthenticateWithCredential(auth.currentUser, credential);
        await updatePassword(auth.currentUser, newPassword.trim());
        alert("Usuario y contraseña actualizados exitosamente.");
      } else {
        alert("El nombre de usuario fue actualizado. Solo puedes actualizar la contraseña de tu propia cuenta.");
      }
      
      usuarioSeleccionadoId = null;
      editarUsuarioBtn.disabled = true;
      const eliminarUsuarioBtn = document.getElementById("eliminarUsuarioBtn");
      if (eliminarUsuarioBtn) eliminarUsuarioBtn.disabled = true;
      cargarUsuarios();
    } catch (error) {
      console.error("Error al editar usuario:", error);
      alert("Error al editar el usuario. Intenta de nuevo.");
    }
  });
}

// ================= INICIALIZACIÓN PARA LA SECCIÓN DE USUARIOS =================
export function initUsuarios() {
  console.log("initUsuarios: Iniciando administración de Usuarios");
  // Configurar registro de usuario
  setupRegistroUsuario();
  // Configurar eliminación y edición de usuarios
  setupEliminarUsuario();
  setupEditarUsuario();
  // Cargar usuarios en la tabla
  cargarUsuarios();
}
