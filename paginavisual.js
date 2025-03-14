// Importar referencias necesarias desde firebase-config.js
import { db, auth, signOut } from "./firebase-config.js";
import { collection, getDocs, query, orderBy, where } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

// Función para cargar ventas y actualizar la gráfica
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

        const fechaActual = new Date(fechaInicio);
        const fechaFinal = new Date(fechaFin);

        while (fechaInicio <= fechaFin) {
            const fechaFormateada = new Date(fechaInicio).toISOString().split('T')[0];
            const [anio, mes, dia] = fechaInicio.split('-');
            const etiquetaFecha = `${dia}/${mes}`;

            fechasVentas[fechaInicio] ? valores.push(fechasVentas[fechaInicio]) : valores.push(0);
            fechas.push(etiquetaFecha);

            fechaInicio = new Date(fechaInicio);
            fechaInicio.setDate(fechaInicio.getDate() + 1);
            fechaInicio = fechaInicio.toISOString().split('T')[0];
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

        const ctx = document.getElementById("ventasChart").getContext("2d");
        if (window.miGrafica) window.miGrafica.destroy();

        window.miGrafica = new Chart(ctx, {
            type: "bar",
            data: {
                labels: fechas,
                datasets: [{
                    label: `Ventas Diarias en ${sucursal}`,
                    data: valores,
                    borderColor: colorGrafica,
                    backgroundColor: colorGrafica,
                    borderWidth: 1
                }]
            }
        });

        mostrarTablaVentas(fechas, valores, sucursal);

    } catch (error) {
        console.error("Error al cargar ventas:", error);
    }
}

// Mostrar ventas en la tabla
function mostrarTablaVentas(fechas, valores, sucursal) {
    const tablaVentasBody = document.querySelector("#tablaVentas tbody");
    tablaVentasBody.innerHTML = "";

    let totalVentas = 0;

    fechas.forEach((fecha, index) => {
        const row = tablaVentasBody.insertRow();
        row.insertCell(0).textContent = fechas[index];
        row.insertCell(1).textContent = sucursal;
        row.insertCell(2).textContent = valores[index].toLocaleString('es-GT', { style: 'currency', currency: 'GTQ' });
        totalVentas += valores[index];
    });

    const totalRow = tablaVentasBody.insertRow();
    totalRow.insertCell(0).textContent = "Total";
    totalRow.insertCell(1).textContent = "";
    totalRow.insertCell(2).textContent = totalVentas.toLocaleString('es-GT', { style: 'currency', currency: 'GTQ' });
    totalRow.style.fontWeight = "bold";
    totalRow.style.backgroundColor = "#f8f9fa";
}

// Evento click para ver datos
const verDatosBtn = document.getElementById("verDatos");
if (verDatosBtn) {
    verDatosBtn.addEventListener("click", () => {
        const sucursal = document.getElementById("filtroSucursal").value;
        const fechaInicio = document.getElementById("fechaInicio").value;
        const fechaFin = document.getElementById("fechaFin").value;

        cargarVentas(sucursal, fechaInicio, fechaFin);
    });
}

// Manejo cierre de sesión
const logoutButton = document.getElementById("logoutButton");
if (logoutButton) {
    logoutButton.addEventListener("click", () => {
        signOut(auth).then(() => {
            window.location.href = "login.html";
        }).catch((error) => {
            console.error("Error al cerrar sesión:", error);
        });
    });
}

auth.onAuthStateChanged((user) => {
    const userInfoContainer = document.getElementById("userInfoContainer");
    if (user && userInfoContainer) {
        userInfoContainer.style.display = "block";
        document.getElementById("userEmail").textContent = user.email;
    } else if (userInfoContainer) {
        userInfoContainer.style.display = "none";
    }
});
