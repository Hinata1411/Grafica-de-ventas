// ================= IMPORTACIONES =================
import { db, auth, signOut } from "./firebase-config.js";
import { collection, getDocs, query, orderBy, where } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";
import { doc, getDoc } from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js';
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

        mostrarGraficaVentas(fechas, valores, sucursal, colorGrafica);
        mostrarTablaVentas(fechas, valores, sucursal);
        calcularTotalesYPromedios(valores);

    } catch (error) {
        console.error("Error al cargar ventas:", error);
    }
}

// ================= FUNCIONES PARA MOSTRAR =================
function mostrarGraficaVentas(fechas, valores, sucursal, colorGrafica) {
    const ctx = document.getElementById("ventasChart").getContext("2d");
    if (window.miGrafica) window.miGrafica.destroy();

    const totalVentas = valores.reduce((acc, val) => acc + val, 0);
    const promedioVentas = valores.length > 0 ? (totalVentas / valores.length) : 0;

    window.miGrafica = new Chart(ctx, {
        type: 'line',
        data: {
            labels: fechas,
            datasets: [
                {
                    label: `Ventas Diarias en ${sucursal}`,
                    data: valores,
                    borderColor: colorGrafica,
                    backgroundColor: colorGrafica,
                    borderWidth: 3,
                    tension: 0.3,
                    pointBackgroundColor: colorGrafica,
                    pointRadius: 5
                },
                {
                    label: 'Promedio de Ventas',
                    data: Array(valores.length).fill(promedioVentas),
                    borderColor: 'orange',
                    borderWidth: 2,
                    borderDash: [10, 5],
                    pointRadius: 0,
                    datalabels: { display: false }, // ❌ Sin etiquetas promedio
                    tooltip: { enabled: false } // ❌ Sin tooltip promedio
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            layout: {
                padding: { top: 30, right: 15, bottom: 10, left: 15 }
            },
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    labels: {
                        color: '#333',
                        font: { size: 14 },
                        padding: 20
                    }
                },
                datalabels: {
                    display: false // ❌ Ocultar todos los datalabels
                },
                tooltip: {
                    enabled: true,
                    mode: 'index',
                    intersect: false,
                    backgroundColor: '#333',
                    titleFont: { size: 14 },
                    bodyFont: { size: 12 },
                    padding: 10,
                    filter: (tooltipItem) => tooltipItem.dataset.label.includes('Ventas Diarias'), // ✅ Solo ventas diarias
                    callbacks: {
                        label: (tooltipItem) => `Venta: Q${tooltipItem.raw.toLocaleString('es-GT')}`
                    }
                }
            },
            interaction: {
                mode: 'index',
                intersect: false
            },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: { color: '#555' }
                },
                y: {
                    beginAtZero: true,
                    grid: { color: '#ddd' },
                    ticks: {
                        color: '#555',
                        callback: (value) => `Q${value}`
                    }
                }
            }
        }
        // Se ha removido el uso del plugin ChartDataLabels para que no se muestren los datos en cada punto
    });

    // Actualizar cards
    document.getElementById("totalVentas").textContent = totalVentas.toLocaleString('es-GT', { style: 'currency', currency: 'GTQ' });
    document.getElementById("promedioVentas").textContent = promedioVentas.toLocaleString('es-GT', { style: 'currency', currency: 'GTQ' });
}



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
    totalRow.innerHTML = `<td></td><td><strong>Total</strong></td><td><strong>${totalVentas.toLocaleString('es-GT', { style: 'currency', currency: 'GTQ' })}</strong></td>`;
    totalRow.style.backgroundColor = "#f8f9fa";
}

function calcularTotalesYPromedios(valores) {
    const totalVentas = valores.reduce((acc, val) => acc + val, 0);
    const promedioVentas = valores.length > 0 ? (totalVentas / valores.length) : 0;

    document.getElementById("totalVentas").textContent = totalVentas.toLocaleString('es-GT', { style: 'currency', currency: 'GTQ' });
    document.getElementById("promedioVentas").textContent = promedioVentas.toLocaleString('es-GT', { style: 'currency', currency: 'GTQ' });
}

// ================= EVENTOS =================

document.getElementById("verDatos").addEventListener("click", () => {
    const sucursal = document.getElementById("filtroSucursal").value;
    const fechaInicio = document.getElementById("fechaInicio").value;
    const fechaFin = document.getElementById("fechaFin").value;
    cargarVentas(sucursal, fechaInicio, fechaFin);
});

document.getElementById("logoutButton").addEventListener("click", () => {
    signOut(auth).then(() => window.location.href = "index.html").catch((error) => console.error("Error al cerrar sesión:", error));
});

// ✅ Fechas automáticas al cargar
document.addEventListener("DOMContentLoaded", () => {
    const hoy = new Date().toISOString().split('T')[0];
    document.getElementById("fechaInicio").value = hoy;
    document.getElementById("fechaFin").value = hoy;
});

// ================= USUARIO =================

auth.onAuthStateChanged(async (user) => {
  const userInfoContainer = document.getElementById("userInfoContainer");
  const userNameElement = document.getElementById("userName");
  if (user && userInfoContainer && userNameElement) {
    userInfoContainer.style.display = "block";
    try {
      const userDocRef = doc(db, "usuarios", user.uid);
      const docSnap = await getDoc(userDocRef);
      console.log("Datos del usuario:", docSnap.data());
      if (docSnap.exists() && docSnap.data().username) {
        userNameElement.textContent = docSnap.data().username;
      } else {
        // Si no existe el campo 'username', se muestra el correo
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


