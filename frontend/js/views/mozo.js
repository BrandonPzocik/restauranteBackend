// frontend/js/mozo.js
import { PedidoAPI, MesaAPI, MenuAPI } from '../api.js';

let mesasActivas = {};
let currentMesaId = null;
let currentMesaNumero = null;

export function initMozo(userName) {
  // ✅ Hacer loadPedidosListos accesible globalmente ANTES de configurar el socket
  window.loadPedidosListos = loadPedidosListos;
  window.loadHistorialMozo = loadHistorialMozo;
  
  document.getElementById('mozo-nombre').textContent = userName;
  loadMesas();
  loadMenu();
  loadPedidosListos();
  loadHistorialMozo();
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
    
    // Mostrar todas las mesas, no solo las libres
    // Esto permite agregar pedidos a mesas que ya tienen pedidos activos
    mesas.forEach(m => {
      const opt = document.createElement('option');
      opt.value = m.id;
      const estadoLabel = m.estado === 'libre' ? '' : ` (${m.estado})`;
      opt.textContent = `Mesa ${m.numero} (${m.capacidad} pers)${estadoLabel}`;
      opt.dataset.numero = m.numero;
      select.appendChild(opt);
    });
    
    if (select.children.length === 1) {
      select.innerHTML = '<option value="">No hay mesas disponibles</option>';
      select.disabled = true;
    } else {
      select.disabled = false;
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

  document.getElementById('refresh-listos')?.addEventListener('click', () => {
    loadPedidosListos();
    loadHistorialMozo();
  });
  
  const refreshHistorialBtn = document.getElementById('refresh-historial');
  if (refreshHistorialBtn) {
    refreshHistorialBtn.addEventListener('click', loadHistorialMozo);
  }
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
        </div>
      `).join('')}
    `;
    
    // Recargar historial después de cargar pedidos listos
    loadHistorialMozo();
  } catch (err) {
    document.getElementById('pedidos-listos').innerHTML = '<p>❌ Error al cargar pedidos listos</p>';
  }
}

// Cargar historial de pedidos del mozo
export async function loadHistorialMozo() {
  try {
    const historial = await PedidoAPI.getHistorial();
    const container = document.getElementById('historial-mozo');
    
    if (!container) return;
    
    if (historial.length === 0) {
      container.innerHTML = '<p style="padding: 12px; color: #666;">No hay pedidos en tu historial</p>';
      return;
    }
    
    // Agrupar por mesa
    const porMesa = {};
    historial.forEach(p => {
      if (!porMesa[p.mesa_numero]) {
        porMesa[p.mesa_numero] = [];
      }
      porMesa[p.mesa_numero].push(p);
    });
    
    let html = '<h4 style="margin-bottom: 12px;">📋 Historial de Pedidos</h4>';
    
    Object.keys(porMesa).sort().forEach(mesaNum => {
      const pedidosMesa = porMesa[mesaNum];
      const estadoColor = {
        'pendiente': '#ffc107',
        'preparando': '#17a2b8',
        'listo': '#28a745',
        'servido': '#6c757d',
        'cobrado': '#28a745'
      };
      
      html += `
        <div style="margin-bottom: 16px; border: 1px solid #ddd; border-radius: 8px; padding: 12px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
            <strong style="font-size: 16px;">Mesa ${mesaNum}</strong>
            <span style="background: ${estadoColor[pedidosMesa[0].estado] || '#6c757d'}; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px;">
              ${pedidosMesa[0].estado}
            </span>
          </div>
          ${pedidosMesa.map(p => `
            <div style="padding: 8px; background: #f8f9fa; border-radius: 4px; margin-bottom: 4px;">
              <div style="font-size: 12px; color: #666;">${new Date(p.creado_en).toLocaleString()}</div>
              <div style="margin-top: 4px;">${p.platos}</div>
              <div style="margin-top: 4px; font-weight: bold; color: #28a745;">$${Number(p.total || 0).toFixed(2)}</div>
            </div>
          `).join('')}
        </div>
      `;
    });
    
    container.innerHTML = html;
  } catch (err) {
    console.error('Error al cargar historial:', err);
    const container = document.getElementById('historial-mozo');
    if (container) {
      container.innerHTML = '<p style="padding: 12px; color: #dc3545;">❌ Error al cargar historial</p>';
    }
  }
}

// Hacer accesible globalmente
window.loadMesas = loadMesas;
window.loadPedidosListos = loadPedidosListos;
window.loadHistorialMozo = loadHistorialMozo;