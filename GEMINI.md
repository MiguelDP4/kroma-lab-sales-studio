# Guía Maestra, Arquitectura y Reglas del Proyecto — Kroma Lab Sales Studio

> **Propósito de este documento:** Servir como fuente única de verdad (Single Source of Truth) y directriz operativa para el agente de IA (Antigravity / Gemini) y desarrolladores en el proyecto **Kroma Lab Sales Studio**. Cualquier implementación o modificación de código debe alinearse estrictamente con los principios, arquitectura y reglas aquí estipuladas.

---

## 1. Visión General del Negocio y Alcance

**Kroma Lab Sales Studio** es una plataforma web híbrida diseñada para el negocio de impresión **UV DTF** y personalización de artículos en Guatemala (moneda base: Quetzales - `GTQ` / `Q`).

El sistema cumple una doble función estratégica:
1. **Embudo Público de Ventas y Captación (Tráfico de Anuncios):**
   * Landing page de alta conversión para visitantes provenientes de Meta Ads (Facebook/Instagram), TikTok Ads y YouTube.
   * Cotizador interactivo instantáneo de metros lineales / pliegos de UV DTF.
   * Captura de leads transparente (guarda la cotización y datos básicos de contacto vía WhatsApp/correo sin fricciones de registro extensas).
2. **Portal B2B de Clientes y Sistema ERP/Operativo Interno:**
   * Portal de autoservicio para clientes registrados: historial de pedidos, reorden instantánea, subida de archivos de impresión de alta resolución, seguimiento de estados de producción y facturación/pagos.
   * Panel de control para empleados y administradores para operar la cola de impresión de la máquina Audley, administrar clientes, catálogo y generar pedidos para clientes no registrados (ventas por WhatsApp/mostrador).
   * Módulo futuro de catálogo e-commerce para producto terminado (termos, tazas, pachones, etc.) con carrito de compras integrado.
   * Integración futura de chatbot de atención al cliente entrenado con la API de Gemini.

---

## 2. Pila Tecnológica y Hosting (Infraestructura de Costo Mínimo)

La arquitectura está diseñada para mantener los costos fijos en **$0.00 / Q0.00** durante la fase inicial y de crecimiento temprano:

| Componente | Tecnología Seleccionada | Proveedor de Hosting / Infraestructura | Nivel / Plan |
| :--- | :--- | :--- | :--- |
| **Estructura Repo** | Monorepo (`frontend/`, `backend/`, `shared/`) | GitHub (`MiguelDP4/kroma-lab-sales-studio`) | Público / Privado |
| **Frontend Web** | Vanilla HTML5, CSS3 moderno (Custom Properties, Nesting, Grid/Flexbox), JavaScript nativo (ES Modules, SPA Router, Reactive Store) | **Cloudflare Pages** | **Free Tier ($0)** (Ancho de banda ilimitado, SSL automático, routing SPA nativo vía `_redirects`) |
| **Backend API** | Node.js + Express + TypeScript + Prisma ORM + Zod | **Render** | **Free Tier ($0)** (Web Service) |
| **Base de Datos** | PostgreSQL relacional | **Neon Serverless PostgreSQL** | **Free Tier ($0)** (0.5 GB almacenamiento, escalado automático) |
| **Almacenamiento de Archivos** | Archivos de impresión de alta resolución (TIFF, PNG 600 DPI, PDF) y vistas previas | **Cloudflare R2** | **Free Tier ($0)** (10 GB/mes gratis, **cero costo por ancho de banda / egress fees**) |

---

## 3. Matriz de Control de Acceso y Roles (RBAC)

El frontend y el backend operan bajo una política estricta de **Default-Deny (Oculto y bloqueado por defecto)**:

```mermaid
flowchart TD
    Visitante["Visitante (No Registrado)"] -->|Acceso público| PublicRoutes["Landing Page + Cotizador Básico + Contacto WhatsApp"]
    
    Cliente["Cliente Registrado"] -->|Autenticación| CustomerRoutes["Cotizador Avanzado + Carrito/Checkout + Mis Pedidos + Mis Diseños + Perfil"]
    
    Empleado["Usuario Empleado"] -->|Permisos operativos| EmployeeRoutes["Tablero Producción Audley + Pedidos + Clientes + Crear Pedido Mostrador + Inventario"]
    
    Admin["Administrador"] -->|Control total| AdminRoutes["Todo lo de Empleado + Métricas + Gestión Usuarios + Matriz Roles/Permisos + Config Precios Cotizador"]
```

### Detalle de Capacidades por Rol:
1. **Visitante (Sin Registrar):**
   * Vista de inicio con catálogo visual de trabajos realizados.
   * Uso del cotizador público para estimar costos.
   * Bloqueo de carrito directo (se invita a registrarse o a enviar la cotización directa a WhatsApp).
2. **Cliente Registrado:**
   * Acceso completo al cotizador con precios B2B aplicados.
   * Carrito de compras y checkout.
   * Panel de pedidos propios: estados de producción en tiempo real, histórico de compras y saldos.
   * Repositorio de sus artes gráficas enviadas.
3. **Empleado:**
   * Tablero de control de producción (estados de orden: *En Cola Audley -> Impreso -> Laminado/Corte -> Listo -> Entregado*).
   * Lista general de pedidos y detalle de ítems.
   * Directorio de clientes.
   * **Creación de pedidos en mostrador:** Facilidad para registrar clientes no registrados in-situ o pedidos tomados por teléfono/WhatsApp.
   * Control de inventario de consumibles (rollos film UV DTF, tintas, barniz) y productos terminados.
4. **Administrador:**
   * Acceso irrestricto a todas las funciones operativas de empleado.
   * Gestión completa de usuarios (invitar empleados, vincular cuentas de clientes).
   * Configuración de roles y asignación granular de permisos.
   * Panel de configuración de tarifas del cotizador (precio por metro lineal, escalas por volumen, costos de acabados/diseño).

---

## 4. Regla Obligatoria de Pruebas Unitarias y Cobertura (> 85%)

> **IMPORTANTE — NORMA DE CALIDAD NO NEGOCIABLE:**
> Inspirado en el estándar de calidad de Arte Modelo, cualquier funcionalidad, módulo o cambio introducido en este repositorio debe respetar el siguiente protocolo de testing:

1. **Pruebas Unitarias Obligatorias en Cada Tarea:**
   * Todo nuevo endpoint, controlador, middleware, validador Zod, función de servicio, enrutador de frontend, componente o módulo de estado reactivo debe incluir sus tests correspondientes dentro de carpetas `__tests__/`.
   * No se dará por finalizada ninguna tarea de programación si el código nuevo carece de pruebas unitarias.
2. **Umbral Mínimo de Cobertura (> 85%):**
   * La suite de pruebas (configurada con Vitest tanto para backend como para frontend) debe mantener una cobertura mínima obligatoria de:
     * `statements >= 85%`
     * `lines >= 85%`
     * `functions >= 85%`
     * `branches >= 85%`
3. **100% Tests Passing:**
   * Tras cualquier cambio en el código, se debe ejecutar la suite de pruebas (`npm test` / `npm run test:coverage`).
   * **El 100% de las pruebas deben pasar sin errores.** Queda estrictamente prohibido commitear o entregar tareas con pruebas rotas o fallidas.

---

## 5. Directrices de Arquitectura del Código

### A. Frontend (Vanilla HTML5, CSS3, ES Modules)
* **Cero Frameworks Pesados:** Nada de React, Angular, Vue o Next.js. El código se ejecuta directamente en el navegador.
* **Modularidad Limpia (`src/`):**
  * `index.html`: Shell único de la aplicación.
  * `css/`: Variables maestras de diseño (`theme.css`), reseteo y estilos modulares.
  * `js/router.js`: Enrutador SPA ligero basado en el History API (`pushState`, `popstate`).
  * `js/store.js`: Manejo de estado reactivo global para usuario autenticado, token JWT y permisos.
  * `js/api/`: Cliente de consumo REST centralizado con refresco automático de JWT (proactivo y reactivo ante HTTP 401).
  * `js/views/`: Vistas independientes (`home.js`, `quoter.js`, `orders.js`, `admin.js`, etc.).
  * `js/components/`: Componentes UI reutilizables (modales `<dialog>`, tablas con paginación, notificaciones toast, uploader drag-and-drop).

### B. Backend (Node.js, Express, Prisma, PostgreSQL)
* **Arquitectura por Capas:** Rutas (`routes/`) -> Middlewares (`middlewares/`) -> Controladores (`controllers/`) -> Servicios/Base de Datos (`prisma/`).
* **Seguridad:**
  * Hasheo seguro de contraseñas con `bcryptjs`.
  * Tokens de sesión JWT de corta duración + `refreshToken` seguro con hash en base de datos y cookies `httpOnly`.
  * Validación exhaustiva de payloads con esquemas `Zod`.
  * IDs legibles con prefijo identificador (`USR_`, `CUS_`, `ORD_`, `PRD_`, etc.).

---

## 6. Regla Obligatoria de Documentación Viva (`DOCUMENTATION.md`)

> **NORMA DE MANTENIMIENTO TÉCNICO:**
> Toda la arquitectura, mapa de archivos, esquema de base de datos, catálogo de endpoints, reglas de diseño visual y algoritmos de negocio deben mantenerse permanentemente actualizados en el archivo raíz **`DOCUMENTATION.md`**.

1. **Documentación Sincronizada con el Código:**
   * Cada vez que se agregue una nueva carpeta, vista, componente, endpoint, migración de Prisma o cambio en las fórmulas de cálculo (como las tarifas del cotizador o las variables de color), **se debe actualizar de inmediato `DOCUMENTATION.md`**.
2. **Contenido Obligatorio de `DOCUMENTATION.md`:**
   * **Mapa de Estructura de Archivos:** Ubicación y propósito de cada archivo del frontend, backend y shared.
   * **Esquema de Base de Datos y Modelos:** Relaciones, enums y campos de Prisma.
   * **Catálogo de Endpoints REST:** Métodos, rutas, roles requeridos y contratos de request/response.
   * **Algoritmos y Reglas de Negocio:** Lógica matemática del cotizador, ancho útil de bobina, tarifas y escalas de volumen.
   * **Tokens del Sistema de Diseño:** Paleta de colores (`--space-indigo`, `--regal-navy`, `--baltic-blue`, `--cerulean`, `--powder-blue`) y su comportamiento en Modo Claro y Modo Oscuro.
   * **Matriz Maestra de Roles y Permisos (RBAC):** Catálogo de permisos asignados a Visitante, Cliente, Empleado y Administrador.

---

## 7. Flujo de Trabajo GitFlow Obligatorio

> **NORMA DE CONTROL DE VERSIONES:**
> El desarrollo del proyecto debe seguir estrictamente la metodología **GitFlow**. Queda estrictamente prohibido realizar commits directos sobre `development` o `main`.

### Estructura de Ramas:
* **`main` (Producción):**
  * Representa el código estable en producción.
  * Solo recibe merges provenientes de `development` al momento de liberar una versión o entrega formal.
* **`development` (Staging y Rama Principal por Defecto):**
  * Es la **rama principal y predeterminada del repositorio**.
  * Actúa como entorno de Staging y base de integración de todos los features aprobados.
* **Ramas de Trabajo Temporales (`feature/*`, `fix/*`, `docs/*`, `test/*`):**
  * Cada cambio, requerimiento o corrección debe desarrollarse en su propia rama creada a partir de `development`:
    ```bash
    git checkout -b feature/<nombre-tarea> development
    ```

### Protocolo de Integración y Aprobación:
1. **Desarrollo y Testing en la Rama:** Se implementa el código y se garantiza el 100% de tests passing con cobertura > 85%.
2. **Commit Atómico:** Mensajes descriptivos bajo estándar Conventional Commits (`feat:`, `fix:`, `docs:`, `test:`, `refactor:`).
3. **Solicitud de Visto Bueno:** Al finalizar la tarea, se le presenta el avance detallado a Miguel para revisión.
4. **Merge a `development`:** **Únicamente tras recibir el visto bueno explícito de Miguel**, se realiza el merge a `development`.

---

## 8. Regla Obligatoria de Diseño y Desarrollo Mobile-First

> **NORMA DE EXPERIENCIA DE USUARIO (UX/UI):**
> Toda la interfaz pública, cotizador, catálogo, tablas de gestión interna, modales, componentes y tableros interactivos deben construirse y optimizarse obligatoriamente con **mentalidad Mobile-First**.

1. **Diseño y Estilizado Progresivo:**
   * La estructura HTML y el CSS base deben pensarse primero para pantallas pequeñas (smartphones desde 320px - 375px de ancho) y expandirse progresivamente hacia tablets y escritorios mediante `@media (min-width: ...)`.
2. **Tablas y Listados Adaptativos:**
   * Ninguna tabla o panel de control debe desbordar o romper el viewport horizontal en móviles.
   * Se deben implementar contenedores con scroll horizontal táctil suave (`overflow-x: auto; -webkit-overflow-scrolling: touch;`), vistas de tarjeta (card view) o colapso responsivo de columnas secundarias.
3. **Zonas de Toque y Ergonomía Táctil:**
   * Botones, selectores, checkboxes e inputs interactivos deben cumplir con un tamaño mínimo de toque ergonómico (mínimo 44 × 44 px de área táctil).
   * Modales y hojas desplegables (drawers) deben adaptarse al 100% del ancho móvil con zonas de cierre (X y botón cerrar) cómodas con una sola mano.
4. **Canvas y Simuladores Gráficos:**
   * El simulador de bobina Audley y el dropzone deben escalar dinámicamente según el ancho de pantalla (`max-width: 100%`, auto-resize en Canvas), manteniendo legibilidad sin recortes.

## 7. Regla de Base de Datos para Pruebas Automatizadas
- **Aislamiento absoluto de Staging:** Queda estrictamente prohibido ejecutar pruebas automatizadas (unitarias, de integración o e2e) contra la base de datos de staging (`neondb`), ya que dicha base de datos se utiliza para pruebas manuales y validación de features antes de producción.
- **Base de datos exclusiva de tests:** Todas las suites de pruebas deben conectarse y operar exclusivamente sobre la base de datos de test (`kroma_test`).
