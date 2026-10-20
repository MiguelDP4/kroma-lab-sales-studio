/**
 * Enrutador SPA ligero basado en History API (Vanilla JS) con guardias RBAC por rol.
 */

import { store } from './store.js';

export class Router {
  constructor(routes = [], mountElementId = 'app') {
    this.routes = routes;
    this.mountElementId = mountElementId;
    this.currentRoute = null;
    this.activeViewCleanup = null;

    this.handlePopState = this.handlePopState.bind(this);
    this.handleLinkClick = this.handleLinkClick.bind(this);
  }

  /**
   * Inicializa escuchas de navegación en la ventana y el documento.
   */
  init() {
    if (typeof window !== 'undefined') {
      window.addEventListener('popstate', this.handlePopState);
      document.addEventListener('click', this.handleLinkClick);
      this.resolve(window.location.pathname);
    }
  }

  /**
   * Destruye escuchas de eventos (útil para tests).
   */
  destroy() {
    if (typeof window !== 'undefined') {
      window.removeEventListener('popstate', this.handlePopState);
      document.removeEventListener('click', this.handleLinkClick);
    }
  }

  /**
   * Intercepta clics en enlaces con atributo [data-link] o enlaces internos relativos.
   */
  handleLinkClick(e) {
    const link = e.target.closest('a');
    if (!link) return;

    // Ignorar enlaces de descarga directa
    if (link.hasAttribute('download')) {
      return;
    }

    const href = link.getAttribute('href');
    if (!href) return;

    // Ignorar enlaces externos, esquemas especiales, hashes de scroll (#cotizador) o clicks con teclas modificadoras
    if (
      href.startsWith('http://') ||
      href.startsWith('https://') ||
      href.startsWith('blob:') ||
      href.startsWith('data:') ||
      href.startsWith('javascript:') ||
      href.startsWith('mailto:') ||
      href.startsWith('tel:') ||
      href.startsWith('#') ||
      link.target === '_blank' ||
      e.ctrlKey ||
      e.metaKey
    ) {
      return;
    }

    e.preventDefault();
    this.navigate(href);
  }

  handlePopState() {
    this.resolve(window.location.pathname);
  }

  /**
   * Navega programáticamente a una URL sin recargar la página.
   * @param {string} path 
   * @param {boolean} [replace=false]
   */
  navigate(path, replace = false) {
    if (typeof window === 'undefined') return;

    if (replace) {
      window.history.replaceState({}, '', path);
    } else {
      window.history.pushState({}, '', path);
    }
    this.resolve(path);
  }

  /**
   * Resuelve y renderiza la vista correspondiente a la ruta actual.
   * @param {string} path 
   */
  resolve(path) {
    const normalizedPath = this.normalizePath(path);
    const userRole = store.state.user?.role || 'VISITOR';

    let matchedRoute = this.routes.find(r => r.path === normalizedPath);

    // Fallback 404 si la ruta no existe
    if (!matchedRoute) {
      matchedRoute = this.routes.find(r => r.path === '*') || {
        path: '*',
        render: () => `
          <div style="text-align: center; padding: 4rem 1rem;">
            <h1 style="font-size: 3rem; margin-bottom: 1rem;">404</h1>
            <p style="color: var(--text-secondary); margin-bottom: 1.5rem;">Página no encontrada</p>
            <a href="/" class="btn btn-primary" data-link>Volver al Inicio</a>
          </div>
        `
      };
    }

    // Guardia de Roles (RBAC): verificar si el rol tiene acceso
    if (matchedRoute.allowedRoles && !matchedRoute.allowedRoles.includes(userRole)) {
      this.renderAccessDenied(matchedRoute, userRole);
      return;
    }

    this.renderRoute(matchedRoute);
  }

  normalizePath(path) {
    if (!path || path === '') return '/';
    const clean = path.split('?')[0].split('#')[0];
    return clean.endsWith('/') && clean.length > 1 ? clean.slice(0, -1) : clean;
  }

  renderAccessDenied(route, userRole) {
    const mountEl = document.getElementById(this.mountElementId);
    if (!mountEl) return;

    if (this.activeViewCleanup) {
      this.activeViewCleanup();
      this.activeViewCleanup = null;
    }

    mountEl.innerHTML = `
      <div style="text-align: center; padding: 4rem 1rem; max-width: 600px; margin: 0 auto;">
        <span class="badge" style="color: var(--color-danger); border-color: var(--color-danger);">Acceso Restringido</span>
        <h2 style="font-size: 2rem; margin: 1rem 0;">Se requieren permisos especiales</h2>
        <p style="color: var(--text-secondary); margin-bottom: 2rem;">
          Esta sección requiere rol ${route.allowedRoles.join(' o ')}. Tu rol actual es <strong>${userRole}</strong>.
        </p>
        <div style="display: flex; gap: 1rem; justify-content: center;">
          <a href="/" class="btn btn-primary" data-link>Ir al Cotizador</a>
          <a href="#login" class="btn btn-secondary" onclick="window.__simulateRole && window.__simulateRole('ADMIN')">Acceder como Admin</a>
        </div>
      </div>
    `;
    this.updateActiveNavLinks(route.path);
  }

  renderRoute(route) {
    const mountEl = document.getElementById(this.mountElementId);
    if (!mountEl) return;

    // Ejecutar limpieza de la vista anterior
    if (this.activeViewCleanup) {
      this.activeViewCleanup();
      this.activeViewCleanup = null;
    }

    this.currentRoute = route;

    // Inyectar HTML
    if (typeof route.render === 'function') {
      mountEl.innerHTML = route.render();
    } else if (typeof route.render === 'string') {
      mountEl.innerHTML = route.render;
    }

    // Ejecutar callback de montaje
    if (typeof route.onMount === 'function') {
      this.activeViewCleanup = route.onMount();
    }

    this.updateActiveNavLinks(route.path);
  }

  updateActiveNavLinks(activePath) {
    if (typeof document === 'undefined') return;
    const links = document.querySelectorAll('#navRoleLinks a, a[data-link]');
    links.forEach(link => {
      const href = link.getAttribute('href');
      if (href === activePath) {
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
    });
  }
}
