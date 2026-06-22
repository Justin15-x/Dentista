// js/app.js - Controlador principal y router

import { Auth } from './supabase.js';

// Rutas protegidas
const ROUTES = {
  login: '/index.html',
  dentist: '/pages/dentist-dashboard.html',
  patient: '/pages/patient-dashboard.html'
};

export const App = {
  currentUser: null,

  async init() {
    // Escuchar cambios de autenticación
    Auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        this.currentUser = null;
        this.redirect(ROUTES.login);
      } else if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
        if (session) {
          this.currentUser = await Auth.getCurrentUser();
          this.enforceRoute();
        }
      }
    });
  },

  async enforceRoute() {
    const currentPath = window.location.pathname;
    const isLoginPage = currentPath.includes('login') || currentPath === '/' || currentPath.endsWith('index.html');

    if (!this.currentUser) {
      if (!isLoginPage) this.redirect(ROUTES.login);
      return;
    }

    const role = this.currentUser.role;

    // Si está en login y ya autenticado, redirigir al dashboard
    if (isLoginPage) {
      this.redirect(role === 'dentist' ? ROUTES.dentist : ROUTES.patient);
      return;
    }

    // Proteger rutas por rol
    const isDentistPage = currentPath.includes('dentist-dashboard');
    const isPatientPage = currentPath.includes('patient-dashboard');

    if (role === 'patient' && isDentistPage) {
      this.redirect(ROUTES.patient);
    } else if (role === 'dentist' && isPatientPage) {
      this.redirect(ROUTES.dentist);
    }
  },

  redirect(path) {
    if (window.location.pathname !== path) {
      window.location.href = path;
    }
  },

  async logout() {
    await Auth.signOut();
  }
};

// Utils globales
export const Utils = {
  formatDate(dateStr) {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('es-MX', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });
  },

  formatDateTime(dateStr) {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleString('es-MX', {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  },

  formatCurrency(amount) {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency', currency: 'MXN'
    }).format(amount || 0);
  },

  showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast toast--${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  },

  showLoading(container) {
    container.innerHTML = `<div class="loading-spinner"><div class="spinner"></div><p>Cargando...</p></div>`;
  },

  confirmDelete(itemName) {
    return confirm(`¿Eliminar "${itemName}"? Esta acción no se puede deshacer.`);
  }
};
export { Auth };
