// ================= IMPORTACIONES (a nivel superior) =================
import { db } from "./firebase-config.js";
import {
  collection,
  query,
  orderBy,
  where,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs
} from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";
import { doc } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";
// Importar la función de gráficas desde grafica.js
import { initGraficas } from "./grafica.js";

// ================= VARIABLES GLOBALES =================
let ventaSeleccionada = null;
let rangoFechaInicio = null;
let rangoFechaFin = null;

// ================= FUNCIONES DE VENTAS =================

function limpiarFormulario() {
  console.log("Ejecutando limpiarFormulario");
  const ventaForm = document.getElementById("ventaForm");
  if (ventaForm) {
    ventaForm.reset();
    const fechaActual = new Date().toISOString().split("T")[0];
    const fechaElem = document.getElementById("fecha");
    if (fechaElem) {
      fechaElem.value = fechaActual;
      console.log("Se estableció la fecha actual:", fechaActual);
    }
  }
}

async function cargarVentas(sucursal, fechaInicio, fechaFin) {
  console.log("cargarVentas llamada con:", { sucursal, fechaInicio, fechaFin });
  if (!fechaInicio || !fechaFin) {
    alert("Debes ingresar un rango de fechas válido.");
    return;
  }
  let q;
  if (sucursal && sucursal.trim() !== "") {
    q = query(
      collection(db, "ventas"),
      where("sucursal", "==", sucursal),
      where("fecha", ">=", fechaInicio),
      where("fecha", "<=", fechaFin),
      orderBy("fecha")
    );
    console.log("Filtrando por sucursal:", sucursal);
  } else {
    q = query(
      collection(db, "ventas"),
      where("fecha", ">=", fechaInicio),
      where("fecha", "<=", fechaFin),
      orderBy("fecha")
    );
    console.log("Obteniendo ventas de todas las sucursales");
  }
  console.log("Consulta ejecutada:", q);
  try {
    const ventasSnapshot = await getDocs(q);
    console.log("Ventas obtenidas, tamaño:", ventasSnapshot.size);
    const ventasFirestore = ventasSnapshot.docs.map(docSnap => {
      const data = docSnap.data();
      // Convertir campo fecha si viene como Timestamp
      if (data.fecha && typeof data.fecha === "object" && data.fecha.seconds) {
        data.fecha = new Date(data.fecha.seconds * 1000).toISOString().split("T")[0];
      }
      return { ...data, id: docSnap.id };
    });
    console.log("Ventas convertidas:", ventasFirestore);
    const fechas = [];
    const valores = [];
    let fechaIter = new Date(fechaInicio);
    const fechaFinObj = new Date(fechaFin);
    while (fechaIter <= fechaFinObj) {
      const fechaFormateada = fechaIter.toISOString().split("T")[0];
      const etiquetaFecha = fechaFormateada.split("-").reverse().join("/");
      fechas.push(etiquetaFecha);
      const venta = ventasFirestore.find(v => v.fecha === fechaFormateada);
      valores.push(venta ? venta.monto : 0);
      fechaIter.setDate(fechaIter.getDate() + 1);
    }
    console.log("Fechas generadas:", fechas);
    console.log("Valores generados:", valores);
    mostrarTablaVentasConRango(fechas, valores, sucursal, ventasFirestore);
    // Llamar a la función de gráfica importada desde grafica.js
    mostrarGraficaVentas(fechas, valores, sucursal);
    calcularTotalesYPromedios(valores);
  } catch (error) {
    console.error("Error en cargarVentas:", error);
  }
}

function mostrarTablaVentasConRango(etiquetas, valores, sucursal, ventasFirestore) {
  console.log("Mostrando tabla de ventas...");
  const tabla = document.querySelector("#tablaVentas tbody");
  if (!tabla) {
    console.error("No se encontró el tbody de la tabla con id 'tablaVentas'");
    return;
  }
  tabla.innerHTML = "";
  let total = 0;
  etiquetas.forEach((fechaFormateada) => {
    const row = tabla.insertRow();
    row.insertCell(0).textContent = fechaFormateada;
    row.insertCell(1).textContent = sucursal || "Todas";
    const fechaISO = fechaFormateada.split("/").reverse().join("-");
    const ventaExistente = ventasFirestore.find(v => v.fecha === fechaISO);
    if (ventaExistente) {
      row.insertCell(2).textContent = ventaExistente.monto.toLocaleString("es-GT", { style: "currency", currency: "GTQ" });
      total += ventaExistente.monto;
      row.addEventListener("click", () => {
        document.querySelectorAll("#tablaVentas tbody tr").forEach(r => r.classList.remove("table-primary"));
        row.classList.add("table-primary");
        ventaSeleccionada = ventaExistente;
        console.log("Venta seleccionada:", ventaSeleccionada);
      });
    } else {
      row.insertCell(2).innerHTML = "<span style='color: red;'>Venta no ingresada</span>";
    }
  });
  const totalRow = tabla.insertRow();
  totalRow.innerHTML = `<td></td><td><strong>Total</strong></td><td><strong>${total.toLocaleString("es-GT", { style: "currency", currency: "GTQ" })}</strong></td>`;
  console.log("Tabla actualizada, total ventas:", total);
}

function calcularTotalesYPromedios(valores) {
  const totalVentas = valores.reduce((acc, val) => acc + val, 0);
  const promedioVentas = valores.length > 0 ? (totalVentas / valores.length) : 0;
  const totalVentasElem = document.getElementById("totalVentas");
  const promedioVentasElem = document.getElementById("promedioVentas");
  if (totalVentasElem) {
    totalVentasElem.textContent = totalVentas.toLocaleString("es-GT", { style: "currency", currency: "GTQ" });
  }
  if (promedioVentasElem) {
    promedioVentasElem.textContent = promedioVentas.toLocaleString("es-GT", { style: "currency", currency: "GTQ" });
  }
  console.log("Totales y promedios calculados:", { totalVentas, promedioVentas });
}

// ================= INICIALIZACIÓN PARA LA VISTA DE REGISTRO DE VENTAS =================
export function initVentas() {
  console.log("initVentas: Iniciando asignación de eventos en Registro de Ventas");

  const verDatosBtn = document.getElementById("verDatos");
  const ventaForm = document.getElementById("ventaForm");
  const editarVentaBtn = document.getElementById("editarVenta");
  const eliminarVentaBtn = document.getElementById("eliminarVenta");
  const sucursalSelect = document.getElementById("sucursal");
  const filtroSucursalSelect = document.getElementById("filtroSucursal");

  console.log("Elementos encontrados:", { verDatosBtn, ventaForm, editarVentaBtn, eliminarVentaBtn, sucursalSelect, filtroSucursalSelect });

  if (verDatosBtn) {
    verDatosBtn.addEventListener("click", () => {
      console.log("Botón verDatos clickeado");
      const sucursal = document.getElementById("filtroSucursal").value;
      const fechaInicio = document.getElementById("fechaInicio").value;
      const fechaFin = document.getElementById("fechaFin").value;
      console.log("Valores obtenidos:", { sucursal, fechaInicio, fechaFin });
      if (fechaInicio && fechaFin) {
        rangoFechaInicio = fechaInicio;
        rangoFechaFin = fechaFin;
        cargarVentas(sucursal, fechaInicio, fechaFin);
      } else {
        alert("Por favor ingresa un rango de fechas válido.");
      }
    });
  } else {
    console.error("No se encontró el botón verDatos");
  }

  if (ventaForm) {
    ventaForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const fecha = document.getElementById("fecha").value;
      const monto = parseFloat(document.getElementById("monto").value);
      const sucursal = document.getElementById("sucursal").value;
      console.log("Registrando venta:", { fecha, monto, sucursal });
      if (monto <= 0) return alert("El monto debe ser un número positivo.");
      try {
        await addDoc(collection(db, "ventas"), { fecha, monto, sucursal });
        alert("Venta ingresada correctamente");
        cargarVentas(sucursal, rangoFechaInicio, rangoFechaFin);
        limpiarFormulario();
      } catch (error) {
        console.error("Error al agregar venta:", error);
      }
    });
  } else {
    console.error("No se encontró el formulario ventaForm");
  }

  if (editarVentaBtn) {
    editarVentaBtn.addEventListener("click", async () => {
      if (!ventaSeleccionada) return alert("Selecciona una venta para editar.");
      const nuevoMonto = prompt("Nuevo monto:", ventaSeleccionada.monto);
      if (nuevoMonto != null && !isNaN(nuevoMonto)) {
        try {
          await updateDoc(doc(db, "ventas", ventaSeleccionada.id), { monto: Number(nuevoMonto) });
          alert("Venta actualizada.");
          cargarVentas(ventaSeleccionada.sucursal, rangoFechaInicio, rangoFechaFin);
        } catch (error) {
          console.error("Error al actualizar la venta:", error);
        }
      }
    });
  } else {
    console.error("No se encontró el botón editarVenta");
  }

  if (eliminarVentaBtn) {
    eliminarVentaBtn.addEventListener("click", async () => {
      if (!ventaSeleccionada) return alert("Selecciona una venta para eliminar.");
      if (confirm(`¿Eliminar venta del ${ventaSeleccionada.fecha}?`)) {
        try {
          await deleteDoc(doc(db, "ventas", ventaSeleccionada.id));
          alert("Venta eliminada.");
          cargarVentas(ventaSeleccionada.sucursal, rangoFechaInicio, rangoFechaFin);
        } catch (error) {
          console.error("Error al eliminar la venta:", error);
        }
      }
    });
  } else {
    console.error("No se encontró el botón eliminarVenta");
  }

  // Inicializar campos de fecha: primero se resetea el formulario y luego se asigna la fecha actual
  if (ventaForm) {
    ventaForm.reset();
  }
  // Obtener la fecha actual y calcular el primer día del mes actual
  const today = new Date();
  const currentDate = today.toISOString().split("T")[0];
  const firstDayCurrentMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split("T")[0];

  const fechaElem = document.getElementById("fecha");
  const fechaInicioElem = document.getElementById("fechaInicio");
  const fechaFinElem = document.getElementById("fechaFin");
  if (fechaElem) {
    fechaElem.value = currentDate;
    console.log("Fecha inicial establecida:", currentDate);
  }
  if (fechaInicioElem) fechaInicioElem.value = firstDayCurrentMonth;
  if (fechaFinElem) fechaFinElem.value = currentDate;
}

// ================= INICIALIZACIÓN PARA LA VISTA DE VER VENTAS =================
export function initVerVentas() {
  console.log("initVerVentas: Iniciando asignación de eventos para Ver Ventas");

  // Elementos de la vista Ver Ventas (IDs del template verVentasTemplate)
  const verDatosBtnVer = document.getElementById("verDatosVer");
  const filtroSucursalVer = document.getElementById("filtroSucursalVer");
  const fechaInicioVer = document.getElementById("fechaInicioVer");
  const fechaFinVer = document.getElementById("fechaFinVer");

  if (!verDatosBtnVer) console.error("No se encontró el botón verDatosVer en Ver Ventas");
  if (!filtroSucursalVer) console.error("No se encontró el select filtroSucursalVer en Ver Ventas");
  if (!fechaInicioVer) console.error("No se encontró el input fechaInicioVer en Ver Ventas");
  if (!fechaFinVer) console.error("No se encontró el input fechaFinVer en Ver Ventas");

  // Obtener la fecha actual y calcular el primer día del mes actual para la vista de Ver Ventas
  const today = new Date();
  const currentDate = today.toISOString().split("T")[0];
  const firstDayCurrentMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split("T")[0];

  if (fechaInicioVer) fechaInicioVer.value = firstDayCurrentMonth;
  if (fechaFinVer) fechaFinVer.value = currentDate;

  if (verDatosBtnVer) {
    verDatosBtnVer.addEventListener("click", () => {
      const sucursal = filtroSucursalVer.value;
      const fechaInicio = fechaInicioVer.value;
      const fechaFin = fechaFinVer.value;
      console.log("Filtrando ventas en Ver Ventas:", { sucursal, fechaInicio, fechaFin });
      if (fechaInicio && fechaFin) {
        cargarVentasVer(sucursal, fechaInicio, fechaFin);
      } else {
        alert("Por favor ingresa un rango de fechas válido.");
      }
    });
  }
}

async function cargarVentasVer(sucursal, fechaInicio, fechaFin) {
  console.log("cargarVentasVer llamada con:", { sucursal, fechaInicio, fechaFin });
  if (!fechaInicio || !fechaFin) {
    alert("Debes ingresar un rango de fechas válido.");
    return;
  }
  let q;
  if (sucursal && sucursal.trim() !== "") {
    q = query(
      collection(db, "ventas"),
      where("sucursal", "==", sucursal),
      where("fecha", ">=", fechaInicio),
      where("fecha", "<=", fechaFin),
      orderBy("fecha")
    );
    console.log("Filtrando por sucursal en Ver Ventas:", sucursal);
  } else {
    q = query(
      collection(db, "ventas"),
      where("fecha", ">=", fechaInicio),
      where("fecha", "<=", fechaFin),
      orderBy("fecha")
    );
    console.log("Obteniendo ventas de todas las sucursales en Ver Ventas");
  }
  console.log("Consulta ejecutada (Ver Ventas):", q);
  try {
    const ventasSnapshot = await getDocs(q);
    console.log("Ventas obtenidas en Ver Ventas, tamaño:", ventasSnapshot.size);
    const ventasFirestore = ventasSnapshot.docs.map(docSnap => {
      const data = docSnap.data();
      if (data.fecha && typeof data.fecha === "object" && data.fecha.seconds) {
        data.fecha = new Date(data.fecha.seconds * 1000)
          .toISOString()
          .split("T")[0];
      }
      return { ...data, id: docSnap.id };
    });
    console.log("Ventas convertidas en Ver Ventas:", ventasFirestore);
    const fechas = [];
    const valores = [];
    let fechaIter = new Date(fechaInicio);
    const fechaFinObj = new Date(fechaFin);
    while (fechaIter <= fechaFinObj) {
      const fechaFormateada = fechaIter.toISOString().split("T")[0];
      const etiquetaFecha = fechaFormateada.split("-").reverse().join("/");
      fechas.push(etiquetaFecha);
      const venta = ventasFirestore.find(v => v.fecha === fechaFormateada);
      valores.push(venta ? venta.monto : 0);
      fechaIter.setDate(fechaIter.getDate() + 1);
    }
    console.log("Fechas generadas en Ver Ventas:", fechas);
    console.log("Valores generados en Ver Ventas:", valores);
    // Actualizar la tabla de Ver Ventas (tablaVentasVer)
    const tabla = document.querySelector("#tablaVentasVer tbody");
    if (!tabla) {
      console.error("No se encontró el tbody de la tabla con id 'tablaVentasVer'");
      return;
    }
    tabla.innerHTML = "";
    let total = 0;
    fechas.forEach((fechaFormateada) => {
      const row = tabla.insertRow();
      row.insertCell(0).textContent = fechaFormateada;
      row.insertCell(1).textContent = sucursal || "Todas";
      const fechaISO = fechaFormateada.split("/").reverse().join("-");
      const ventaExistente = ventasFirestore.find(v => v.fecha === fechaISO);
      if (ventaExistente) {
        row.insertCell(2).textContent = ventaExistente.monto.toLocaleString("es-GT", { style: "currency", currency: "GTQ" });
        total += ventaExistente.monto;
      } else {
        row.insertCell(2).innerHTML = "<span style='color: red;'>Venta no ingresada</span>";
      }
    });
    // Actualizar bloques de totales y promedios en Ver Ventas
    const totalVentasElem = document.getElementById("totalVentasVer");
    const promedioVentasElem = document.getElementById("promedioVentasVer");
    const totalVentas = valores.reduce((acc, val) => acc + val, 0);
    const promedioVentas = valores.length > 0 ? (totalVentas / valores.length) : 0;
    if (totalVentasElem) {
      totalVentasElem.textContent = totalVentas.toLocaleString("es-GT", { style: "currency", currency: "GTQ" });
    }
    if (promedioVentasElem) {
      promedioVentasElem.textContent = promedioVentas.toLocaleString("es-GT", { style: "currency", currency: "GTQ" });
    }
    console.log("Tabla y bloques actualizados en Ver Ventas");
  } catch (error) {
    console.error("Error en cargarVentasVer:", error);
  }
}
