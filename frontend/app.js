// ===== CONFIGURACIÓN =====
const API_URL = 'http://localhost:3000/api';
let mesasActivas = {}; // { mesaId: { platos: { platoId: { cantidad, observaciones } } } }
let currentUserId = null;
let currentUserName = '';
let currentUserRole = '';
let currentMesaId = null;
let currentMesaNumero = null;
let socket = null;

// ===== UTILS =====
function getAuthToken() { return localStorage.getItem('authToken'); }
function saveToken(token) { localStorage.setItem('authToken', token); }
function clearAuth() { 
  localStorage.removeItem('authToken'); 
  mesasActivas = {};
  showSection('login'); 
}

function showSection(name) {
  document.querySelectorAll('section').forEach(s => s.classList.remove('active'));
  document.getElementById(name + '-section')?.classList.add('active');
}

async function apiCall(endpoint, options = {}) {
  const url = API_URL + endpoint;
  const headers = { 'Content-Type': 'application/json' };
  const token = getAuthToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  try {
    const res = await fetch(url, { ...options, headers });
    if (res.status === 401) { 
      clearAuth(); 
      alert('⚠️ Sesión expirada. Inicia sesión nuevamente.'); 
      return null; 
    }
    return res;
  } catch (err) {
    console.error('Error de red:', err);
    alert('❌ Error de conexión con el servidor.');
    return null;
  }
}

// ===== SOCKET.IO =====
function initSocket() {
  socket = io('http://localhost:3000');
  
  if (currentUserRole === 'cocina') {
    socket.emit('join-cocina');
    socket.on('nuevo-pedido', () => {
      loadPedidosCocina();
    });
  }
  
  if (currentUserRole === 'mozo') {
    socket.on('pedido-listo', (data) => {
      alert(`🔔 ¡El pedido de la mesa ${data.mesa} está listo para servir!`);
      loadPedidosListos();
    });
  }
}

// ===== LOGIN =====
document.getElementById('login-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  const errorEl = document.getElementById('login-error');
  errorEl.textContent = '';

  const res = await apiCall('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password })
  });

  if (!res) return;
  if (res.ok) {
    const data = await res.json();
    saveToken(data.token);
    currentUserId = data.user.id;
    currentUserName = data.user.nombre;
    currentUserRole = data.user.rol;
    
    if (data.user.rol === 'mozo') {
      document.getElementById('mozo-nombre').textContent = data.user.nombre;
      loadMozo();
    } else if (data.user.rol === 'cocina') {
      loadCocina();
    } else {
      loadAdmin();
    }
    initSocket();
  } else {
    const err = await res.json();
    errorEl.textContent = err.error || 'Error al iniciar sesión';
  }
});

// ===== MOZO =====
async function loadMozo() {
  showSection('mozo');
  await loadMesas();
  await loadMenu();
  await loadPedidosListos();
}

async function loadMesas() {
  const res = await apiCall('/mesas');
  if (!res) return;
  const mesas = await res.json();
  const select = document.getElementById('mesa-select');
  select.innerHTML = '<option value="">-- Selecciona una mesa --</option>';
  mesas.forEach(m => {
    const opt = document.createElement('option');
    opt.value = m.id;
    opt.textContent = `Mesa ${m.numero} (${m.capacidad} pers)`;
    opt.dataset.numero = m.numero;
    select.appendChild(opt);
  });
}

async function loadMenu() {
  const res = await apiCall('/menu');
  if (!res) return;
  const platos = await res.json();
  const container = document.getElementById('menu-items');
  container.innerHTML = '';
  platos.forEach(p => {
    const div = document.createElement('div');
    div.className = 'menu-item';
    div.innerHTML = `
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
    `;
    container.appendChild(div);
  });

  // Eventos de cantidad
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

// Modal de observaciones
function openNoteModal(platoId) {
  if (!currentMesaId) return alert('Selecciona una mesa primero');
  
  window.currentNotePlatoId = platoId;
  const obs = mesasActivas[currentMesaId]?.platos[platoId]?.observaciones || '';
  document.getElementById('note-input').value = obs;
  document.getElementById('note-modal').style.display = 'block';
}

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

// Cambio de mesa
document.getElementById('mesa-select')?.addEventListener('change', (e) => {
  currentMesaId = e.target.value;
  currentMesaNumero = e.target.options[e.target.selectedIndex]?.dataset.numero;
  
  // Inicializar mesa si no existe
  if (currentMesaId && !mesasActivas[currentMesaId]) {
    mesasActivas[currentMesaId] = { platos: {} };
  }
  
  // Actualizar cantidades en el menú
  document.querySelectorAll('[id^="qty-"]').forEach(el => {
    const platoId = el.id.replace('qty-', '');
    const qty = mesasActivas[currentMesaId]?.platos[platoId]?.cantidad || 0;
    el.textContent = qty;
  });
  
  updateResumen();
});

// Enviar pedido a cocina
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

  const res = await apiCall('/pedidos', {
    method: 'POST',
    body: JSON.stringify({ mesaId: parseInt(currentMesaId), platos })
  });

  if (res && res.ok) {
    alert('✅ Pedido enviado a cocina');
    if (socket) socket.emit('nuevo-pedido', { mesa: currentMesaNumero });
    
    // Limpiar solo esta mesa
    mesasActivas[currentMesaId] = { platos: {} };
    updateResumen();
    document.querySelectorAll('[id^="qty-"]').forEach(el => {
      el.textContent = '0';
    });
  }
});

// Cerrar cuenta y generar ticket
async function cerrarCuentaMesa(mesaId, mesaNumero, platosConPrecio) {
  if (!confirm(`¿Cerrar cuenta de la Mesa ${mesaNumero}?`)) return;
  
  // Calcular total
  const total = platosConPrecio.reduce((sum, p) => sum + (p.precio * p.cantidad), 0);
  const impuestos = total * 0.21; // IVA 21%
  const totalConImpuestos = total + impuestos;
  
  // Guardar en backend
  const res = await apiCall('/ventas/cerrar', {
    method: 'POST',
    body: JSON.stringify({ 
      mesaId, 
      platos: platosConPrecio,
      total: totalConImpuestos,
      impuestos,
      formaPago: 'efectivo'
    })
  });
  
  if (res && res.ok) {
    // Generar ticket en PDF
    generarTicket(mesaNumero, platosConPrecio, total, impuestos, totalConImpuestos);
    
    // Actualizar lista
    loadPedidosListos();
  }
}

// Generar PDF
function generarTicket(mesaNumero, platos, subtotal, impuestos, total) {
  // Cargar jsPDF desde CDN
  if (typeof window.jsPDF === 'undefined') {
    alert('⚠️ Para generar el ticket, abre el HTML con un servidor local (Live Server).');
    return;
  }
  
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  
  doc.setFontSize(20);
  doc.text("TICKET RESTAURANTE", 20, 20);
  doc.setFontSize(12);
  doc.text(`Mesa: ${mesaNumero}`, 20, 30);
  doc.text(`Fecha: ${new Date().toLocaleString()}`, 20, 35);
  
  let y = 45;
  doc.text("Platos:", 20, y);
  y += 10;
  
  platos.forEach(p => {
    const line = `${p.cantidad}x ${p.nombre} - $${p.precio} c/u`;
    const totalLine = `$${(p.precio * p.cantidad).toFixed(2)}`;
    doc.text(line, 20, y);
    doc.text(totalLine, 160, y);
    y += 10;
  });
  
  y += 5;
  doc.text("----------------------------", 20, y);
  y += 10;
  doc.text(`Subtotal: $${subtotal.toFixed(2)}`, 120, y);
  y += 6;
  doc.text(`IVA (21%): $${impuestos.toFixed(2)}`, 120, y + 6);
  y += 12;
  doc.setFontSize(16);
  doc.text(`TOTAL: $${total.toFixed(2)}`, 120, y);
  
  doc.save(`ticket-mesa-${mesaNumero}.pdf`);
}

// Cargar pedidos listos
async function loadPedidosListos() {
  const res = await apiCall('/pedidos/listos');
  if (!res) return;
  const pedidos = await res.json();
  const container = document.getElementById('pedidos-listos');
  
  if (pedidos.length === 0) {
    container.innerHTML = '<p>📭 No hay pedidos listos para servir</p>';
    return;
  }

  let html = '<h4>Pedidos listos:</h4>';
  pedidos.forEach(p => {
    // Obtener platos con precios (simulado, en la práctica vendrían del backend)
    const platosConPrecio = [
      { nombre: "Milanesa Napolitana", cantidad: 2, precio: 2800 },
      { nombre: "Agua Mineral", cantidad: 2, precio: 400 }
    ];
    
    html += `
      <div class="pedido-item" style="padding: 12px; background: #d4edda; border-radius: 8px; margin-top: 8px;">
        <strong>Mesa ${p.mesa_numero}</strong><br>
        <small>${p.platos}</small>
        <button onclick="cerrarCuentaMesa(${p.mesa_id}, ${p.mesa_numero}, ${JSON.stringify(platosConPrecio).replace(/"/g, '&quot;')})" 
                style="margin-top: 8px; background: #dc3545; border: none; color: white; padding: 6px 12px; border-radius: 4px; font-size: 14px;">
          Cerrar cuenta
        </button>
      </div>
    `;
  });
  container.innerHTML = html;
}

document.getElementById('refresh-listos')?.addEventListener('click', loadPedidosListos);

// ===== COCINA =====
async function loadCocina() {
  showSection('cocina');
  loadPedidosCocina();
}

async function loadPedidosCocina() {
  const res = await apiCall('/pedidos');
  if (!res) return;
  const pedidos = await res.json();
  const container = document.getElementById('pedidos-cocina');
  container.innerHTML = '';
  
  if (pedidos.length === 0) {
    container.innerHTML = '<p>📭 No hay pedidos pendientes</p>';
    return;
  }
  
  pedidos.forEach(p => {
    const div = document.createElement('div');
    div.className = 'pedido-cocina';
    div.innerHTML = `
      <strong>Mesa ${p.mesa_numero}</strong><br>
      <small>Tomado por: ${p.mozo}</small>
      <div id="platos-${p.id}">Cargando platos...</div>
      <button class="btn-secondary" style="margin-top:10px; background:#28a745;" onclick="marcarListo(${p.id}, ${p.mesa_numero})">✅ Listo</button>
    `;
    container.appendChild(div);
    
    // Cargar detalles del pedido
    apiCall(`/pedidos/${p.id}`).then(res => {
      if (res) res.json().then(detalle => {
        const platosEl = document.getElementById(`platos-${p.id}`);
        if (platosEl && detalle?.platos) {
          platosEl.innerHTML = detalle.platos.map(item => 
            `<div>${item.cantidad} × ${item.nombre} ${item.observaciones ? `<br><small>(${item.observaciones})</small>` : ''}</div>`
          ).join('');
        }
      });
    });
  });
}

async function marcarListo(pedidoId, mesaNumero) {
  const res = await apiCall(`/pedidos/${pedidoId}`, {
    method: 'PATCH',
    body: JSON.stringify({ estado: 'listo' })
  });
  if (res && res.ok) {
    if (socket) socket.emit('pedido-listo', { mesa: mesaNumero });
    loadPedidosCocina();
  }
}

// ===== ADMIN =====
async function loadAdmin() {
  showSection('admin');
  loadMapaMesas();
}

async function loadMapaMesas() {
  const res = await apiCall('/mesas/estado');
  if (!res) return;
  const mesas = await res.json();
  const container = document.getElementById('mapa-mesas');
  container.innerHTML = mesas.map(m => {
    const clase = m.estado === 'libre' ? 'mesa-item' : 
                  m.estado === 'ocupada' ? 'mesa-item mesa-ocupada' : 'mesa-item mesa-pagando';
    return `<div class="${clase}">Mesa ${m.numero}<br><small>${m.estado}</small></div>`;
  }).join('');
}

document.getElementById('refresh-mesas')?.addEventListener('click', loadMapaMesas);

document.getElementById('menu-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const nombre = document.getElementById('plato-nombre').value;
  const desc = document.getElementById('plato-desc').value;
  const precio = parseFloat(document.getElementById('plato-precio').value);
  
  const res = await apiCall('/menu', {
    method: 'POST',
    body: JSON.stringify({ nombre, descripcion: desc, precio })
  });
  
  if (res && res.ok) {
    alert('✅ Plato agregado al menú');
    document.getElementById('menu-form').reset();
  }
});

// ===== LOGOUT =====
['mozo', 'cocina', 'admin'].forEach(role => {
  const btn = document.getElementById(`logout-${role}`);
  if (btn) btn.addEventListener('click', clearAuth);
});

// ===== INICIO =====
document.addEventListener('DOMContentLoaded', () => {
  showSection('login');
  
  // Cargar jsPDF si está disponible
  if (typeof window.jspdf === 'undefined') {
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
    script.onload = () => {
      window.jsPDF = window.jspdf.jsPDF;
    };
    document.head.appendChild(script);
  }
});