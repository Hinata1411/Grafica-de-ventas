// ================= IMPORTACIONES =================

import { db, auth, signOut } from "./firebase-config.js";
import { collection, getDocs, query, orderBy, where, addDoc, doc, updateDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";


// ================= VARIABLES GLOBALES =================

let ventaSeleccionada = null;
let rangoFechaInicio = null;
let rangoFechaFin = null;


// ================= REFERENCIAS =================

const verDatosBtn = document.getElementById("verDatos");
const logoutButton = document.getElementById("logoutButton");
const ventaForm = document.getElementById("ventaForm");
const editarVentaBtn = document.getElementById("editarVenta");
const eliminarVentaBtn = document.getElementById("eliminarVenta");
const sucursalSelect = document.getElementById("sucursal");


// ================= FUNCIONES GENERALES =================

function limpiarFormulario() {
    ventaForm.reset();
    const fechaActual = new Date().toISOString().split('T')[0];
    document.getElementById("fecha").value = fechaActual;
}

async function cargarVentas(sucursal, fechaInicio, fechaFin) {
    if (!fechaInicio || !fechaFin) {
        alert("Debes ingresar un rango de fechas válido.");
        return;
    }

    const q = query(
        collection(db, "ventas"),
        where("sucursal", "==", sucursal),
        where("fecha", ">=", fechaInicio),
        where("fecha", "<=", fechaFin),
        orderBy("fecha")
    );

    const ventasSnapshot = await getDocs(q);
    const ventasFirestore = ventasSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));

    const fechas = [];
    const valores = [];

    let fechaIter = new Date(fechaInicio);
    const fechaFinObj = new Date(fechaFin);

    while (fechaIter <= fechaFinObj) {
        const fechaFormateada = fechaIter.toISOString().split('T')[0];
        const etiquetaFecha = fechaFormateada.split('-').reverse().join('/');

        fechas.push(etiquetaFecha);
        const venta = ventasFirestore.find(v => v.fecha === fechaFormateada);
        valores.push(venta ? venta.monto : 0);

        fechaIter.setDate(fechaIter.getDate() + 1);
    }

    mostrarTablaVentasConRango(fechas, valores, sucursal, ventasFirestore);
    mostrarGraficaVentas(fechas, valores, sucursal);
      // Mostrar resumen total y promedio
      calcularTotalesYPromedios(valores);

}

function mostrarTablaVentasConRango(etiquetas, valores, sucursal, ventasFirestore) {
    const tabla = document.querySelector("#tablaVentas tbody");
    tabla.innerHTML = "";
    let total = 0;

    etiquetas.forEach((fechaFormateada, index) => {
        const row = tabla.insertRow();
        row.insertCell(0).textContent = fechaFormateada;
        row.insertCell(1).textContent = sucursal;

        const fechaISO = fechaFormateada.split('/').reverse().join('-');
        const ventaExistente = ventasFirestore.find(v => v.fecha === fechaISO);

        if (ventaExistente) {
            row.insertCell(2).textContent = ventaExistente.monto.toLocaleString('es-GT', { style: 'currency', currency: 'GTQ' });
            total += ventaExistente.monto;
            row.addEventListener("click", () => {
                document.querySelectorAll("#tablaVentas tbody tr").forEach(r => r.classList.remove("table-primary"));
                row.classList.add("table-primary");
                ventaSeleccionada = ventaExistente;
            });
        } else {
            row.insertCell(2).innerHTML = "<span style='color: red;'>Venta no ingresada</span>";
        }
    });

    const totalRow = tabla.insertRow();
    totalRow.innerHTML = `<td><strong>Total</strong></td><td></td><td><strong>${total.toLocaleString('es-GT', { style: 'currency', currency: 'GTQ' })}</strong></td>`;
}
    // Cuadros de resumen total y promedio
    function calcularTotalesYPromedios(valores) {
        const totalVentas = valores.reduce((acc, val) => acc + val, 0);
        const promedioVentas = valores.length > 0 ? (totalVentas / valores.length) : 0;

        document.getElementById("totalVentas").textContent = totalVentas.toLocaleString('es-GT', { style: 'currency', currency: 'GTQ' });
        document.getElementById("promedioVentas").textContent = promedioVentas.toLocaleString('es-GT', { style: 'currency', currency: 'GTQ' });
    }


function mostrarGraficaVentas(fechas, valores, sucursal) {
    const ctx = document.getElementById("ventasChart").getContext("2d");
    if (window.miGrafica) window.miGrafica.destroy();

    // ✅ Mapear las fechas para que muestren solo dd/mm
    const fechasFormateadas = fechas.map(fecha => {
        const [dia, mes, anio] = fecha.split('/');
        return `${dia}/${mes}`; // Solo dd/mm
    });

    // ✅ Definir colores por sucursal
    const coloresSucursales = {
        "Santa Elena": "#28a745",  // Verde
        "Eskala": "#28a745",       // Verde
        "San Pedro Pinula": "#28a745", // Verde
        "Jalapa": "#dc3545",       // Rojo
        "Zacapa": "#fd7e14",       // Naranja
        "Poptún": "#007bff"        // Azul
    };

    // Color según sucursal o uno por defecto
    const colorGrafica = coloresSucursales[sucursal] || "#6c757d"; // Gris por defecto

    // ✅ Crear la gráfica
    window.miGrafica = new Chart(ctx, {
        type: "bar",
        data: {
            labels: fechasFormateadas, // Usar fechas dd/mm
            datasets: [{
                label: `Ventas en ${sucursal}`,
                data: valores,
                backgroundColor: colorGrafica
            }]
        },
        options: {
            plugins: {
                legend: { display: true }
            },
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}



// ================= EVENTOS =================

verDatosBtn.addEventListener("click", () => {
    const sucursal = document.getElementById("filtroSucursal").value;
    const fechaInicio = document.getElementById("fechaInicio").value;
    const fechaFin = document.getElementById("fechaFin").value;

    if (fechaInicio && fechaFin) {
        rangoFechaInicio = fechaInicio;
        rangoFechaFin = fechaFin;
        cargarVentas(sucursal, fechaInicio, fechaFin);
    } else {
        alert("Por favor ingresa un rango de fechas válido.");
    }
});

ventaForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const fecha = document.getElementById("fecha").value;
    const monto = parseFloat(document.getElementById("monto").value);
    const sucursal = document.getElementById("sucursal").value;

    if (monto <= 0) return alert("El monto debe ser un número positivo.");

    await addDoc(collection(db, "ventas"), { fecha, monto, sucursal });
    alert("Venta ingresada correctamente");
    cargarVentas(sucursal, rangoFechaInicio, rangoFechaFin);
    limpiarFormulario();
});

editarVentaBtn.addEventListener("click", async () => {
    if (!ventaSeleccionada) return alert("Selecciona una venta para editar.");
    const nuevoMonto = prompt("Nuevo monto:", ventaSeleccionada.monto);
    if (nuevoMonto != null && !isNaN(nuevoMonto)) {
        await updateDoc(doc(db, "ventas", ventaSeleccionada.id), { monto: Number(nuevoMonto) });
        alert("Venta actualizada.");
        cargarVentas(ventaSeleccionada.sucursal, rangoFechaInicio, rangoFechaFin);
    }
});

eliminarVentaBtn.addEventListener("click", async () => {
    if (!ventaSeleccionada) return alert("Selecciona una venta para eliminar.");
    if (confirm(`¿Eliminar venta del ${ventaSeleccionada.fecha}?`)) {
        await deleteDoc(doc(db, "ventas", ventaSeleccionada.id));
        alert("Venta eliminada.");
        cargarVentas(ventaSeleccionada.sucursal, rangoFechaInicio, rangoFechaFin);
    }
});

logoutButton.addEventListener("click", () => signOut(auth).then(() => window.location.href = "login.html"));
auth.onAuthStateChanged((user) => document.getElementById("userInfoContainer").style.display = user ? "block" : "none");
document.addEventListener("DOMContentLoaded", () => document.getElementById("fecha").value = new Date().toISOString().split('T')[0]);


// ====================== FUNCIONES COMPLEMENTARIAS ======================

// Función para manejar el cambio de sucursal
sucursalSelect.addEventListener("change", (e) => {
    const sucursalSeleccionada = e.target.value;
    if (rangoFechaInicio && rangoFechaFin) {
        cargarVentas(sucursalSeleccionada, rangoFechaInicio, rangoFechaFin);
    }
});

// Función para manejar cierre de sesión completo con ocultar información
logoutButton.addEventListener("click", () => {
    signOut(auth)
        .then(() => {
            document.getElementById("userInfoContainer").style.display = "none";
            document.getElementById("ventasContainer").style.display = "none";
            window.location.href = "login.html";
        })
        .catch((error) => {
            console.error("Error al cerrar sesión:", error);
        });
});

// Función para verificar y mostrar información del usuario autenticado
auth.onAuthStateChanged((user) => {
    const userInfoContainer = document.getElementById("userInfoContainer");
    if (user && userInfoContainer) {
        userInfoContainer.style.display = "block";
        document.getElementById("userEmail").textContent = user.email;
    } else if (userInfoContainer) {
        userInfoContainer.style.display = "none";
    }
});

// Al iniciar, cargar la fecha actual por defecto en el formulario
document.addEventListener("DOMContentLoaded", () => {
    const fechaActual = new Date().toISOString().split('T')[0];
    document.getElementById("fecha").value = fechaActual;

    // Cargar sucursal por defecto si quieres cargar algo inicial
    const sucursalPorDefecto = sucursalSelect.value;
    // cargarVentas(sucursalPorDefecto, fechaActual, fechaActual); // Descomenta si quieres cargar algo al inicio
});
