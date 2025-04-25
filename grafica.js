// grafica.js

// Importar Firebase Firestore (necesario para consultar los datos)
import { db } from "./firebase-config.js";
import {
  collection,
  query,
  orderBy,
  where,
  getDocs
} from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

/**
 * Dibuja la gráfica utilizando Chart.js.
 * @param {Array} fechas - Array de fechas (formateadas para mostrar).
 * @param {Array} valores - Array de montos correspondientes.
 * @param {String} sucursal - Nombre de la sucursal (para etiquetar la gráfica).
 */
export function mostrarGraficaVentas(fechas, valores, sucursal) {
  console.log("Mostrando gráfica de ventas...");
  const canvasElement = document.getElementById("ventasChart");
  if (!canvasElement) {
    console.error("No se encontró el elemento 'ventasChart'. Asegúrate de que esté en el DOM.");
    return;
  }
  const ctx = canvasElement.getContext("2d");
  if (window.miGrafica) window.miGrafica.destroy();

  const coloresSucursales = {
    "Santa Elena": "#28a745",
    "Eskala": "#28a745",
    "San Pedro Pinula": "#28a745",
    "Jalapa": "#dc3545",
    "Zacapa": "#fd7e14",
    "Poptún": "#fd7e14"
  };
  // Selecciona un color según la sucursal, o usa un color por defecto
  const colorGrafica = (sucursal && coloresSucursales[sucursal]) ? coloresSucursales[sucursal] : "#6c757d";

  // Para la gráfica, podemos formatear las fechas (por ejemplo, solo día y mes)
  const fechasFormateadas = fechas.map(fecha => {
    const [dia, mes] = fecha.split("/");
    return `${dia}/${mes}`;
  });

  window.miGrafica = new Chart(ctx, {
    type: "line",
    data: {
      labels: fechasFormateadas,
      datasets: [
        {
          label: `Ventas Diarias en ${sucursal || "Todas"}`,
          data: valores,
          borderColor: colorGrafica,
          backgroundColor: colorGrafica,
          borderWidth: 3,
          tension: 0.3,
          pointBackgroundColor: colorGrafica,
          pointRadius: 5
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      layout: { padding: { top: 30, right: 15, bottom: 10, left: 15 } },
      interaction: { mode: "index", intersect: false },
      plugins: {
        legend: {
          display: true,
          position: "top",
          labels: { color: "#333", font: { size: 14 }, padding: 20 }
        },
        tooltip: {
          enabled: true,
          backgroundColor: "#333",
          titleFont: { size: 14 },
          bodyFont: { size: 12 },
          padding: 10
        }
      },
      scales: {
        x: { grid: { display: false }, ticks: { color: "#555" } },
        y: {
          beginAtZero: true,
          grid: { color: "#ddd" },
          ticks: { color: "#555", callback: value => `Q${value}` }
        }
      }
    }
  });
  console.log("Gráfica actualizada");
}

/**
 * Consulta la colección "ventas" de Firebase según el filtro de sucursal y rango de fechas,
 * construye los arreglos de fechas y valores, y llama a mostrarGraficaVentas().
 * @param {String} sucursal 
 * @param {String} fechaInicio (en formato "YYYY-MM-DD")
 * @param {String} fechaFin (en formato "YYYY-MM-DD")
 */
export async function cargarGraficaVentas(sucursal, fechaInicio, fechaFin) {
  console.log("cargarGraficaVentas llamada con:", { sucursal, fechaInicio, fechaFin });
  
  // Validar el rango de fechas: La fecha fin no puede ser menor que la fecha inicio.
  if (new Date(fechaFin) < new Date(fechaInicio)) {
    alert("Error: El rango de fechas es incorrecto (la fecha fin es menor que la fecha inicio).");
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
    console.log("Filtrando por sucursal en Gráficas:", sucursal);
  } else {
    q = query(
      collection(db, "ventas"),
      where("fecha", ">=", fechaInicio),
      where("fecha", "<=", fechaFin),
      orderBy("fecha")
    );
    console.log("Obteniendo ventas de todas las sucursales en Gráficas");
  }
  console.log("Consulta ejecutada en Gráficas:", q);

  try {
    const ventasSnapshot = await getDocs(q);
    console.log("Ventas obtenidas para la gráfica, tamaño:", ventasSnapshot.size);
    const ventasFirestore = ventasSnapshot.docs.map(docSnap => {
      const data = docSnap.data();
      if (data.fecha && typeof data.fecha === "object" && data.fecha.seconds) {
        data.fecha = new Date(data.fecha.seconds * 1000)
          .toISOString()
          .split("T")[0];
      }
      return { ...data, id: docSnap.id };
    });
    console.log("Ventas convertidas para la gráfica:", ventasFirestore);

    // Construir los arreglos de fechas y montos
    const fechas = [];
    const valoresArray = [];
    let fechaIter = new Date(fechaInicio);
    const fechaFinObj = new Date(fechaFin);
    while (fechaIter <= fechaFinObj) {
      const fechaFormateada = fechaIter.toISOString().split("T")[0];
      // Formateamos la fecha para mostrarla (DD/MM/YYYY)
      const etiquetaFecha = fechaFormateada.split("-").reverse().join("/");
      fechas.push(etiquetaFecha);
      // Buscamos una venta que coincida con la fecha exacta
      const venta = ventasFirestore.find(v => v.fecha === fechaFormateada);
      valoresArray.push(venta ? venta.monto : 0);
      fechaIter.setDate(fechaIter.getDate() + 1);
    }
    console.log("Fechas para gráfica:", fechas);
    console.log("Valores para gráfica:", valoresArray);
    
    // Llamar a la función para dibujar la gráfica con los datos reales obtenidos
    mostrarGraficaVentas(fechas, valoresArray, sucursal);
  } catch (error) {
    console.error("Error en cargarGraficaVentas:", error);
  }
}

/**
 * Función de inicialización para la vista de Gráficas.
 * Se encarga de asignar valores por defecto a los inputs de fecha,
 * agregar el listener al botón de filtrar y cargar la gráfica inicial.
 */
export function initGraficas() {
  console.log("initGraficas: Iniciando asignación de eventos para la vista de Gráficas");
  
  const fechaInicioGrafica = document.getElementById("fechaInicioGrafica");
  const fechaFinGrafica = document.getElementById("fechaFinGrafica");
  const filtroSucursalGrafica = document.getElementById("filtroSucursalGrafica");
  const filtrarGraficaBtn = document.getElementById("filtrarGrafica");
  
  // Calcular la fecha actual y el primer día del mes actual
  const today = new Date();
  const currentDate = today.toISOString().split("T")[0];
  const firstDayCurrentMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split("T")[0];
  
  if (fechaInicioGrafica) fechaInicioGrafica.value = firstDayCurrentMonth;
  if (fechaFinGrafica) fechaFinGrafica.value = currentDate;
  
  if (filtrarGraficaBtn) {
    filtrarGraficaBtn.addEventListener("click", () => {
      const sucursal = filtroSucursalGrafica ? filtroSucursalGrafica.value : "";
      const fechaInicio = fechaInicioGrafica ? fechaInicioGrafica.value : "";
      const fechaFin = fechaFinGrafica ? fechaFinGrafica.value : "";
      console.log("Filtrando gráfica con:", { sucursal, fechaInicio, fechaFin });
      if (!fechaInicio || !fechaFin) {
        alert("Por favor ingresa un rango de fechas válido.");
        return;
      }
      cargarGraficaVentas(sucursal, fechaInicio, fechaFin);
    });
  }
  
  // Cargar la gráfica inicial con el rango de fecha (primer día del mes actual a la fecha actual)
  // cargarGraficaVentas("", firstDayCurrentMonth, currentDate);
}
