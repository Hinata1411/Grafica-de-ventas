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
    
        // ✅ Formatear fechas dd/mm
        const fechasFormateadas = fechas.map(fecha => {
            const [dia, mes] = fecha.split('/');
            return `${dia}/${mes}`;
        });
    
        // ✅ Calcular promedio
        const totalVentas = valores.reduce((acc, val) => acc + val, 0);
        const promedioVentas = valores.length > 0 ? (totalVentas / valores.length) : 0;
    
        // ✅ Colores por sucursal
        const coloresSucursales = {
            "Santa Elena": "#28a745",  // Verde
            "Eskala": "#28a745",
            "San Pedro Pinula": "#28a745",
            "Jalapa": "#dc3545",       // Rojo
            "Zacapa": "#fd7e14",       // Naranja
            "Poptún": "#fd7e14"        // Azul
        };
        const colorGrafica = coloresSucursales[sucursal] || "#6c757d";

        // ✅ Contenedor donde va la leyenda
        const leyendaGrafica = document.getElementById("leyendaGrafica");

        // ✅ Insertar leyenda con colores dinámicos
        leyendaGrafica.innerHTML = `
            <span class="legend-label">
                <span class="legend-box" style="background-color: ${colorGrafica};"></span> 
                Ventas Diarias en ${sucursal}
            </span>
            <span class="legend-label">
                <span class="legend-line"></span> 
                Promedio de Ventas
            </span>
        `;

    
        // ✅ Crear gráfica
        window.miGrafica = new Chart(ctx, {
            data: {
                labels: fechasFormateadas,
                datasets: [
                    {
                        label: `Ventas en ${sucursal}`, // ✅ Solo esta leyenda se mostrará
                        data: valores,
                        backgroundColor: colorGrafica,
                        borderColor: colorGrafica,
                        borderWidth: 3,
                        type: "line",
                        tension: 0.3,
                        pointBackgroundColor: colorGrafica,
                        pointRadius: 5,
                        order: 2,
                        datalabels: {
                            display: true, // ✅ Solo para ventas
                            color: 'black',
                            anchor: 'end',
                            align: 'top',
                            formatter: (value) => value > 0 ? 'Q ' + value.toLocaleString('es-GT') : '',
                            font: { weight: 'bold', size: 12 }
                        }
                    },
                    {
                        label: '', // ❌ Sin texto en leyenda
                        data: Array(valores.length).fill(promedioVentas), // Línea recta de promedio
                        type: 'line',
                        borderColor: 'orange',
                        backgroundColor: 'transparent',
                        borderWidth: 2,
                        borderDash: [10, 5], // Línea punteada
                        pointRadius: 0, // Sin puntos
                        order: 1,
                        datalabels: {
                            display: false // ❌ NO mostrar etiquetas en la línea promedio
                        }
                    }
                ]
            },
            options: {
                plugins: {
                    legend: {
                        display: true,
                        labels: {
                            filter: function (legendItem) {
                                // ✅ Ocultar solo línea promedio de la leyenda
                                return legendItem.text !== '';
                            }
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function (context) {
                                let value = context.parsed.y;
                                return 'Q ' + value.toLocaleString('es-GT');
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function (value) {
                                return 'Q ' + value.toLocaleString('es-GT');
                            }
                        }
                    }
                }
            },
            plugins: [ChartDataLabels] // ✅ Activa etiquetas pero controladas por dataset
        });
    
        // ✅ Actualizar cuadros de total y promedio
        document.getElementById("totalVentas").textContent = totalVentas.toLocaleString('es-GT', { style: 'currency', currency: 'GTQ' });
        document.getElementById("promedioVentas").textContent = promedioVentas.toLocaleString('es-GT', { style: 'currency', currency: 'GTQ' });
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
