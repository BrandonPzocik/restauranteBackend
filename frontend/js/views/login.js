// js/views/login.js
import { AuthAPI } from '../api.js';

export function initLogin() {
  const form = document.getElementById('login-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const errorEl = document.getElementById('login-error');
    errorEl.textContent = '';

    try {
      const data = await AuthAPI.login(email, password);
      
      // ✅ Validar que la respuesta tenga la estructura correcta
      if (!data || !data.token) {
        throw new Error('Respuesta inválida del servidor');
      }
      
      if (!data.user || !data.user.rol) {
        console.error('Respuesta del login:', data);
        throw new Error('El servidor no devolvió el rol del usuario');
      }
      
      // ✅ Guardar token y rol (tanto en localStorage para persistencia como en sessionStorage para esta pestaña)
      const tabId = sessionStorage.getItem('tabId') || `tab_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem('tabId', tabId);
      
      // Guardar en localStorage para persistencia al recargar
      localStorage.setItem('authToken', data.token);
      localStorage.setItem('userRol', data.user.rol);
      
      // También guardar en sessionStorage con ID de pestaña para sesiones independientes
      sessionStorage.setItem(`authToken_${tabId}`, data.token);
      sessionStorage.setItem(`userRol_${tabId}`, data.user.rol);
      
      console.log('✅ Login exitoso - Rol guardado:', data.user.rol);
      
      if (data.user.rol === 'mozo') {
        window.showSection('mozo');
        window.initMozo(data.user.nombre);
      } else if (data.user.rol === 'cocina') {
        window.showSection('cocina');
        window.initCocina();
      } else if (data.user.rol === 'admin') {
        window.showSection('admin');
        window.initAdmin();
      }
      
      // ✅ Inicializar socket después del login
      if (typeof window.initSocket === 'function') {
        window.initSocket();
      }
    } catch (err) {
      console.error('Error en login:', err);
      errorEl.textContent = err.message || 'Error al iniciar sesión';
    }
  });
}