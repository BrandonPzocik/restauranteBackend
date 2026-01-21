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

async function checkAuthAndRedirect() {
  const token = localStorage.getItem('authToken');
  
  if (token) {
    try {
      const user = await apiCall('/auth/me');
      
      if (user.rol === 'mozo') {
        showSection('mozo');
        initMozo(user.nombre);
      } else if (user.rol === 'cocina') {
        showSection('cocina');
        initCocina();
      } else if (user.rol === 'admin') {
        showSection('admin');
        initAdmin();
      } else if (user.rol === 'cajero') {
        showSection('cajero');
        initCajero();
      }
      return;
    } catch (err) {
      console.error('Sesión inválida:', err);
      localStorage.removeItem('authToken');
    }
  }
  
  showSection('login');
  initLogin();
}

function logout() {
  localStorage.removeItem('authToken');
  showSection('login');
  initLogin();
}

document.addEventListener('DOMContentLoaded', async () => {
  await checkAuthAndRedirect();
  
  ['mozo', 'cocina', 'admin', 'cajero'].forEach(role => {
    const btn = document.getElementById(`logout-${role}`);
    if (btn) btn.addEventListener('click', logout);
  });

  // Cargar jsPDF
  if (typeof window.jsPDF === 'undefined') {
    const script = document.createElement('script');
    script.src = '../lib/jspdf.umd.min.js';
    script.onload = () => { window.jsPDF = window.jspdf.jsPDF; };
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
      
      // Recargar según rol
      const userRol = localStorage.getItem('userRol');
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