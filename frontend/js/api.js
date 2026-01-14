// frontend/js/api.js
const API_URL = 'http://localhost:3000/api'; // ← ¡Verifica este puerto!

// ✅ Usar localStorage para persistencia, pero con soporte para sesiones independientes por pestaña
function getAuthToken() {
  // Generar un ID único para esta pestaña si no existe
  let tabId = sessionStorage.getItem('tabId');
  if (!tabId) {
    tabId = `tab_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    sessionStorage.setItem('tabId', tabId);
  }
  
  // Intentar obtener token específico de esta pestaña primero
  const tabToken = sessionStorage.getItem(`authToken_${tabId}`);
  if (tabToken) {
    return tabToken;
  }
  
  // Si no hay token específico de pestaña, usar el global (localStorage)
  return localStorage.getItem('authToken');
}

export async function apiCall(endpoint, options = {}) {
  const url = API_URL + endpoint;
  const headers = { 'Content-Type': 'application/json' };
  const token = getAuthToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  try {
    const res = await fetch(url, { ...options, headers });
    
    if (res.status === 401) {
      // Limpiar tanto sessionStorage como localStorage
      const tabId = sessionStorage.getItem('tabId');
      if (tabId) {
        sessionStorage.removeItem(`authToken_${tabId}`);
        sessionStorage.removeItem(`userRol_${tabId}`);
      }
      localStorage.removeItem('authToken');
      localStorage.removeItem('userRol');
      alert('⚠️ Sesión expirada. Inicia sesión nuevamente.');
      window.location.reload();
      return null;
    }

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Error del servidor' }));
      throw new Error(err.error || 'Error desconocido');
    }

    return await res.json();
  } catch (err) {
    console.error('API Error:', err);
    
    // Mensaje específico para conexión rechazada
    if (err.message.includes('Failed to fetch')) {
      alert('❌ No se pudo conectar con el servidor. ¿Está corriendo en http://localhost:3000?');
    } else {
      alert(`❌ ${err.message || 'Error de conexión'}`);
    }
    
    throw err;
  }
}

// APIs
export const AuthAPI = {
  login: (email, password) => apiCall('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password })
  })
};

export const MesaAPI = {
  listar: () => apiCall('/mesas'),
  getEstado: () => apiCall('/mesas/estado')
};

export const MenuAPI = {
  listar: () => apiCall('/menu'),
  crear: (nombre, descripcion, precio) => apiCall('/menu', {
    method: 'POST',
    body: JSON.stringify({ nombre, descripcion, precio })
  })
};

export const PedidoAPI = {
  crear: (mesaId, platos) => apiCall('/pedidos', {
    method: 'POST',
    body: JSON.stringify({ mesaId, platos })
  }),
  listar: () => apiCall('/pedidos'),
  listarListos: () => apiCall('/pedidos/listos'),
  getHistorial: () => apiCall('/pedidos/historial'),
  marcarListo: (id) => apiCall(`/pedidos/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ estado: 'listo' })
  }),
  getDetalle: (id) => apiCall(`/pedidos/${id}`),
  getPlatosPorMesa: (mesaId) => apiCall(`/pedidos/mesa/${mesaId}`)
};


// APIs para cajero
export const CajeroAPI = {
  getMesasActivas: () => apiCall('/ventas/mesas-activas'),
  getDetalleMesa: (mesaId) => apiCall(`/ventas/detalle-mesa/${mesaId}`)
};

export const VentaAPI = {
  cerrarCuenta: (mesaId, platos, total, impuestos, formaPago) => 
    apiCall('/ventas/cerrar-cuenta', {
      method: 'POST',
      body: JSON.stringify({ mesaId, platos, total, impuestos, formaPago })
    })
};