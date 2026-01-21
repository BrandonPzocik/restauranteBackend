import { apiCall } from '../api.js';

export function initCajero() {
  loadTodasLasMesas();
  setupCajeroEvents();
}

async function loadTodasLasMesas() {
  try {
    const mesas = await apiCall('/cajero/todas-mesas');
    const container = document.getElementById('mesas-activas-cajero');
    
    if (!container) return;
    
    if (mesas.length === 0) {
      container.innerHTML = '<p>📭 No hay mesas registradas</p>';
      return;
    }
    
    container.innerHTML = mesas.map(m => {
      const estadoColor = {
        'pendiente': '#ffc107',
        'preparando': '#17a2b8',
        'listo': '#28a745',
        'servido': '#6c757d',
        'cobrado': '#28a745'
      };
      
      return `
        <div class="mesa-item" style="padding: 16px; border: 2px solid ${estadoColor[m.estado] || '#6c757d'}; border-radius: 8px; margin-bottom: 12px;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <div>
              <strong>Mesa ${m.numero}</strong><br>
              <small>Mozo: ${m.mozo_nombre}</small><br>
              <span style="background: ${estadoColor[m.estado] || '#6c757d'}; color: white; padding: 2px 8px; border-radius: 4px; font-size: 12px;">
                ${m.estado}
              </span>
            </div>
            <div style="text-align: right;">
              <div style="font-size: 16px; color: #28a745; font-weight: bold;">
                $${Number(m.total || 0).toFixed(2)}
              </div>
              ${m.estado !== 'cobrado' ? 
                `<button onclick="abrirCierreMesa(${m.id}, ${m.numero})" style="margin-top: 8px; background: #007bff; color: white; border: none; padding: 8px 16px; border-radius: 4px;">Cerrar cuenta</button>` : 
                '<span style="color: #28a745;">✅ Cobrado</span>'
              }
            </div>
          </div>
        </div>
      `;
    }).join('');
  } catch (err) {
    console.error('Error al cargar mesas:', err);
    const container = document.getElementById('mesas-activas-cajero');
    if (container) {
      container.innerHTML = '<p>❌ Error al cargar mesas</p>';
    }
  }
}

window.abrirCierreMesa = async function(mesaId, mesaNumero) {
  try {
    const platos = await apiCall(`/cajero/mesa/${mesaId}`);
    
    if (platos.length === 0) {
      alert('No hay platos en esta mesa');
      return;
    }
    
    const subtotal = platos.reduce((sum, p) => sum + (p.precio * p.cantidad), 0);
    const impuestos = subtotal * 0.21;
    const total = subtotal + impuestos;
    
    let ticketHTML = `
      <div style="text-align:right;">${new Date().toLocaleString()}</div>
      <div style="text-align:center; font-weight:bold; margin:10px 0;">Mesa ${mesaNumero}</div>
      <div style="border-top:1px dashed #000; margin:10px 0;"></div>
    `;
    
    platos.forEach(p => {
      const linea = `${p.cantidad}x ${p.nombre}${p.observaciones ? ` (${p.observaciones})` : ''}`;
      const totalLinea = `$${(p.precio * p.cantidad).toFixed(2)}`;
      ticketHTML += `<div style="display:flex; justify-content:space-between;"><span>${linea}</span><span>${totalLinea}</span></div>`;
    });
    
    ticketHTML += `
      <div style="border-top:1px dashed #000; margin:10px 0;"></div>
      <div style="display:flex; justify-content:space-between;"><span>Subtotal:</span><span>$${subtotal.toFixed(2)}</span></div>
      <div style="display:flex; justify-content:space-between;"><span>IVA (21%):</span><span>$${impuestos.toFixed(2)}</span></div>
      <div style="display:flex; justify-content:space-between; font-weight:bold; margin-top:10px;"><span>TOTAL:</span><span>$${total.toFixed(2)}</span></div>
    `;
    
    document.getElementById('cierre-ticket-content').innerHTML = ticketHTML;
    document.getElementById('modal-mesa-numero').textContent = mesaNumero;
    document.getElementById('cierre-modal').style.display = 'block';
    
    window.currentCierreData = { 
      mesaId, 
      mesaNumero, 
      platos: platos.map(p => ({
        platoId: p.plato_id,
        nombre: p.nombre,
        precio: p.precio,
        cantidad: p.cantidad,
        observaciones: p.observaciones || null
      })), 
      subtotal, 
      impuestos, 
      total 
    };
    
    setupModalEvents();
    
  } catch (err) {
    console.error('Error al cargar detalles de la mesa:', err);
    alert(`❌ ${err.message || 'Error al cargar los detalles'}`);
  }
};

function setupModalEvents() {
  const formaPagoSelect = document.getElementById('forma-pago');
  const montoRecibidoContainer = document.getElementById('monto-recibido-container');
  
  formaPagoSelect.addEventListener('change', () => {
    if (formaPagoSelect.value === 'efectivo') {
      montoRecibidoContainer.style.display = 'block';
      document.getElementById('monto-recibido').value = '';
      document.getElementById('vuelto-info').textContent = '';
    } else {
      montoRecibidoContainer.style.display = 'none';
    }
  });
  
  document.getElementById('monto-recibido')?.addEventListener('input', () => {
    const monto = parseFloat(document.getElementById('monto-recibido').value) || 0;
    const total = window.currentCierreData.total;
    const vuelto = monto - total;
    const vueltoEl = document.getElementById('vuelto-info');
    
    if (vuelto >= 0) {
      vueltoEl.textContent = `Vuelto: $${vuelto.toFixed(2)}`;
      vueltoEl.style.color = '#28a745';
    } else {
      vueltoEl.textContent = `Faltan: $${Math.abs(vuelto).toFixed(2)}`;
      vueltoEl.style.color = '#dc3545';
    }
  });
  
  document.getElementById('btn-imprimir-ticket').onclick = () => {
    imprimirTicket();
  };
  
  document.getElementById('btn-cerrar-cuenta').onclick = async () => {
    const formaPago = document.getElementById('forma-pago').value;
    const montoRecibido = document.getElementById('monto-recibido').value;
    
    if (formaPago === 'efectivo') {
      const monto = parseFloat(montoRecibido);
      if (isNaN(monto) || monto < window.currentCierreData.total) {
        alert('⚠️ El monto recibido debe cubrir el total');
        return;
      }
    }
    
    try {
      await apiCall('/ventas/cerrar', {
        method: 'POST',
        body: JSON.stringify({ 
          mesaId: window.currentCierreData.mesaId,
          platos: window.currentCierreData.platos,
          total: window.currentCierreData.total,
          impuestos: window.currentCierreData.impuestos,
          formaPago
        })
      });
      
      alert('✅ Cuenta cerrada exitosamente');
      document.getElementById('cierre-modal').style.display = 'none';
      loadTodasLasMesas();
      
    } catch (err) {
      console.error('Error al cerrar cuenta:', err);
      alert(`❌ ${err.message}`);
    }
  };
  
  document.getElementById('btn-cancelar-cierre').onclick = () => {
    document.getElementById('cierre-modal').style.display = 'none';
  };
}

function imprimirTicket() {
  const printWindow = window.open('', '', 'height=600,width=800');
  printWindow.document.write(`
    <html>
    <head><title>Ticket</title></head>
    <body onload="window.print(); window.close();">
      <div style="font-family:monospace; max-width:400px; margin:0 auto;">
        <h3 style="text-align:center;">TICKET RESTAURANTE</h3>
        <div>Mesa: ${window.currentCierreData.mesaNumero}</div>
        ${document.getElementById('cierre-ticket-content').innerHTML}
      </div>
    </body>
    </html>
  `);
  printWindow.document.close();
}

// ✅ FUNCIÓN PARA CIERRE DE CAJA DIARIO
async function mostrarCierreCajaDiario() {
  try {
    const data = await apiCall('/reportes/cierre-caja-diario');
    
    const fecha = new Date().toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    
    let html = `
      <div style="margin-bottom: 20px; padding: 15px; background: #f8f9fa; border-radius: 8px;">
        <div style="font-size: 18px; font-weight: bold; margin-bottom: 10px;">
          📊 Resumen Total
        </div>
        <div><strong>Total de ventas:</strong> ${data.total.total_ventas}</div>
        <div><strong>Total recaudado:</strong> $${Number(data.total.total_general).toFixed(2)}</div>
      </div>
      
      <div style="margin-bottom: 20px;">
        <h4 style="margin-bottom: 15px; color: #495057;">💰 Desglose por forma de pago:</h4>
    `;
    
    data.resumen.forEach(item => {
      const icon = {
        'efectivo': '💵',
        'tarjeta': '💳',
        'transferencia': '📱'
      };
      
      html += `
        <div style="padding: 12px; border: 1px solid #dee2e6; margin: 8px 0; border-radius: 6px; background: white;">
          <div style="font-size: 16px; font-weight: bold; margin-bottom: 5px;">
            ${icon[item.forma_pago] || '📄'} ${item.forma_pago.toUpperCase()}
          </div>
          <div>Ventas: ${item.cantidad_ventas}</div>
          <div style="font-weight: bold; color: #28a745;">Total: $${Number(item.total).toFixed(2)}</div>
        </div>
      `;
    });
    
    html += `</div>`;
    
    document.getElementById('fecha-cierre').textContent = fecha;
    document.getElementById('cierre-caja-contenido').innerHTML = html;
    document.getElementById('cierre-caja-modal').style.display = 'block';
    
    document.getElementById('btn-cerrar-cierre').onclick = () => {
      document.getElementById('cierre-caja-modal').style.display = 'none';
    };
    
    document.getElementById('btn-descargar-cierre').onclick = () => {
      generarPDFCierreCaja(data, fecha);
    };
    
  } catch (err) {
    console.error('Error al generar cierre de caja:', err);
    alert('❌ Error al cargar el cierre de caja');
  }
}

function generarPDFCierreCaja(data, fecha) {
  if (typeof window.jsPDF === 'undefined') {
    alert('⚠️ jsPDF no cargado');
    return;
  }
  
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  
  doc.setFontSize(20);
  doc.text("Cierre de Caja Diario", 20, 20);
  doc.setFontSize(12);
  doc.text(fecha, 20, 30);
  
  let y = 45;
  doc.text(`Total ventas: ${data.total.total_ventas}`, 20, y);
  y += 10;
  doc.text(`Total recaudado: $${Number(data.total.total_general).toFixed(2)}`, 20, y);
  y += 15;
  
  doc.text("Desglose por forma de pago:", 20, y);
  y += 10;
  
  data.resumen.forEach(item => {
    y += 10;
    doc.text(`${item.forma_pago}: ${item.cantidad_ventas} ventas - $${Number(item.total).toFixed(2)}`, 20, y);
  });
  
  doc.save(`cierre-caja-${new Date().toISOString().split('T')[0]}.pdf`);
}

// ✅ CONFIGURAR EVENTOS
function setupCajeroEvents() {
  const refreshBtn = document.getElementById('refresh-cajero');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', loadTodasLasMesas);
  }
  
  // ✅ ¡ESTA ES LA LÍNEA CLAVE!
  const cierreBtn = document.getElementById('cierre-caja-btn');
  if (cierreBtn) {
    cierreBtn.addEventListener('click', mostrarCierreCajaDiario);
  }
}

// Hacer funciones accesibles globalmente
window.loadTodasLasMesas = loadTodasLasMesas;
window.mostrarCierreCajaDiario = mostrarCierreCajaDiario; // ✅ ¡Importante!