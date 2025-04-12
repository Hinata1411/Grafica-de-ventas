// ================= IMPORTACIONES =================
import { auth, signOut, db } from "./firebase-config.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

// ================= EVENTO DOMContentLoaded =================
document.addEventListener("DOMContentLoaded", () => {
  
  // Función para cerrar la sesión
  function logoutSession() {
    signOut(auth)
      .then(() => {
        window.location.href = "index.html"; // Redirige a la página de inicio o login
      })
      .catch((error) => {
        console.error("Error al cerrar sesión:", error);
        alert("Ocurrió un error al cerrar la sesión. Inténtalo nuevamente.");
      });
  }
  
  // Asigna la función de cerrar sesión al botón "Cerrar Sesión"
  const logoutButton = document.getElementById("logoutButton");
  if (logoutButton) {
    logoutButton.addEventListener("click", logoutSession);
  }

  // Configuración de usuario: actualiza el contenedor de usuario con la información del usuario autenticado
  auth.onAuthStateChanged(async (user) => {
    // Se asume que el contenedor de la información del usuario tiene id "userInfoContainer"
    // y que el elemento para mostrar el nombre tiene id "userName".
    const userInfoContainer = document.getElementById("userInfoContainer");
    const userNameElement = document.getElementById("userName");
    if (user && userInfoContainer && userNameElement) {
      userInfoContainer.style.display = "block";
      try {
        const userDocRef = doc(db, "usuarios", user.uid);
        const docSnap = await getDoc(userDocRef);
        console.log("Datos del usuario:", docSnap.data());
        // Si existe un username en Firestore, se muestra; de lo contrario, se muestra el correo
        if (docSnap.exists() && docSnap.data().username) {
          userNameElement.textContent = docSnap.data().username;
        } else {
          userNameElement.textContent = user.email;
        }
      } catch (error) {
        console.error("Error al obtener datos del usuario:", error);
        userNameElement.textContent = user.email;
      }
    } else if (userInfoContainer) {
      userInfoContainer.style.display = "none";
    }
  });

  // Sincronización entre selects de sucursal
  const sucursalSelect = document.getElementById("sucursal");
  const filtroSucursalSelect = document.getElementById("filtroSucursal");
  if (sucursalSelect && filtroSucursalSelect) {
    sucursalSelect.addEventListener("change", (e) => {
      filtroSucursalSelect.value = e.target.value;
    });
    filtroSucursalSelect.addEventListener("change", (e) => {
      sucursalSelect.value = e.target.value;
    });
  }

  // Inicialización de campos fecha globales
  const fechaActual = new Date().toISOString().split("T")[0];
  const fechaElem = document.getElementById("fecha");
  const fechaInicioElem = document.getElementById("fechaInicio");
  const fechaFinElem = document.getElementById("fechaFin");
  if (fechaElem) fechaElem.value = fechaActual;
  if (fechaInicioElem) fechaInicioElem.value = fechaActual;
  if (fechaFinElem) fechaFinElem.value = fechaActual;
});
