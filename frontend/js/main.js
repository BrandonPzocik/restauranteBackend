// frontend/js/main.js
import { initLogin } from './views/login.js';
import { initMozo } from './views/mozo.js';
import { initCocina } from './views/cocina.js';
import { initAdmin } from './views/admin.js';
import { initCajero } from './views/cajero.js';
import { apiCall } from './api.js';

window.initMozo = initMozo;
window.initCocina = initCocina;
window.initAdmin = initAdmin;
window.initCajero = initCajero;
window.showSection = showSection;

function showSection(name) {
  document.querySelectorAll('section').forEach(s => s.classList.remove('active'));
  document.getElementById(name + '-section')?.classList.add('active');
}

// ✅ Función para obtener el rol actual
function getCurrentRol() {
  const tabId = sessionStorage.getItem('tabId');
  return tabId ? sessionStorage.getItem(`userRol_${tabId}`) : null || localStorage.getItem('userRol');
}

// ✅ Función para configurar listeners del socket (accesible globalmente)
function setupSocketListeners() {
  if (!window.socket || !window.socket.connected) {
    console.warn('⚠️ Socket no está conectado, no se pueden configurar listeners');
    return;
  }
  
  // Limpiar listeners anteriores antes de agregar nuevos (evitar duplicados)
  window.socket.removeAllListeners('nuevo-pedido');
  window.socket.removeAllListeners('pedido-listo');
  
  const currentRol = getCurrentRol();
  console.log('🔧 Configurando listeners para rol:', currentRol, '- Socket ID:', window.socket.id);
  
  // Eventos específicos por rol
  if (currentRol === 'cocina') {
    window.socket.on('nuevo-pedido', (data) => {
      console.log('🔔 [COCINA] Nuevo pedido recibido:', data);
      if (typeof window.loadPedidosCocina === 'function') {
        console.log('✅ Llamando a loadPedidosCocina...');
        window.loadPedidosCocina();
      } else {
        console.warn('⚠️ loadPedidosCocina no está disponible');
      }
    });
    console.log('✅ Listener "nuevo-pedido" configurado para cocina');
  }
  
  if (currentRol === 'mozo') {
    window.socket.on('pedido-listo', (data) => {
      console.log('✅ [MOZO] Pedido listo recibido:', data);
      alert(`🔔 ¡El pedido de la mesa ${data.mesa} está listo para servir!`);
      if (typeof window.loadPedidosListos === 'function') {
        window.loadPedidosListos();
      }
    });
    console.log('✅ Listener "pedido-listo" configurado para mozo');
  }
}

// ✅ Función para unirse a la sala de cocina si es necesario
function joinCocinaIfNeeded() {
  const currentRol = getCurrentRol();
  if (currentRol === 'cocina' && window.socket && window.socket.connected) {
    window.socket.emit('join-cocina');
    console.log('🍽️ Emitido join-cocina para socket:', window.socket.id);
  }
}

// ✅ NUEVO: Función para inicializar Socket.IO con reconexión automática
function initSocket() {
  // Si ya existe un socket conectado, solo reconfigurar listeners
  if (window.socket && window.socket.connected) {
    console.log('✅ Socket ya está conectado, reconfigurando listeners...');
    setupSocketListeners();
    joinCocinaIfNeeded();
    return;
  }
  
  // Si existe pero está desconectado, desconectarlo primero
  if (window.socket) {
    console.log('🔄 Desconectando socket anterior...');
    window.socket.removeAllListeners();
    window.socket.disconnect();
  }
  
  const userRol = getCurrentRol();
  console.log('🔌 Inicializando socket para rol:', userRol);
  
  window.socket = io('http://localhost:3000', {
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: Infinity,
    query: {
      tabId: `tab_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    }
  });
  
  // Eventos de conexión
  window.socket.on('connect', () => {
    console.log('✅ Socket conectado:', window.socket.id);
    
    // Configurar listeners DESPUÉS de conectarse
    setupSocketListeners();
    
    // Unirse a la sala de cocina si es necesario
    joinCocinaIfNeeded();
  });
  
  window.socket.on('disconnect', (reason) => {
    console.log('❌ Socket desconectado:', reason);
  });
  
  window.socket.on('reconnect', (attemptNumber) => {
    console.log('🔄 Socket reconectado después de', attemptNumber, 'intentos');
    setupSocketListeners();
    joinCocinaIfNeeded();
  });
  
  // Hacer accesible globalmente
  window.initSocket = initSocket;
  window.setupSocketListeners = setupSocketListeners;
  window.joinCocinaIfNeeded = joinCocinaIfNeeded;
}

// ✅ Verificar sesión al cargar la página
async function checkAuthAndRedirect() {
  // Obtener token de sessionStorage específico de pestaña o de localStorage
  const tabId = sessionStorage.getItem('tabId') || `tab_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  sessionStorage.setItem('tabId', tabId);
  
  const token = sessionStorage.getItem(`authToken_${tabId}`) || localStorage.getItem('authToken');
  
  // ✅ Si hay token, verificar con el servidor y redirigir automáticamente
  if (token) {
    try {
      const user = await apiCall('/auth/me');
      
      if (!user || !user.rol) {
        throw new Error('Usuario inválido');
      }
      
      // ✅ Guardar/actualizar userRol (tanto en localStorage como en sessionStorage)
      localStorage.setItem('userRol', user.rol);
      sessionStorage.setItem(`userRol_${tabId}`, user.rol);
      console.log('✅ Sesión válida - Rol:', user.rol);
      
      // Redirigir según rol automáticamente
      if (user.rol === 'mozo') {
        showSection('mozo');
        initMozo(user.nombre);
      } else if (user.rol === 'cocina') {
        showSection('cocina');
        initCocina(); // Esto también inicializa el socket si es necesario
      } else if (user.rol === 'admin') {
        showSection('admin');
        initAdmin();
      } else if (user.rol === 'cajero') {
        showSection('cajero');
        initCajero();
      }
      
      // ✅ Iniciar Socket.IO después de verificar sesión (si no se inicializó ya)
      if (!window.socket || !window.socket.connected) {
        initSocket();
      } else {
        // Si ya está conectado, reconfigurar listeners
        if (typeof window.setupSocketListeners === 'function') {
          window.setupSocketListeners();
        }
        // Asegurar que se una a la sala de cocina si es necesario
        if (user.rol === 'cocina' && window.socket.connected) {
          window.socket.emit('join-cocina');
        }
      }
      return;
    } catch (err) {
      console.error('Sesión inválida:', err);
      const tabId = sessionStorage.getItem('tabId');
      if (tabId) {
        sessionStorage.removeItem(`authToken_${tabId}`);
        sessionStorage.removeItem(`userRol_${tabId}`);
      }
      localStorage.removeItem('authToken');
      localStorage.removeItem('userRol');
      // Si hay un socket, desconectarlo
      if (window.socket) {
        window.socket.disconnect();
        window.socket = null;
      }
    }
  }
  
  // Si no hay sesión válida, mostrar login
  showSection('login');
  initLogin();
}

// ✅ Función para cerrar sesión
function logout() {
  // Limpiar tanto sessionStorage como localStorage
  const tabId = sessionStorage.getItem('tabId');
  if (tabId) {
    sessionStorage.removeItem(`authToken_${tabId}`);
    sessionStorage.removeItem(`userRol_${tabId}`);
  }
  localStorage.removeItem('authToken');
  localStorage.removeItem('userRol');
  
  // Desconectar socket
  if (window.socket) {
    window.socket.disconnect();
    window.socket = null;
  }
  
  // Volver al login
  showSection('login');
  initLogin();
}

// ✅ NOTA: Con sessionStorage, cada pestaña tiene su propia sesión independiente
// No necesitamos sincronización entre pestañas porque cada una es independiente

document.addEventListener('DOMContentLoaded', async () => {
  // ✅ Verificar sesión al inicio
  await checkAuthAndRedirect();
  
  // ✅ Configurar botones de logout
  ['mozo', 'cocina', 'admin', 'cajero'].forEach(role => {
    const btn = document.getElementById(`logout-${role}`);
    if (btn) {
      btn.addEventListener('click', logout);
    }
  });

  // Cargar jsPDF
  if (typeof window.jsPDF === 'undefined') {
    const script = document.createElement('script');
    script.src = 'lib/jspdf.umd.min.js';
    script.onload = () => {
      window.jsPDF = window.jspdf.jsPDF;
    };
    document.head.appendChild(script);
  }

  // Eventos del modal de ticket
  document.getElementById('print-ticket')?.addEventListener('click', () => {
    const printWindow = window.open('', '', 'height=600,width=800');
    printWindow.document.write(`
      <html>
      <head><title>Ticket</title></head>
      <body onload="window.print(); window.close();">
        <div style="font-family:monospace; max-width:400px; margin:0 auto;">
          ${document.getElementById('ticket-content').innerHTML}
        </div>
      </body>
      </html>
    `);
    printWindow.document.close();
  });

  document.getElementById('download-ticket')?.addEventListener('click', () => {
    if (typeof window.jsPDF === 'undefined') {
      alert('⚠️ jsPDF no cargado');
      return;
    }
    
    const { mesaNumero, platos, subtotal, impuestos, total } = window.currentTicketData;
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    doc.setFontSize(20);
    doc.text("TICKET RESTAURANTE", 20, 20);
    doc.setFontSize(12);
    doc.text(`Mesa: ${mesaNumero}`, 20, 30);
    doc.text(`Fecha: ${new Date().toLocaleString()}`, 20, 35);
    
    let y = 45;
    platos.forEach(p => {
      const line = `${p.cantidad}x ${p.nombre}`;
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
  });

  document.getElementById('close-ticket')?.addEventListener('click', () => {
    document.getElementById('ticket-modal').style.display = 'none';
  });

  // Cerrar cuenta en backend
  document.getElementById('confirm-cerrar')?.addEventListener('click', async () => {
    try {
      const { mesaId, mesaNumero, platos, total, impuestos } = window.currentTicketData;
      
      await apiCall('/ventas/cerrar', {
        method: 'POST',
        body: JSON.stringify({ 
          mesaId, 
          platos, 
          total,
          impuestos,
          formaPago: 'efectivo'
        })
      });
      
      alert('✅ Cuenta cerrada exitosamente');
      document.getElementById('ticket-modal').style.display = 'none';
      
      // Actualizar UI según el rol
      const tabId = sessionStorage.getItem('tabId');
      const userRol = tabId ? sessionStorage.getItem(`userRol_${tabId}`) : null || localStorage.getItem('userRol');
      
      if (userRol === 'cajero') {
        if (window.loadMesasActivas) window.loadMesasActivas();
      } else if (userRol === 'mozo') {
        if (window.loadMesas) window.loadMesas();
        if (window.loadPedidosListos) window.loadPedidosListos();
        if (window.loadHistorialMozo) window.loadHistorialMozo();
      }
      
    } catch (err) {
      console.error('Error al cerrar cuenta:', err);
      alert(`❌ ${err.message || 'Error al cerrar la cuenta'}`);
    }
  });
});

// Función legacy (opcional)
window.generarTicket = function(mesaNumero, platos, subtotal, impuestos, total) {
  console.log('generarTicket llamado (legacy)');
};