import { PedidoAPI, MesaAPI, MenuAPI } from '../api.js';

let mesasActivas = {};
let currentMesaId = null;

export function initMozo(userName) {
  window.loadPedidosEnCurso = loadPedidosEnCurso;
  window.loadPedidosCobrados = loadPedidosCobrados;
  
  document.getElementById('mozo-nombre').textContent = userName;
  loadMesas();
  loadMenu();
  loadPedidosEnCurso();
  loadPedidosCobrados();
  setupMozoEvents();
  
  // Event listeners para el modal de notas
  document.getElementById('save-note')?.addEventListener('click', () => {
    const obs = document.getElementById('note-input').value;
    if (currentMesaId && window.currentNotePlatoId) {
      if (!mesasActivas[currentMesaId]) mesasActivas[currentMesaId] = { platos: {} };
      if (!mesasActivas[currentMesaId].platos[window.currentNotePlatoId]) {
        mesasActivas[currentMesaId].platos[window.currentNotePlatoId] = { cantidad: 0, observaciones: '' };
      }
      mesasActivas[currentMesaId].platos[window.currentNotePlatoId].observaciones = obs;
    }
    document.getElementById('note-modal').style.display = 'none';
  });

  document.getElementById('cancel-note')?.addEventListener('click', () => {
    document.getElementById('note-modal').style.display = 'none';
  });
}

async function loadMesas() {
  try {
    const mesas = await MesaAPI.getEstado();
    const select = document.getElementById('mesa-select');
    select.innerHTML = '<option value="">-- Selecciona una mesa --</option>';
    
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
      
      // Recargar datos
      loadMesas();
      loadPedidosEnCurso();
      loadPedidosCobrados();
      
    } catch (err) {
      console.error('Error al enviar pedido:', err);
    }
  });

  document.getElementById('refresh-cursos')?.addEventListener('click', loadPedidosEnCurso);
  document.getElementById('refresh-cobrados')?.addEventListener('click', loadPedidosCobrados);
}

export async function loadPedidosEnCurso() {
  try {
    const pedidos = await PedidoAPI.getPedidosEnCurso();
    const container = document.getElementById('pedidos-cursos');
    
    if (pedidos.length === 0) {
      container.innerHTML = '<p>📭 No hay pedidos en curso</p>';
      return;
    }

    container.innerHTML = pedidos.map(p => `
      <div class="pedido-item" style="padding: 12px; background: #e9f7fe; border-radius: 8px; margin-bottom: 8px;">
        <strong>Mesa ${p.mesa_numero}</strong> • ${p.estado}<br>
        <small>${p.platos}</small><br>
        <div style="font-weight: bold; color: #17a2b8;">$${Number(p.total || 0).toFixed(2)}</div>
      </div>
    `).join('');
  } catch (err) {
    console.error('Error al cargar pedidos en curso:', err);
    document.getElementById('pedidos-cursos').innerHTML = '<p>❌ Error al cargar pedidos</p>';
  }
}

export async function loadPedidosCobrados() {
  try {
    const pedidos = await PedidoAPI.getPedidosCobrados();
    const container = document.getElementById('pedidos-cobrados');
    
    if (pedidos.length === 0) {
      container.innerHTML = '<p>📭 No hay pedidos cobrados</p>';
      return;
    }

    container.innerHTML = pedidos.map(p => `
      <div class="pedido-item" style="padding: 12px; background: #d4edda; border-radius: 8px; margin-bottom: 8px;">
        <strong>Mesa ${p.mesa_numero}</strong> • ${p.estado}<br>
        <small>${p.platos}</small><br>
        <div style="font-weight: bold; color: #28a745;">$${Number(p.total || 0).toFixed(2)}</div>
      </div>
    `).join('');
  } catch (err) {
    console.error('Error al cargar pedidos cobrados:', err);
    document.getElementById('pedidos-cobrados').innerHTML = '<p>❌ Error al cargar pedidos</p>';
  }
}

// FUNCIÓN GLOBAL PARA EL MODAL DE NOTAS
window.openNoteModal = function(platoId) {
  if (!currentMesaId) return alert('Selecciona una mesa primero');
  
  window.currentNotePlatoId = platoId;
  const obs = mesasActivas[currentMesaId]?.platos[platoId]?.observaciones || '';
  document.getElementById('note-input').value = obs;
  document.getElementById('note-modal').style.display = 'block';
};

window.loadMesas = loadMesas;
window.loadPedidosEnCurso = loadPedidosEnCurso;
window.loadPedidosCobrados = loadPedidosCobrados;