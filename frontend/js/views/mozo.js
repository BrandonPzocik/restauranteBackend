// frontend/js/mozo.js
import { PedidoAPI, MesaAPI, MenuAPI } from '../api.js';

let mesasActivas = {};
let currentMesaId = null;
let currentMesaNumero = null;

export function initMozo(userName) {
  // ✅ Hacer loadPedidosListos accesible globalmente ANTES de configurar el socket
  window.loadPedidosListos = loadPedidosListos;
  
  document.getElementById('mozo-nombre').textContent = userName;
  loadMesas();
  loadMenu();
  loadPedidosListos();
  setupMozoEvents();
  
  // ✅ Asegurar que el socket esté conectado y configurado
  if (!window.socket || !window.socket.connected) {
    if (typeof window.initSocket === 'function') {
      window.initSocket();
    }
  } else {
    // Si ya está conectado, reconfigurar listeners
    console.log('🔄 Socket ya conectado, reconfigurando para mozo...');
    if (typeof window.setupSocketListeners === 'function') {
      window.setupSocketListeners();
    }
  }
}

async function loadMesas() {
  try {
    const mesas = await MesaAPI.getEstado();
    const select = document.getElementById('mesa-select');
    select.innerHTML = '<option value="">-- Selecciona una mesa --</option>';
    
    mesas.forEach(m => {
      if (m.estado === 'libre') {
        const opt = document.createElement('option');
        opt.value = m.id;
        opt.textContent = `Mesa ${m.numero} (${m.capacidad} pers)`;
        opt.dataset.numero = m.numero;
        select.appendChild(opt);
      }
    });
    
    if (select.children.length === 1) {
      select.innerHTML = '<option value="">No hay mesas libres</option>';
      select.disabled = true;
    }
  } catch (err) {
    console.error('Error al cargar mesas:', err);
  }
}

async function loadMenu() {
  try {
    const platos = await MenuAPI.listar();
    const container = document.getElementById('menu-items');
    container.innerHTML = platos.map(p => `
      <div class="menu-item">
        <div>
          <strong>${p.nombre}</strong><br>
          <small>${p.descripcion || ''}</small><br>
          <span style="color: #28a745; font-weight: bold;">$${p.precio}</span>
        </div>
        <div class="quantity-controls">
          <button class="quantity-btn" data-id="${p.id}" data-action="minus">−</button>
          <span id="qty-${p.id}">0</span>
          <button class="quantity-btn" data-id="${p.id}" data-action="plus">+</button>
          <button class="btn-secondary" style="width:auto; padding:4px 8px;" onclick="openNoteModal(${p.id})">✏️</button>
        </div>
      </div>
    `).join('');
    
    setupQuantityButtons();
  } catch (err) {
    console.error('Error al cargar menú:', err);
  }
}

function setupQuantityButtons() {
  document.querySelectorAll('.quantity-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      if (!currentMesaId) return;
      
      const id = e.target.dataset.id;
      const action = e.target.dataset.action;
      const qtyEl = document.getElementById(`qty-${id}`);
      
      if (!mesasActivas[currentMesaId]) {
        mesasActivas[currentMesaId] = { platos: {} };
      }
      if (!mesasActivas[currentMesaId].platos[id]) {
        mesasActivas[currentMesaId].platos[id] = { cantidad: 0, observaciones: '' };
      }
      
      if (action === 'plus') mesasActivas[currentMesaId].platos[id].cantidad++;
      if (action === 'minus' && mesasActivas[currentMesaId].platos[id].cantidad > 0) {
        mesasActivas[currentMesaId].platos[id].cantidad--;
      }
      
      qtyEl.textContent = mesasActivas[currentMesaId].platos[id].cantidad;
      updateResumen();
    });
  });
}

function updateResumen() {
  if (!currentMesaId) return;
  
  const platosMesa = mesasActivas[currentMesaId]?.platos || {};
  const items = Object.entries(platosMesa)
    .filter(([_, v]) => v.cantidad > 0)
    .map(([id, v]) => `${v.cantidad} × Plato #${id} ${v.observaciones ? `(${v.observaciones})` : ''}`);

  const resumenEl = document.getElementById('resumen-pedido');
  const btn = document.getElementById('enviar-pedido');
  
  if (items.length === 0) {
    resumenEl.textContent = 'No hay platos seleccionados';
    btn.disabled = true;
  } else {
    resumenEl.innerHTML = items.map(i => `<div>• ${i}</div>`).join('');
    btn.disabled = false;
  }
}

function setupMozoEvents() {
  document.getElementById('mesa-select')?.addEventListener('change', (e) => {
    currentMesaId = e.target.value;
    currentMesaNumero = e.target.options[e.target.selectedIndex]?.dataset.numero;
    
    if (currentMesaId && !mesasActivas[currentMesaId]) {
      mesasActivas[currentMesaId] = { platos: {} };
    }
    
    document.querySelectorAll('[id^="qty-"]').forEach(el => {
      const platoId = el.id.replace('qty-', '');
      const qty = mesasActivas[currentMesaId]?.platos[platoId]?.cantidad || 0;
      el.textContent = qty;
    });
    
    updateResumen();
  });

  document.getElementById('enviar-pedido')?.addEventListener('click', async () => {
    if (!currentMesaId) return alert('Selecciona una mesa');
    
    const platosMesa = mesasActivas[currentMesaId]?.platos || {};
    const platos = Object.entries(platosMesa)
      .filter(([_, v]) => v.cantidad > 0)
      .map(([id, v]) => ({ 
        platoId: parseInt(id), 
        cantidad: v.cantidad, 
        observaciones: v.observaciones || '' 
      }));

    try {
      await PedidoAPI.crear(parseInt(currentMesaId), platos);
      alert('✅ Pedido enviado a cocina');
      
      mesasActivas[currentMesaId] = { platos: {} };
      updateResumen();
      document.querySelectorAll('[id^="qty-"]').forEach(el => el.textContent = '0');
      
      // ✅ El evento de websocket ahora se emite desde el servidor
      // No es necesario emitirlo desde el cliente, pero lo dejamos por compatibilidad
      if (window.socket && window.socket.connected) {
        window.socket.emit('nuevo-pedido', { mesa: currentMesaNumero });
      }
      
      loadMesas(); // Recargar estado de mesas
    } catch (err) {
      console.error('Error al enviar pedido:', err);
    }
  });

  document.getElementById('refresh-listos')?.addEventListener('click', loadPedidosListos);
}

export async function loadPedidosListos() {
  try {
    const pedidos = await PedidoAPI.listarListos();
    const container = document.getElementById('pedidos-listos');
    
    if (pedidos.length === 0) {
      container.innerHTML = '<p>📭 No hay pedidos listos</p>';
      return;
    }

    container.innerHTML = `
      <h4>Pedidos listos:</h4>
      ${pedidos.map(p => `
        <div class="pedido-item" style="padding: 12px; background: #d4edda; border-radius: 8px; margin-top: 8px;">
          <strong>Mesa ${p.mesa_numero}</strong><br>
          <small>${p.platos}</small>
          <button onclick="cerrarCuenta(${p.mesa_id}, ${p.mesa_numero})" style="margin-top: 8px; background: #dc3545; border: none; color: white; padding: 6px 12px; border-radius: 4px;">
            Cerrar cuenta
          </button>
        </div>
      `).join('')}
    `;
  } catch (err) {
    document.getElementById('pedidos-listos').innerHTML = '<p>❌ Error al cargar pedidos listos</p>';
  }
}

// ✅ CORREGIDO: Carga platos con platoId
async function getPlatosPorMesa(mesaId) {
  // Obtener token de sessionStorage específico de pestaña o de localStorage
  const tabId = sessionStorage.getItem('tabId');
  const token = tabId ? sessionStorage.getItem(`authToken_${tabId}`) : null || localStorage.getItem('authToken');
  const response = await fetch(`http://localhost:3000/api/pedidos/mesa/${mesaId}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
  
  if (!response.ok) {
    throw new Error('Error al cargar platos');
  }
  
  const platosRaw = await response.json();
  
  // ✅ Mapear 'id' del plato a 'platoId' para el backend
  return platosRaw.map(p => ({
    platoId: p.id,          // ← ¡Clave para evitar undefined!
    nombre: p.nombre,
    precio: p.precio,
    cantidad: p.cantidad,
    observaciones: p.observaciones || null
  }));
}

window.cerrarCuenta = async function(mesaId, mesaNumero) {
  if (!confirm(`¿Cerrar cuenta de la Mesa ${mesaNumero}?`)) return;
  
  try {
    // Cargar platos reales (con platoId)
    const platos = await getPlatosPorMesa(mesaId);
    
    const subtotal = platos.reduce((sum, p) => sum + (p.precio * p.cantidad), 0);
    const impuestos = subtotal * 0.21;
    const total = subtotal + impuestos;
    
    let ticketHTML = `
      <div style="text-align:right;">${new Date().toLocaleString()}</div>
      <div style="text-align:center; font-weight:bold; margin:10px 0;">Mesa ${mesaNumero}</div>
      <div style="border-top:1px dashed #000; margin:10px 0;"></div>
    `;
    
    platos.forEach(p => {
      const linea = `${p.cantidad}x ${p.nombre}`;
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
      platos, 
      subtotal, 
      impuestos, 
      total 
    };
    
  } catch (err) {
    console.error('Error al cerrar cuenta:', err);
    alert(`❌ ${err.message || 'Error al cargar los platos'}`);
  }
};

// Hacer accesible globalmente
window.loadMesas = loadMesas;
window.loadPedidosListos = loadPedidosListos;