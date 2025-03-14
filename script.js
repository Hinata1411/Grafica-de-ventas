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

// Función para limpiar formulario
function limpiarFormulario() {
    ventaForm.reset();
    const fechaActual = new Date().toISOString().split('T')[0];
    document.getElementById("fecha").value = fechaActual;
}

// Función para cargar ventas reales (sin fechas vacías)
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

    mostrarTablaVentas(ventasFirestore);
    mostrarGraficaVentas(ventasFirestore, sucursal);
}

// Mostrar tabla solo con ventas reales
function mostrarTablaVentas(ventas) {
    const tabla = document.querySelector("#tablaVentas tbody");
    tabla.innerHTML = "";
    let total = 0;

    ventas.forEach((venta) => {
        const row = tabla.insertRow();
        row.insertCell(0).textContent = venta.fecha.split('-').reverse().join('/');
        row.insertCell(1).textContent = venta.sucursal;
        row.insertCell(2).textContent = venta.monto.toLocaleString('es-GT', { style: 'currency', currency: 'GTQ' });
        total += venta.monto;

        // Selección de fila
        row.addEventListener("click", () => {
            document.querySelectorAll("#tablaVentas tbody tr").forEach(r => r.classList.remove("table-primary"));
            row.classList.add("table-primary");
            ventaSeleccionada = venta;
        });
    });

    // Total
    const totalRow = tabla.insertRow();
    totalRow.innerHTML = `<td><strong>Total</strong></td><td></td><td><strong>${total.toLocaleString('es-GT', { style: 'currency', currency: 'GTQ' })}</strong></td>`;
}

// Mostrar gráfica solo de ventas reales
function mostrarGraficaVentas(ventas, sucursal) {
    const ctx = document.getElementById("ventasChart").getContext("2d");
    if (window.miGrafica) window.miGrafica.destroy();

    const fechas = ventas.map(v => v.fecha.split('-').reverse().join('/'));
    const montos = ventas.map(v => v.monto);

    window.miGrafica = new Chart(ctx, {
        type: "bar",
        data: {
            labels: fechas,
            datasets: [{
                label: `Ventas en ${sucursal}`,
                data: montos,
                backgroundColor: "#28a745"
            }]
        }
    });
}

// ================= EVENTOS =================

// Evento para ver datos filtrados
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

// Evento para agregar venta
ventaForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const fecha = document.getElementById("fecha").value;
    const monto = parseFloat(document.getElementById("monto").value);
    const sucursal = document.getElementById("sucursal").value;

    if (monto <= 0) return alert("El monto debe ser un número positivo.");

    try {
        await addDoc(collection(db, "ventas"), { fecha, monto, sucursal });
        alert("Venta ingresada correctamente");
        cargarVentas(sucursal, rangoFechaInicio, rangoFechaFin);
        limpiarFormulario();
    } catch (error) {
        console.error("Error al ingresar venta: ", error);
    }
});

// Evento para editar venta
editarVentaBtn.addEventListener("click", async () => {
    if (!ventaSeleccionada) return alert("Selecciona una venta para editar.");
    const nuevoMonto = prompt("Nuevo monto:", ventaSeleccionada.monto);
    if (nuevoMonto != null && !isNaN(nuevoMonto)) {
        try {
            await updateDoc(doc(db, "ventas", ventaSeleccionada.id), { monto: Number(nuevoMonto) });
            alert("Venta actualizada.");
            cargarVentas(ventaSeleccionada.sucursal, rangoFechaInicio, rangoFechaFin);
        } catch (error) {
            console.error("Error al actualizar venta: ", error);
        }
    }
});

// Evento para eliminar venta
eliminarVentaBtn.addEventListener("click", async () => {
    if (!ventaSeleccionada) return alert("Selecciona una venta para eliminar.");
    if (confirm(`¿Eliminar venta del ${ventaSeleccionada.fecha}?`)) {
        try {
            await deleteDoc(doc(db, "ventas", ventaSeleccionada.id));
            alert("Venta eliminada.");
            cargarVentas(ventaSeleccionada.sucursal, rangoFechaInicio, rangoFechaFin);
        } catch (error) {
            console.error("Error al eliminar venta: ", error);
        }
    }
});

// Cerrar sesión
logoutButton.addEventListener("click", () => {
    signOut(auth).then(() => window.location.href = "login.html")
    .catch((error) => console.error("Error al cerrar sesión:", error));
});

// Manejo sesión activa
auth.onAuthStateChanged((user) => {
    const userInfo = document.getElementById("userInfoContainer");
    if (user) {
        userInfo.style.display = "block";
        document.getElementById("userEmail").textContent = user.email;
    } else {
        userInfo.style.display = "none";
    }
});

// Al cargar la página, colocar fecha actual en formulario
document.addEventListener("DOMContentLoaded", () => {
    const fechaActual = new Date().toISOString().split('T')[0];
    document.getElementById("fecha").value = fechaActual;
});
