// Importar la referencia a la base de datos desde el archivo firebase-config.js
import { db } from "./firebase-config.js";
import { collection, addDoc, getDocs, query, orderBy, where, doc, updateDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

// Función para guardar una venta
document.getElementById("ventaForm").addEventListener("submit", async (e) => {
    e.preventDefault();

    const fecha = document.getElementById("fecha").value;
    const monto = document.getElementById("monto").value;
    const sucursal = document.getElementById("sucursal").value;

    if (fecha && monto) {
        try {
            await addDoc(collection(db, "ventas"), { fecha, monto: Number(monto), sucursal });
            alert("Venta ingresada correctamente");
            cargarVentas(sucursal);  // Cargar ventas filtradas por sucursal
        } catch (error) {
            console.error("Error al ingresar la venta: ", error);
        }
    }
});

// Función para cargar ventas y actualizar la gráfica
async function cargarVentas(sucursal, fechaInicio = null, fechaFin = null) {
    try {
        let q = query(collection(db, "ventas"), where("sucursal", "==", sucursal), orderBy("fecha"));

        // Filtrar por fechas si se proporcionaron
        if (fechaInicio && fechaFin) {
            q = query(
                collection(db, "ventas"),
                where("sucursal", "==", sucursal),
                where("fecha", ">=", fechaInicio),
                where("fecha", "<=", fechaFin),
                orderBy("fecha")
            );
        }

        const ventas = await getDocs(q);
        const datos = ventas.docs.map(doc => ({ ...doc.data(), id: doc.id })); // Añadir el id

        const etiquetas = datos.map(d => d.fecha);
        const valores = datos.map(d => d.monto);

        const ctx = document.getElementById("ventasChart").getContext("2d");
        if (window.miGrafica) window.miGrafica.destroy();

        window.miGrafica = new Chart(ctx, {
            type: "line",
            data: {
                labels: etiquetas,
                datasets: [{
                    label: `Ventas Diarias en ${sucursal}`,
                    data: valores,
                    borderColor: "#007bff",
                    backgroundColor: "rgba(0, 123, 255, 0.2)",
                    fill: true,
                    tension: 0.3
                }]
            }
        });

        // Mostrar las ventas en la tabla
        mostrarTablaVentas(datos);

    } catch (error) {
        console.error("Error al cargar ventas: ", error);
    }
}



let ventaSeleccionada = null; // Variable para almacenar la venta seleccionada

// Mostrar ventas en la tabla
function mostrarTablaVentas(ventas) {
    const tablaVentas = document.getElementById("tablaVentas").getElementsByTagName("tbody")[0];
    tablaVentas.innerHTML = ""; // Limpiar contenido actual

    ventas.forEach((venta, index) => {
        const row = tablaVentas.insertRow();
        row.insertCell(0).textContent = venta.fecha;
        row.insertCell(1).textContent = venta.sucursal;
        row.insertCell(2).textContent = venta.monto;

        // Añadir evento para seleccionar la fila
        row.onclick = () => seleccionarFila(row, venta);
    });
}

// Función para marcar una fila como seleccionada
function seleccionarFila(row, venta) {
    // Desmarcar la fila previamente seleccionada
    if (ventaSeleccionada) {
        ventaSeleccionada.classList.remove('table-primary');
    }

    // Marcar la fila seleccionada
    row.classList.add('table-primary');
    ventaSeleccionada = row;
    ventaSeleccionada.venta = venta; // Guardar la venta asociada a la fila seleccionada
}


// Función para editar una venta
document.getElementById("editarVenta").addEventListener("click", async () => {
    if (!ventaSeleccionada) {
        alert("Por favor, selecciona una venta de la tabla.");
        return;
    }

    const nuevoMonto = prompt("Ingresa el nuevo monto para la venta", ventaSeleccionada.venta.monto);

    if (nuevoMonto != null && !isNaN(nuevoMonto) && nuevoMonto !== "") {
        // Actualizar el monto de la venta en la base de datos
        try {
            const ventaRef = doc(db, "ventas", ventaSeleccionada.venta.id); // Usar el id de la venta
            await updateDoc(ventaRef, {
                monto: Number(nuevoMonto)
            });
            alert("Venta actualizada correctamente");
            cargarVentas(ventaSeleccionada.venta.sucursal); // Recargar las ventas de la sucursal
        } catch (error) {
            console.error("Error al actualizar la venta: ", error);
        }
    }
});



// Función para eliminar una venta
document.getElementById("eliminarVenta").addEventListener("click", async () => {
    if (!ventaSeleccionada) {
        alert("Por favor, selecciona una venta de la tabla.");
        return;
    }

    const confirmacion = confirm(`¿Estás seguro de que deseas eliminar la venta de ${ventaSeleccionada.venta.fecha} en ${ventaSeleccionada.venta.sucursal}?`);

    if (confirmacion) {
        try {
            // Eliminar la venta de la base de datos
            const ventaRef = doc(db, "ventas", ventaSeleccionada.venta.id); // Usar el id de la venta
            await deleteDoc(ventaRef);
            alert("Venta eliminada correctamente");
            cargarVentas(ventaSeleccionada.venta.sucursal); // Recargar las ventas de la sucursal
        } catch (error) {
            console.error("Error al eliminar la venta: ", error);
        }
    }
});


// Función para manejar el cambio de sucursal
document.getElementById("sucursal").addEventListener("change", (e) => {
    const sucursalSeleccionada = e.target.value;
    cargarVentas(sucursalSeleccionada);  // Recargar las ventas filtradas por la sucursal seleccionada
});

// Función para ver los datos filtrados por fecha y sucursal
document.getElementById("verDatos").addEventListener("click", () => {
    const sucursal = document.getElementById("filtroSucursal").value;
    const fechaInicio = document.getElementById("fechaInicio").value;
    const fechaFin = document.getElementById("fechaFin").value;

    // Validar las fechas
    if (fechaInicio && fechaFin) {
        cargarVentas(sucursal, fechaInicio, fechaFin);  // Cargar las ventas filtradas por sucursal y fechas
    } else {
        alert("Por favor ingresa un rango de fechas válido.");
    }
});

// Cargar la gráfica y la tabla al iniciar con la sucursal seleccionada (por defecto)
document.addEventListener("DOMContentLoaded", () => {
    const sucursalPorDefecto = document.getElementById("sucursal").value;  // Sucursal por defecto (primero)
    cargarVentas(sucursalPorDefecto);  // Cargar ventas de la sucursal por defecto
});

document.addEventListener("DOMContentLoaded", () => {
    // Obtener la fecha actual
    const fechaActual = new Date();

    // Formatear la fecha en formato YYYY-MM-DD para el campo de fecha
    const fechaFormatted = fechaActual.toISOString().split('T')[0]; // Esto dará la fecha en formato "YYYY-MM-DD"

    // Establecer la fecha actual en el campo de fecha del formulario
    document.getElementById("fecha").value = fechaFormatted;

    // Cargar ventas de la sucursal seleccionada (si es necesario)
    cargarVentas(document.getElementById("sucursal").value); // Esto es solo si es necesario, ya que se debe cargar la sucursal inicialmente
});

