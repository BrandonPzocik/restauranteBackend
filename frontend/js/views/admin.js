// frontend/js/views/admin.js

// ✅ Usar la función apiCall centralizada que maneja sessionStorage
import { apiCall as apiCallCentral } from '../api.js';

// Función para hacer llamadas seguras a la API
async function apiCall(endpoint, options = {}) {
  try {
    return await apiCallCentral(endpoint, options);
  } catch (err) {
    // Manejo de errores de autorización
    if (err.message.includes('Acceso denegado') || err.message.includes('403')) {
      throw new Error('Acceso denegado. Solo administradores pueden ver reportes.');
    }
    throw err;
  }
}

// Carga el estado actual de las mesas
async function loadMapaMesas() {
  try {
    const mesas = await apiCall('/mesas/estado');
    const container = document.getElementById('mapa-mesas');
    
    if (!container) return;

    container.innerHTML = mesas.map(m => {
      const clase = m.estado === 'libre' 
        ? 'mesa-item' 
        : 'mesa-item mesa-ocupada';
      return `<div class="${clase}">Mesa ${m.numero}<br><small>${m.estado}</small></div>`;
    }).join('');
  } catch (err) {
    console.error('Error al cargar estado de mesas:', err);
    const container = document.getElementById('mapa-mesas');
    if (container) {
      container.innerHTML = '<p>❌ Error al cargar mesas</p>';
    }
  }
}

// Carga todos los reportes (ganancias, rendimiento, platos)
async function loadReportes() {
  try {
    const [
      gananciasDia,
      gananciasSemana,
      gananciasMes,
      rendimiento,
      platos
    ] = await Promise.all([
      apiCall('/reportes/ganancias?periodo=dia'),
      apiCall('/reportes/ganancias?periodo=semana'),
      apiCall('/reportes/ganancias?periodo=mes'),
      apiCall('/reportes/rendimiento-mozos'),
      apiCall('/reportes/platos-vendidos')
    ]);

    // Función auxiliar para actualizar elementos
    const updateElement = (id, value, formatter = (v) => v) => {
      const el = document.getElementById(id);
      if (el && value != null) {
        el.textContent = formatter(value);
      }
    };

    // Actualizar ganancias
    updateElement('ganancias-dia', gananciasDia?.total, (v) => `$${Number(v || 0).toFixed(2)}`);
    updateElement('ganancias-semana', gananciasSemana?.total, (v) => `$${Number(v || 0).toFixed(2)}`);
    updateElement('ganancias-mes', gananciasMes?.total, (v) => `$${Number(v || 0).toFixed(2)}`);

    // Rendimiento mozos
    const rendimientoContainer = document.getElementById('rendimiento-mozos');
    if (rendimientoContainer) {
      if (Array.isArray(rendimiento) && rendimiento.length > 0) {
        rendimientoContainer.innerHTML = rendimiento.map(m => 
          `<div>${m.nombre}: ${m.pedidos || 0} pedidos - $${Number(m.ventas || 0).toFixed(2)}</div>`
        ).join('');
      } else {
        rendimientoContainer.textContent = 'No hay datos de mozos';
      }
    }

    // Platos vendidos
    const platosContainer = document.getElementById('platos-vendidos');
    if (platosContainer) {
      if (Array.isArray(platos) && platos.length > 0) {
        platosContainer.innerHTML = platos.map(p => 
          `<div>${p.nombre}: ${p.cantidad || 0} vendidos - $${Number(p.ingresos || 0).toFixed(2)}</div>`
        ).join('');
      } else {
        platosContainer.textContent = 'No hay datos de ventas';
      }
    }

  } catch (err) {
    console.error('Error al cargar reportes:', err);
    alert(`❌ ${err.message}`);
    
    // Resetear valores en caso de error (versión segura)
    const elementsToReset = [
      { id: 'ganancias-dia', text: '$0.00' },
      { id: 'ganancias-semana', text: '$0.00' },
      { id: 'ganancias-mes', text: '$0.00' },
      { id: 'rendimiento-mozos', text: 'Error al cargar' },
      { id: 'platos-vendidos', text: 'Error al cargar' }
    ];

    elementsToReset.forEach(({ id, text }) => {
      const el = document.getElementById(id);
      if (el) el.textContent = text;
    });
  }
}

// Configura los eventos de los botones
function setupAdminEvents() {
  const refreshMesasBtn = document.getElementById('refresh-mesas');
  const refreshReportesBtn = document.getElementById('refresh-reportes');
  const menuForm = document.getElementById('menu-form');

  if (refreshMesasBtn) {
    refreshMesasBtn.addEventListener('click', loadMapaMesas);
  }

  if (refreshReportesBtn) {
    refreshReportesBtn.addEventListener('click', loadReportes);
  }

  if (menuForm) {
    menuForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const nombre = document.getElementById('plato-nombre')?.value.trim();
      const desc = document.getElementById('plato-desc')?.value.trim();
      const precioStr = document.getElementById('plato-precio')?.value.trim();

      if (!nombre || !precioStr) {
        alert('⚠️ Nombre y precio son obligatorios');
        return;
      }

      const precio = parseFloat(precioStr);
      if (isNaN(precio) || precio <= 0) {
        alert('⚠️ Precio debe ser un número válido');
        return;
      }

      try {
        await apiCall('/menu', {
          method: 'POST',
          body: JSON.stringify({ nombre, descripcion: desc, precio })
        });
        alert('✅ Plato agregado al menú');
        menuForm.reset();
      } catch (err) {
        console.error('Error al crear plato:', err);
        alert(`❌ ${err.message}`);
      }
    });
  }
}

// Inicialización principal del panel de admin
export function initAdmin() {
  loadMapaMesas();
  loadReportes();
  setupAdminEvents();
}