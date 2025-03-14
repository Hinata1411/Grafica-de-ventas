// ================= IMPORTACIONES =================
import { db, auth, signOut } from "./firebase-config.js";
import { collection, getDocs, query, orderBy, where, doc, getDoc } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

// ================= FUNCIONES =================

// Función principal para cargar ventas y actualizar gráfica, tabla y resumen
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
            const etiquetaFecha = `${dia}/${mes}`;

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

        // Mostrar todo
        mostrarGraficaVentas(fechas, valores, sucursal, colorGrafica);
        mostrarTablaVentas(fechas, valores, sucursal);
        calcularTotalesYPromedios(valores);

    } catch (error) {
        console.error("Error al cargar ventas:", error);
    }
}

// ================= FUNCIONES PARA MOSTRAR =================

// ✅ Gráfica con línea promedio y título + leyenda en la misma línea
function mostrarGraficaVentas(fechas, valores, sucursal, colorGrafica) {
    const ctx = document.getElementById("ventasChart").getContext("2d");
    if (window.miGrafica) window.miGrafica.destroy();

    const totalVentas = valores.reduce((acc, val) => acc + val, 0);
    const promedioVentas = valores.length > 0 ? (totalVentas / valores.length) : 0;

        // ✅ Contenedor donde va la leyenda
    const tituloGrafica = document.getElementById("tituloGrafica");

    // ✅ Insertar leyenda dinámica con color de la sucursal
    tituloGrafica.innerHTML = `
        <span class="legend-label">
            <span class="legend-box" style="background-color: ${colorGrafica};"></span> 
            Ventas Diarias en ${sucursal}
        </span>
        <span class="legend-label">
            <span class="legend-line"></span> 
            Promedio de Ventas
        </span>
    `;

    // Crear la gráfica
    window.miGrafica = new Chart(ctx, {
        type: 'line',
        data: {
            labels: fechas,
            datasets: [
                {
                    label: `Ventas Diarias`,
                    data: valores,
                    borderColor: colorGrafica,
                    backgroundColor: colorGrafica,
                    borderWidth: 3,
                    tension: 0.3,
                    pointBackgroundColor: colorGrafica,
                    pointRadius: 5,
                    datalabels: {
                        display: true,
                        color: 'black',
                        anchor: 'end',
                        align: 'top',
                        formatter: (value) => value > 0 ? 'Q ' + value.toLocaleString('es-GT') : '',
                        font: { weight: 'bold', size: 12 }
                    }
                },
                {
                    label: '',
                    data: Array(valores.length).fill(promedioVentas),
                    borderColor: 'orange',
                    borderWidth: 2,
                    borderDash: [10, 5],
                    pointRadius: 0,
                    type: 'line',
                    datalabels: { display: false }
                }
            ]
        },
        options: {
            plugins: {
                legend: { display: false }, // No leyenda automática
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
        plugins: [ChartDataLabels]
    });
}


// ✅ Tabla de ventas
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
            row.insertCell(2).innerHTML = "<span style='color: red;'>Ventas no ingresadas</span>";
        }
    });

    const totalRow = tablaVentasBody.insertRow();
    totalRow.innerHTML = `<td><strong>Total</strong></td><td></td><td><strong>${totalVentas.toLocaleString('es-GT', { style: 'currency', currency: 'GTQ' })}</strong></td>`;
    totalRow.style.backgroundColor = "#f8f9fa";
}


// ✅ Resumen de total y promedio
function calcularTotalesYPromedios(valores) {
    const totalVentas = valores.reduce((acc, val) => acc + val, 0);
    const promedioVentas = valores.length > 0 ? (totalVentas / valores.length) : 0;

    document.getElementById("totalVentas").textContent = totalVentas.toLocaleString('es-GT', { style: 'currency', currency: 'GTQ' });
    document.getElementById("promedioVentas").textContent = promedioVentas.toLocaleString('es-GT', { style: 'currency', currency: 'GTQ' });
}


// ================= EVENTOS =================

// Botón para consultar datos
document.getElementById("verDatos").addEventListener("click", () => {
    const sucursal = document.getElementById("filtroSucursal").value;
    const fechaInicio = document.getElementById("fechaInicio").value;
    const fechaFin = document.getElementById("fechaFin").value;
    cargarVentas(sucursal, fechaInicio, fechaFin);
});

// Botón cerrar sesión
document.getElementById("logoutButton").addEventListener("click", () => {
    signOut(auth).then(() => window.location.href = "login.html").catch((error) => console.error("Error al cerrar sesión:", error));
});

// ================= USUARIO =================

// Mostrar usuario logueado
auth.onAuthStateChanged(async (user) => {
    const userInfoContainer = document.getElementById("userInfoContainer");
    const userEmailElement = document.getElementById("userEmail");
    if (user && userInfoContainer) {
        userInfoContainer.style.display = "flex";
        userEmailElement.textContent = user.email;
    }
});
