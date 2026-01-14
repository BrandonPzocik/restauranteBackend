// frontend/js/views/cajero.js
import { CajeroAPI, VentaAPI } from '../api.js';

export function initCajero() {
  loadMesasActivas();
  setupCajeroEvents();
}

async function loadMesasActivas() {
  try {
    const mesas = await CajeroAPI.getMesasActivas();
    const container = document.getElementById('mesas-activas-cajero');
    
    if (!container) return;
    
    if (mesas.length === 0) {
      container.innerHTML = '<p>📭 No hay mesas con pedidos activos</p>';
      return;
    }
    
    container.innerHTML = mesas.map(m => `
      <div class="mesa-activa-item" style="padding: 16px; border: 2px solid #007bff; border-radius: 8px; margin-bottom: 12px; cursor: pointer;" 
           onclick="abrirDetalleMesa(${m.id}, ${m.numero})">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <div>
            <strong style="font-size: 18px;">Mesa ${m.numero}</strong>
            <div style="color: #666; font-size: 14px; margin-top: 4px;">
              ${m.pedidos_activos} pedido(s) activo(s)
            </div>
          </div>
          <div style="text-align: right;">
            <div style="font-size: 16px; color: #28a745; font-weight: bold;">
              $${Number(m.total_estimado || 0).toFixed(2)}
            </div>
            <button style="margin-top: 8px; background: #007bff; color: white; border: none; padding: 8px 16px; border-radius: 4px;">
              Ver detalles
            </button>
          </div>
        </div>
      </div>
    `).join('');
  } catch (err) {
    console.error('Error al cargar mesas activas:', err);
    const container = document.getElementById('mesas-activas-cajero');
    if (container) {
      container.innerHTML = '<p>❌ Error al cargar mesas activas</p>';
    }
  }
}

window.abrirDetalleMesa = async function(mesaId, mesaNumero) {
  try {
    const platos = await CajeroAPI.getDetalleMesa(mesaId);
    
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
    
    document.getElementById('ticket-content').innerHTML = ticketHTML;
    document.getElementById('ticket-modal').style.display = 'block';
    
    window.currentTicketData = { 
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
    
  } catch (err) {
    console.error('Error al cargar detalles de la mesa:', err);
    alert(`❌ ${err.message || 'Error al cargar los detalles'}`);
  }
};

function setupCajeroEvents() {
  const refreshBtn = document.getElementById('refresh-cajero');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', loadMesasActivas);
  }
}

// Hacer accesible globalmente
window.loadMesasActivas = loadMesasActivas;

