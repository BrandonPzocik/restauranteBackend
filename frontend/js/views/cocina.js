// js/views/cocina.js
import { PedidoAPI } from '../api.js';

export function initCocina() {
  // ✅ Hacer loadPedidosCocina accesible globalmente ANTES de configurar el socket
  window.loadPedidosCocina = loadPedidosCocina;
  
  loadPedidosCocina();
  setupCocinaEvents();
  
  // ✅ Asegurar que el socket esté conectado y configurado
  if (!window.socket || !window.socket.connected) {
    if (typeof window.initSocket === 'function') {
      // Si no hay socket, inicializarlo
      window.initSocket();
    }
  } else {
    // Si ya está conectado, reconfigurar listeners y unirse a la sala
    console.log('🔄 Socket ya conectado, reconfigurando para cocina...');
    if (typeof window.setupSocketListeners === 'function') {
      window.setupSocketListeners();
    }
    if (typeof window.joinCocinaIfNeeded === 'function') {
      window.joinCocinaIfNeeded();
    }
  }
}

async function loadPedidosCocina() {
  try {
    const pedidos = await PedidoAPI.listar();
    const container = document.getElementById('pedidos-cocina');
    
    if (pedidos.length === 0) {
      container.innerHTML = '<p>📭 No hay pedidos pendientes</p>';
      return;
    }
    
    container.innerHTML = pedidos.map(p => `
      <div class="pedido-cocina">
        <strong>Mesa ${p.mesa_numero}</strong><br>
        <small>Tomado por: ${p.mozo}</small>
        <div id="platos-${p.id}">Cargando platos...</div>
        <button class="btn-secondary" style="margin-top:10px; background:#28a745;" onclick="marcarListo(${p.id}, ${p.mesa_numero})">
          ✅ Listo
        </button>
      </div>
    `).join('');
    
    pedidos.forEach(p => {
      PedidoAPI.getDetalle(p.id).then(detalle => {
        if (detalle?.platos) {
          const el = document.getElementById(`platos-${p.id}`);
          if (el) {
            el.innerHTML = detalle.platos.map(item => 
              `<div>${item.cantidad} × ${item.nombre} ${item.observaciones ? `<br><small>(${item.observaciones})</small>` : ''}</div>`
            ).join('');
          }
        }
      }).catch(err => {
        console.error('Error al cargar detalles:', err);
      });
    });
  } catch (err) {
    document.getElementById('pedidos-cocina').innerHTML = '<p>❌ Error al cargar pedidos</p>';
  }
}

function setupCocinaEvents() {
  const refreshBtn = document.getElementById('refresh-cocina');
  if (refreshBtn) {
    // Remover listener anterior si existe
    refreshBtn.replaceWith(refreshBtn.cloneNode(true));
    document.getElementById('refresh-cocina')?.addEventListener('click', loadPedidosCocina);
  }
}

window.marcarListo = async function(pedidoId, mesaNumero) {
  try {
    await PedidoAPI.marcarListo(pedidoId);
    // ✅ El evento de websocket ahora se emite desde el servidor
    // No es necesario emitirlo desde el cliente, pero lo dejamos por compatibilidad
    if (window.socket && window.socket.connected) {
      window.socket.emit('pedido-listo', { mesa: mesaNumero });
    }
    loadPedidosCocina();
  } catch (err) {
    console.error('Error al marcar como listo:', err);
  }
};