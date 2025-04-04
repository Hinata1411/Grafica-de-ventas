import { db } from "./firebase-config.js";
import { collection, query, where, orderBy, getDocs, getDoc, updateDoc, deleteDoc, doc } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js";

const loggedUserRole = (localStorage.getItem("loggedUserRole") || "").toLowerCase();
let tablaCierres;

$(document).ready(function () {
  tablaCierres = $("#tablaCierres").DataTable({
    language: { url: "https://cdn.datatables.net/plug-ins/1.13.4/i18n/es-ES.json" },
    order: [[0, "desc"]],
    responsive: true
  });
  cargarCierres();
  $("#filtroFecha").on("change", cargarCierres);
});

async function cargarCierres() {
  const filtroFecha = document.getElementById("filtroFecha").value;
  let cierresQuery = filtroFecha ?
    query(collection(db, "cierres"), where("fechaCierre", "==", filtroFecha)) :
    query(collection(db, "cierres"), orderBy("fechaCierre", "desc"));

  const snapshot = await getDocs(cierresQuery);
  tablaCierres.clear();

  snapshot.forEach((docSnap) => {
    const cierre = docSnap.data();
    cierre.id = docSnap.id;

    const fechaHora = `${cierre.fechaCierre} ${cierre.horaCierre || ""}`;

    const montoApertura = Number(cierre.montoApertura || 0);
    const totalEfectivo = Number(cierre.totalEfectivo || 0);
    const totalIngresado = Number(cierre.totalIngresado || 0);
    const totalEfectivoSistema = montoApertura + totalEfectivo;

    const diferenciaCalculada = totalEfectivoSistema - totalIngresado;

    let acciones = `<button class="btn btn-sm btn-info" onclick="verDetalleCierre('${docSnap.id}')">VER</button>`;
    if (loggedUserRole === "admin") {
      acciones += ` <button class="btn btn-sm btn-warning" onclick="anularCierre('${docSnap.id}')">ANULAR</button>`;
      acciones += ` <button class="btn btn-sm btn-danger" onclick="eliminarCierre('${docSnap.id}')">ELIMINAR</button>`;
    }

    tablaCierres.row.add([
      fechaHora,
      cierre.usuario,
      "Q " + Number(cierre.totalGeneral || 0).toFixed(2),
      "Q " + montoApertura.toFixed(2),
      "Q " + totalEfectivoSistema.toFixed(2),
      "Q " + totalIngresado.toFixed(2),
      "Q " + diferenciaCalculada.toFixed(2),
      acciones
    ]);
  });

  tablaCierres.draw();
}

window.verDetalleCierre = async function (cierreId) {
  console.log("Buscando cierre con id:", cierreId);
  const cierreDoc = await getDoc(doc(db, "cierres", cierreId));
  if (!cierreDoc.exists()) {
    console.error("Cierre no encontrado:", cierreId);
    return Swal.fire("Error", "Cierre no encontrado.", "error");
  }
  const cierre = cierreDoc.data();
  console.log("Datos del cierre:", cierre);
  
  // Verificar que el cierre tenga asignado el idApertura
  if (!cierre.idApertura) {
    console.error("El cierre no tiene idApertura asignado:", cierre);
    return Swal.fire("Error", "El cierre no tiene ID de apertura asociado.", "error");
  }
  
  // Convertir la fecha a formato dd/mm/yyyy
  const fechaFormateada = new Date(cierre.fechaCierre).toLocaleDateString("es-ES");

  // Consultar las ventas asociadas al idApertura del cierre
  const ventasQuery = query(
    collection(db, "ventas"),
    where("idApertura", "==", cierre.idApertura)
  );
  
  const ventasSnapshot = await getDocs(ventasQuery);
  console.log("Cantidad de ventas encontradas:", ventasSnapshot.docs.length);

  let totalEfectivo = 0,
      totalTarjeta = 0,
      totalTransferencia = 0,
      totalLinea = 0;
  let ventasDetalle = "";
  // Construir el detalle de ventas con la columna Número de referencia
  ventasSnapshot.forEach((v, index) => {
    const venta = v.data();
    const monto = Number(venta.total || 0);
    const metodo = venta.metodo_pago?.toLowerCase();
    
    if (metodo === "efectivo") totalEfectivo += monto;
    else if (metodo === "tarjeta") totalTarjeta += monto;
    else if (metodo === "transferencia") totalTransferencia += monto;
    else if (metodo === "en línea" || metodo === "en linea") totalLinea += monto;

    let referencia = "-";
    if (metodo === "tarjeta" || metodo === "transferencia" || metodo === "en línea" || metodo === "en linea") {
      referencia = venta.numeroReferencia || "-";
    }
    
    ventasDetalle += `
      <tr>
        <td>${venta.idVenta || index + 1}</td>
        <td>${venta.metodo_pago || '-'}</td>
        <td>${referencia}</td>
        <td>Q ${monto.toFixed(2)}</td>
        <td>${venta.empleadoNombre || '-'}</td>
      </tr>`;
  });

  // Calcular el Total Efectivo (Sistema): fondo de apertura + ventas en efectivo
  const totalEfectivoSistema = Number(cierre.montoApertura || 0) + totalEfectivo;
  const totalIngresado = Number(cierre.totalIngresado || 0);
  const diferencia = totalEfectivoSistema - totalIngresado;
  const colorDiferencia = diferencia < 0 ? 'text-rojo' : 'text-verde';

  const detalleHTML = `
    <div>
      <!-- Encabezado: Izquierda (alineado a la izquierda): ID Cierre, Fecha, Hora, Lugar. Derecha: Monto de Apertura -->
      <div style="display: flex; justify-content: space-between; margin-bottom: 1rem;">
        <div style="text-align: left;">
          <strong>ID Cierre:</strong> ${cierreId}<br>
          <strong>Fecha:</strong> ${fechaFormateada}<br>
          <strong>Hora:</strong> ${cierre.horaCierre || '-'}<br>
          <strong>Lugar:</strong> ${cierre.usuario || '-'}
        </div>
        <div>
          <strong>Monto de Apertura:</strong> Q ${Number(cierre.montoApertura || 0).toFixed(2)}
        </div>
      </div>
      
      <!-- Resumen de Ventas con venta total en una misma tabla -->
      <h5 class="mt-3">Resumen de Ventas</h5>
      <table class="table table-bordered">
        <thead>
          <tr>
            <th>Efectivo</th>
            <th>Tarjeta</th>
            <th>Transferencia</th>
            <th>Línea</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Q ${totalEfectivo.toFixed(2)}</td>
            <td>Q ${totalTarjeta.toFixed(2)}</td>
            <td>Q ${totalTransferencia.toFixed(2)}</td>
            <td>Q ${totalLinea.toFixed(2)}</td>
            <td>Q ${(totalEfectivo + totalTarjeta + totalTransferencia + totalLinea).toFixed(2)}</td>
          </tr>
        </tbody>
      </table>
      
      <!-- Totales -->
      <h5 class="mt-3">Totales</h5>
      <table class="table table-bordered">
        <thead>
          <tr>
            <th>Total efectivo</th>
            <th>Arqueo</th>
            <th>Diferencia</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Q ${totalEfectivoSistema.toFixed(2)}</td>
            <td>Q ${totalIngresado.toFixed(2)}</td>
            <td><span class="${colorDiferencia}">Q ${diferencia.toFixed(2)}</span></td>
          </tr>
        </tbody>
      </table>
      
      <!-- Ventas Detalladas -->
      <h5 class="mt-3">Ventas Detalladas</h5>
      <table class="table table-bordered">
        <thead>
          <tr>
            <th>Id venta</th>
            <th>Método de pago</th>
            <th>Número de referencia</th>
            <th>Monto</th>
            <th>Vendedor</th>
          </tr>
        </thead>
        <tbody>
          ${ventasDetalle || '<tr><td colspan="5">No se encontraron ventas</td></tr>'}
        </tbody>
      </table>
    </div>`;

  Swal.fire({ title: "Detalle del Cierre", html: detalleHTML, width: "90%" });
};

window.anularCierre = async (id) => {
  await updateDoc(doc(db, "cierres", id), { estado: "ANULADA" });
  cargarCierres();
};

window.eliminarCierre = async (id) => {
  await deleteDoc(doc(db, "cierres", id));
  cargarCierres();
};
