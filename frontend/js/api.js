// frontend/js/api.js
const API_URL = 'http://localhost:3000/api';

function getAuthToken() {
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
      localStorage.removeItem('authToken');
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
  }),
  getUser: () => apiCall('/auth/me')
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

// ✅ ¡AGREGA ESTAS FUNCIONES FALTANTES!
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
  getPlatosPorMesa: (mesaId) => apiCall(`/pedidos/mesa/${mesaId}`),
  
  // ✅ FUNCIONES NUEVAS PARA EL PANEL DEL MOZO
  getPedidosEnCurso: () => apiCall('/pedidos/en-curso'),
  getPedidosCobrados: () => apiCall('/pedidos/cobrados')
};

// APIs para cajero
export const CajeroAPI = {
  getMesasActivas: () => apiCall('/cajero/mesas-activas'),
  getDetalleMesa: (mesaId) => apiCall(`/cajero/mesa/${mesaId}`)
};

export const VentaAPI = {
  cerrarCuenta: (mesaId, platos, total, impuestos, formaPago) => 
    apiCall('/ventas/cerrar', {
      method: 'POST',
      body: JSON.stringify({ mesaId, platos, total, impuestos, formaPago })
    })
};