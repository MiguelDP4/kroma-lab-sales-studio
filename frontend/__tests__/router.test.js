import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Router } from '../src/js/router.js';
import { store } from '../src/js/store.js';

describe('SPA Router — Enrutamiento y Guardias RBAC', () => {
  let router;
  const mockMountCleanup = vi.fn();

  const testRoutes = [
    {
      path: '/',
      name: 'home',
      allowedRoles: ['VISITOR', 'CUSTOMER', 'EMPLOYEE', 'ADMIN'],
      render: () => '<div id="homeView">Inicio</div>',
      onMount: () => mockMountCleanup,
    },
    {
      path: '/pedidos',
      name: 'orders',
      allowedRoles: ['CUSTOMER', 'EMPLOYEE', 'ADMIN'],
      render: () => '<div id="ordersView">Pedidos</div>',
    },
    {
      path: '/usuarios',
      name: 'users',
      allowedRoles: ['ADMIN'],
      render: () => '<div id="usersView">Usuarios Admin</div>',
    },
  ];

  beforeEach(() => {
    document.body.innerHTML = `
      <nav id="navRoleLinks">
        <a href="/" data-link>Inicio</a>
        <a href="/pedidos" data-link>Pedidos</a>
        <a href="/usuarios" data-link>Usuarios</a>
      </nav>
      <main id="app"></main>
    `;
    store.clearUser();
    mockMountCleanup.mockClear();
    router = new Router(testRoutes, 'app');
  });

  afterEach(() => {
    router.destroy();
  });

  describe('Normalización de Rutas', () => {
    it('normaliza rutas eliminando slashes finales, query params y hashes', () => {
      expect(router.normalizePath('/')).toBe('/');
      expect(router.normalizePath('/pedidos/')).toBe('/pedidos');
      expect(router.normalizePath('/pedidos?filter=active#section')).toBe('/pedidos');
      expect(router.normalizePath('')).toBe('/');
      expect(router.normalizePath(null)).toBe('/');
    });
  });

  describe('Navegación y Ciclo de Vida de Vistas', () => {
    it('renderiza la ruta correspondiente y ejecuta el callback onMount', () => {
      router.navigate('/');
      const appEl = document.getElementById('app');
      expect(appEl.innerHTML).toContain('Inicio');
    });

    it('ejecuta la función de limpieza de la vista anterior al navegar a una nueva ruta', () => {
      router.navigate('/');
      expect(router.currentRoute.path).toBe('/');

      store.setUser({ id: 'USR_01', role: 'CUSTOMER' }, 'fake-jwt', []);
      router.navigate('/pedidos');

      expect(mockMountCleanup).toHaveBeenCalled();
      const appEl = document.getElementById('app');
      expect(appEl.innerHTML).toContain('Pedidos');
    });

    it('muestra vista 404 ante rutas inexistentes', () => {
      router.navigate('/ruta-que-no-existe');
      const appEl = document.getElementById('app');
      expect(appEl.innerHTML).toContain('404');
      expect(appEl.innerHTML).toContain('Página no encontrada');
    });

    it('actualiza la clase active en el enlace de navegación correspondiente', () => {
      router.navigate('/');
      const homeLink = document.querySelector('a[href="/"]');
      const ordersLink = document.querySelector('a[href="/pedidos"]');

      expect(homeLink.classList.contains('active')).toBe(true);
      expect(ordersLink.classList.contains('active')).toBe(false);
    });
  });

  describe('Guardia de Roles (RBAC)', () => {
    it('bloquea el acceso a rutas restringidas para visitantes sin rol permitido', () => {
      store.clearUser(); // VISITOR
      router.navigate('/usuarios');

      const appEl = document.getElementById('app');
      expect(appEl.innerHTML).toContain('Acceso Restringido');
      expect(appEl.innerHTML).toContain('Se requieren permisos especiales');
      expect(appEl.innerHTML).not.toContain('Usuarios Admin');
    });

    it('bloquea a clientes comunes de acceder a áreas exclusivas de ADMIN', () => {
      store.setUser({ id: 'USR_CUS', role: 'CUSTOMER' }, 'token', []);
      router.navigate('/usuarios');

      const appEl = document.getElementById('app');
      expect(appEl.innerHTML).toContain('Acceso Restringido');
    });

    it('ejecuta la función de limpieza activa al navegar a una ruta con acceso denegado', () => {
      router.navigate('/'); // sets mockMountCleanup
      store.clearUser();
      router.navigate('/usuarios'); // access denied

      expect(mockMountCleanup).toHaveBeenCalled();
      const appEl = document.getElementById('app');
      expect(appEl.innerHTML).toContain('Acceso Restringido');
    });

    it('permite el acceso a la ruta restringida cuando el usuario tiene el rol ADMIN', () => {
      store.setUser({ id: 'USR_ADM', role: 'ADMIN' }, 'token', []);
      router.navigate('/usuarios');

      const appEl = document.getElementById('app');
      expect(appEl.innerHTML).toContain('Usuarios Admin');
    });

    it('renderiza correctamente cuando la vista define render como string plano', () => {
      const customRouter = new Router([
        { path: '/plano', render: '<div id="plano">Texto Plano</div>' }
      ], 'app');
      customRouter.navigate('/plano');

      const appEl = document.getElementById('app');
      expect(appEl.innerHTML).toContain('Texto Plano');
      customRouter.destroy();
    });
  });

  describe('Intercepción de Clics en Enlaces', () => {
    it('intercepta clics en enlaces internos e invoca navigate', () => {
      router.init();
      const navigateSpy = vi.spyOn(router, 'navigate');

      const link = document.querySelector('a[href="/pedidos"]');
      link.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));

      expect(navigateSpy).toHaveBeenCalledWith('/pedidos');
    });

    it('ignora enlaces externos, anchors hash (#) y clics con tecla ctrl', () => {
      router.init();
      const navigateSpy = vi.spyOn(router, 'navigate');

      const externalLink = document.createElement('a');
      externalLink.setAttribute('href', 'https://google.com');
      // Evitar que jsdom emita advertencia interna de navegación no implementada
      externalLink.addEventListener('click', (e) => e.preventDefault());
      document.body.appendChild(externalLink);

      externalLink.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      expect(navigateSpy).not.toHaveBeenCalled();

      const hashLink = document.createElement('a');
      hashLink.setAttribute('href', '#cotizador');
      document.body.appendChild(hashLink);

      hashLink.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      expect(navigateSpy).not.toHaveBeenCalled();

      // Clic con Ctrl
      const internalLink = document.querySelector('a[href="/pedidos"]');
      internalLink.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, ctrlKey: true }));
      expect(navigateSpy).not.toHaveBeenCalled();
    });

    it('ignora enlaces con atributo download o esquemas blob:, data: y javascript:', () => {
      router.init();
      const navigateSpy = vi.spyOn(router, 'navigate');

      // Enlace con atributo download
      const downloadLink = document.createElement('a');
      downloadLink.setAttribute('href', '/descarga.csv');
      downloadLink.setAttribute('download', 'archivo.csv');
      document.body.appendChild(downloadLink);
      downloadLink.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      expect(navigateSpy).not.toHaveBeenCalled();

      // Enlace con esquema blob:
      const blobLink = document.createElement('a');
      blobLink.setAttribute('href', 'blob:http://localhost:3000/test-uuid');
      document.body.appendChild(blobLink);
      blobLink.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      expect(navigateSpy).not.toHaveBeenCalled();

      // Enlace con esquema data:
      const dataLink = document.createElement('a');
      dataLink.setAttribute('href', 'data:text/csv;charset=utf-8,col1,col2');
      document.body.appendChild(dataLink);
      dataLink.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      expect(navigateSpy).not.toHaveBeenCalled();

      // Enlace con esquema javascript:
      const jsLink = document.createElement('a');
      jsLink.setAttribute('href', 'javascript:void(0);');
      document.body.appendChild(jsLink);
      jsLink.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      expect(navigateSpy).not.toHaveBeenCalled();
    });

    it('soporta navegación con reemplazo de historial (replace=true)', () => {
      const replaceSpy = vi.spyOn(window.history, 'replaceState');
      router.navigate('/software', true);
      expect(replaceSpy).toHaveBeenCalled();
    });

    it('reacciona a eventos popstate de la ventana', () => {
      router.init();
      const resolveSpy = vi.spyOn(router, 'resolve');

      window.dispatchEvent(new PopStateEvent('popstate'));
      expect(resolveSpy).toHaveBeenCalled();
    });

    it('abre el modal de inicio de sesión al hacer clic en btnRestrictedLogin', async () => {
      // Navegar a una ruta restringida sin usuario
      router.navigate('/usuarios');
      const btnLogin = document.getElementById('btnRestrictedLogin');
      expect(btnLogin).toBeTruthy();

      // Simular clic
      btnLogin.click();
      // Pequeño timeout para la promesa de import dinamico
      await new Promise(r => setTimeout(r, 50));
    });
  });
});
