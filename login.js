import { auth, signInWithEmailAndPassword, signOut } from "./firebase-config.js"; // Eliminar la importación duplicada

// Función para mostrar la información del usuario
const showUserInfo = (user) => {
    document.getElementById("userInfo").style.display = "flex"; // Mostrar el div de usuario
    document.getElementById("userEmail").textContent = user.email; // Mostrar el correo en el contenedor
};

// Función para manejar el cierre de sesión
document.getElementById("logoutButton").addEventListener("click", () => {
    signOut(auth)
        .then(() => {
            // Redirigir a la página de login después de cerrar sesión
            window.location.href = "login.html";  // Cambia a tu archivo de login
        })
        .catch((error) => {
            console.error("Error al cerrar sesión:", error);
        });
});

// Verificar el estado de la sesión al cargar la página

onAuthStateChanged(auth, (user) => {
    if (user) {
        showUserInfo(user); // Si el usuario está autenticado, mostramos su correo
        document.getElementById("loginContainer").style.display = "none";
        document.getElementById("ventasContainer").style.display = "block";
    } else {
        // Si no hay usuario, redirigir al login
        window.location.href = "login.html";  // Redirige al login si no está autenticado
    }
});

// Mostrar el formulario de inicio de sesión
const loginContainer = document.getElementById("loginContainer");
const ventasContainer = document.getElementById("ventasContainer"); // Contenedor con formularios de ventas

// Mostrar formulario de inicio de sesión
loginContainer.style.display = "block";
ventasContainer.style.display = "none";

// Función para manejar el inicio de sesión con Firebase
document.getElementById("loginForm").addEventListener("submit", function (e) {
    e.preventDefault();
    
    let email = document.getElementById("email").value;
    let password = document.getElementById("password").value;

    if (email && password) {
        // Usar Firebase para autenticar
        signInWithEmailAndPassword(auth, email, password)
            .then((userCredential) => {
                const user = userCredential.user;
                localStorage.setItem('email', user.email);  // Guardar el correo en el almacenamiento local
                
                // Mostrar contenido de ventas y ocultar el login
                document.getElementById("ventasContainer").style.display = "block";
                document.getElementById("userInfo").style.display = "block";
                
                // Mostrar el correo en el contenedor de usuario
                document.getElementById("userEmail").innerText = user.email;
                limpiarLogin();  // Limpiar el formulario de login
            })
            .catch((error) => {
                console.error("Error al iniciar sesión: ", error);
                alert("Correo o contraseña incorrectos. Intenta nuevamente.");
            });
    } else {
        alert("Por favor, ingresa un correo y una contraseña.");
    }
});

// Función para limpiar el formulario de inicio de sesión
function limpiarLogin() {
    document.getElementById("email").value = "";
    document.getElementById("password").value = "";
}
