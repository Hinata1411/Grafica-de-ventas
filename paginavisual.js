// ================= IMPORTACIONES =================

import { db, auth, signOut } from "./firebase-config.js";
import { collection, getDocs, query, orderBy, where } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";


// ================= FUNCIONES =================

// Función para cargar ventas y actualizar la gráfica y tabla
async function cargarVentas(sucursal, fechaInicio = null, fechaFin = null) {
    try {
        if (!fechaInicio || !fechaFin) {
            alert("Por favor ingresa un rango de fechas válido.");
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

        const fechasVentas = ventasFirestore.reduce((obj, venta) => {
            obj[venta.fecha] = venta.monto;
            return obj;
        }, {});

        const fechas = [];
        const valores = [];

        let fechaIter = new Date(fechaInicio);
        const fechaFinal = new Date(fechaFin);

        while (fechaIter <= fechaFinal) {
            const fechaFormateada = fechaIter.toISOString().split('T')[0];
            const [anio, mes, dia] = fechaFormateada.split('-');
            const etiquetaFecha = `${dia}/${mes}`; // ✅ Fecha como dd/mm

            fechas.push(etiquetaFecha);
            valores.push(fechasVentas[fechaFormateada] || 0);

            fechaIter.setDate(fechaIter.getDate() + 1);
        }

        const coloresSucursales = {
            "Santa Elena": "#28a745",
            "Eskala": "#28a745",
            "San Pedro Pinula": "#28a745",
            "Jalapa": "#dc3545",
            "Zacapa": "#fd7e14",
            "Poptún": "#fd7e14"
        };
        const colorGrafica = coloresSucursales[sucursal] || "#007bff";

        // Mostrar gráfica, tabla y resumen
        mostrarGraficaVentas(fechas, valores, sucursal, colorGrafica);
        mostrarTablaVentas(fechas, valores, sucursal);
        calcularTotalesYPromedios(valores);

    } catch (error) {
        console.error("Error al cargar ventas:", error);
    }
}


// ================= FUNCIONES PARA MOSTRAR =================

// Gráfica de ventas con línea promedio (sin etiquetas de promedio)
function mostrarGraficaVentas(fechas, valores, sucursal, colorGrafica) {
    const ctx = document.getElementById("ventasChart").getContext("2d");
    if (window.miGrafica) window.miGrafica.destroy();

    // Calcular promedio
    const totalVentas = valores.reduce((acc, val) => acc + val, 0);
    const promedioVentas = valores.length > 0 ? (totalVentas / valores.length) : 0;

    window.miGrafica = new Chart(ctx, {
        data: {
            labels: fechas,
            datasets: [
                {
                    label: `Ventas Diarias en ${sucursal}`,
                    data: valores,
                    backgroundColor: colorGrafica,
                    borderColor: colorGrafica,
                    borderWidth: 3,
                    type: "line",
                    tension: 0.3,
                    pointBackgroundColor: colorGrafica,
                    pointRadius: 5,
                    datalabels: {
                        display: true, // ✅ Mostrar solo en ventas
                        color: 'black',
                        anchor: 'end',
                        align: 'top',
                        formatter: (value) => value > 0 ? 'Q ' + value.toLocaleString('es-GT') : '',
                        font: { weight: 'bold', size: 12 }
                    }
                },
                {
                    label: '', // ❌ Sin leyenda
                    data: Array(valores.length).fill(promedioVentas), // Línea de promedio
                    type: 'line',
                    borderColor: 'orange',
                    backgroundColor: 'transparent',
                    borderWidth: 2,
                    borderDash: [10, 5],
                    pointRadius: 0,
                    datalabels: { display: false } // ❌ No mostrar valores
                }
            ]
        },
        options: {
            plugins: {
                legend: {
                    display: true,
                    labels: {
                        filter: (legendItem) => legendItem.text !== '' // ❌ Quitar línea promedio
                    }
                },
                tooltip: {
                    callbacks: {
                        label: (context) => 'Q ' + context.parsed.y.toLocaleString('es-GT')
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: (value) => 'Q ' + value.toLocaleString('es-GT')
                    }
                }
            }
        },
        plugins: [ChartDataLabels] // ✅ Usar plugin de etiquetas
    });
}

// Tabla de ventas
function mostrarTablaVentas(fechas, valores, sucursal) {
    const tablaVentasBody = document.querySelector("#tablaVentas tbody");
    tablaVentasBody.innerHTML = "";

    let totalVentas = 0;

    fechas.forEach((fecha, index) => {
        const row = tablaVentasBody.insertRow();
        row.insertCell(0).textContent = fecha;
        row.insertCell(1).textContent = sucursal;

        if (valores[index] > 0) {
            row.insertCell(2).textContent = valores[index].toLocaleString('es-GT', { style: 'currency', currency: 'GTQ' });
            totalVentas += valores[index];
        } else {
            const cell = row.insertCell(2);
            cell.innerHTML = "<span style='color: red;'>Ventas no ingresadas</span>";
        }
    });

    const totalRow = tablaVentasBody.insertRow();
    totalRow.insertCell(0).innerHTML = "<strong>Total</strong>";
    totalRow.insertCell(1).textContent = "";
    totalRow.insertCell(2).innerHTML = `<strong>${totalVentas.toLocaleString('es-GT', { style: 'currency', currency: 'GTQ' })}</strong>`;
    totalRow.style.backgroundColor = "#f8f9fa";
}

// Cuadros de resumen total y promedio
function calcularTotalesYPromedios(valores) {
    const totalVentas = valores.reduce((acc, val) => acc + val, 0);
    const promedioVentas = valores.length > 0 ? (totalVentas / valores.length) : 0;

    document.getElementById("totalVentas").textContent = totalVentas.toLocaleString('es-GT', { style: 'currency', currency: 'GTQ' });
    document.getElementById("promedioVentas").textContent = promedioVentas.toLocaleString('es-GT', { style: 'currency', currency: 'GTQ' });
}


// ================= EVENTOS =================

// Botón para ver datos
const verDatosBtn = document.getElementById("verDatos");
if (verDatosBtn) {
    verDatosBtn.addEventListener("click", () => {
        const sucursal = document.getElementById("filtroSucursal").value;
        const fechaInicio = document.getElementById("fechaInicio").value;
        const fechaFin = document.getElementById("fechaFin").value;
        cargarVentas(sucursal, fechaInicio, fechaFin);
    });
}

// Botón cerrar sesión
const logoutButton = document.getElementById("logoutButton");
if (logoutButton) {
    logoutButton.addEventListener("click", () => {
        signOut(auth).then(() => {
            window.location.href = "login.html";
        }).catch((error) => console.error("Error al cerrar sesión:", error));
    });
}

// Mostrar usuario logueado
auth.onAuthStateChanged((user) => {
    const userInfoContainer = document.getElementById("userInfoContainer");
    if (user && userInfoContainer) {
        userInfoContainer.style.display = "block";
        document.getElementById("userEmail").textContent = user.email;
    } else if (userInfoContainer) {
        userInfoContainer.style.display = "none";
    }
});
