# Kroma Lab Sales Studio 🖨️✨

Plataforma web híbrida B2B de ventas, cotizador interactivo en tiempo real y sistema ERP operativo para taller de impresión industrial **UV DTF** (*Direct to Film*) en Guatemala.

[![Node.js](https://img.shields.io/badge/Node.js-v20+-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7+-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vanilla JS](https://img.shields.io/badge/Frontend-Vanilla_JS-F7DF1E?logo=javascript&logoColor=black)](https://developer.mozilla.org/)
[![Prisma ORM](https://img.shields.io/badge/ORM-Prisma-2D3748?logo=prisma&logoColor=white)](https://www.prisma.io/)
[![PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL-4169E1?logo=postgresql&logoColor=white)](https://neon.tech/)
[![Cloudflare](https://img.shields.io/badge/Cloudflare-Pages_%26_R2-F38020?logo=cloudflare&logoColor=white)](https://pages.cloudflare.com/)
[![Playwright](https://img.shields.io/badge/E2E-Playwright-2EAD33?logo=playwright&logoColor=white)](https://playwright.dev/)
[![Vitest](https://img.shields.io/badge/Tests-Passing-2EA44F?logo=vitest&logoColor=white)](https://vitest.dev/)

---

## 📋 Tabla de Contenidos

1. [Visión General y Alcance](#-visión-general-y-alcance)
2. [Arquitectura de Infraestructura ($0 Costos Fijos)](#-arquitectura-de-infraestructura-0-costos-fijos)
3. [Estructura del Monorepo](#-estructura-del-monorepo)
4. [Instalación y Configuración Local](#-instalación-y-configuración-local)
5. [Scripts de Ejecución](#-scripts-de-ejecución)
6. [Matriz de Roles y Control de Acceso (RBAC)](#-matriz-de-roles-y-control-de-acceso-rbac)
7. [Normas de Calidad y Protocolos de Ingeniería](#-normas-de-calidad-y-protocolos-de-ingeniería)
8. [Documentación Viva](#-documentación-viva)

---

## 🎯 Visión General y Alcance

**Kroma Lab Sales Studio** opera bajo una doble función estratégica diseñada para el mercado de impresión y personalización sobre superficies rígidas en Guatemala (moneda base: Quetzales — `GTQ` / `Q`):

### 1. Embudo Público de Ventas (Tráfico Ads & Leads)
* **Landing Page de Alta Conversión:** Optimizada para tráfico proveniente de Meta Ads (Facebook/Instagram), TikTok Ads y YouTube.
* **Cotizador Interactivo en Tiempo Real:** 
  * Modos duales de cotización: **Por stickers** (ingreso de piezas) o **Por metro** (cálculo automático del máximo de piezas que caben en el metraje sin sobrepasarse).
  * Simulador gráfico en Canvas del ancho útil de bobina de la impresora Audley (28 cm útiles con separación técnica de 3 mm).
* **Captura Fluida de Leads:** Conversión instantánea a WhatsApp comercial y guardado de cotizaciones con enlace directo y desglose técnico sin forzar registro inicial.

### 2. Portal B2B de Clientes y ERP Operativo Interno
* **Portal de Autoservicio para Clientes:** Consulta de historial de pedidos, saldo pendiente, reórdenes inmediatas, subida de artes en alta resolución (TIFF/PNG/PDF a 600 DPI) y seguimiento del estado de producción.
* **Tablero Kanban de Taller (Audley DTF):** Control visual del flujo de manufactura (*En Cola Audley* $\rightarrow$ *Imprimiendo* $\rightarrow$ *Laminado / Corte* $\rightarrow$ *Listo para Entrega* $\rightarrow$ *Completado*).
* **Ventas en Mostrador:** Registro de pedidos manuales y creación rápida de clientes in-situ o asistidos por WhatsApp.
* **Módulo de Inventario Kardex:** Monitoreo y trazabilidad de rollos de film UV DTF, tintas (CMYK + Blanco), barniz y suministros de embalaje.
* **Cuentas por Cobrar & Bancos:** Conciliación de comprobantes de pago (transferencias/boletas bancarias con visor lightbox), control de anticipos (50% obligatorio) y saldos.
* **Guías de Despacho & Remisiones Oficiales:** Hojas de remisión imprimibles compatibles con agencias de paquetería local (Guatex, Forza Delivery Express, Cargo Expreso).

---

## ☁️ Arquitectura de Infraestructura ($0 Costos Fijos)

El proyecto está diseñado para operar con **costos fijos de $0.00 / Q0.00** en su fase inicial y de crecimiento temprano:

| Componente | Tecnología | Proveedor | Nivel / Plan |
| :--- | :--- | :--- | :--- |
| **Frontend** | Vanilla HTML5 / CSS3 / ES Modules SPA | **Cloudflare Pages** | **Free Tier ($0)** (Ancho de banda ilimitado, SSL automático, routing SPA nativo vía `_redirects`) |
| **Backend API** | Node.js + Express 4/5 + TypeScript + Prisma ORM + Zod | **Render** | **Free Tier ($0)** (Web Service con salud en `/api/health`) |
| **Base de Datos** | PostgreSQL Relacional Serverless | **Neon.tech** | **Free Tier ($0)** (0.5 GB almacenamiento, autoscaling, pooling) |
| **Storage de Archivos** | Cloudflare R2 (Presigned URLs S3 API) | **Cloudflare R2** | **Free Tier ($0)** (10 GB/mes gratis, **cero costo por egress/descargas**) |

---

## 📂 Estructura del Monorepo

```
kroma-lab-sales-studio/
├── backend/                  # API REST Node.js + Express + TypeScript
│   ├── prisma/               # Esquemas relacionales y migraciones (Postgres y SQLite)
│   ├── src/
│   │   ├── controllers/      # Controladores REST (auth, orders, quotes, inventory, etc.)
│   │   ├── middlewares/      # RBAC, autenticación JWT, manejo global de errores
│   │   ├── routes/           # Definición de rutas API
│   │   ├── services/         # Servicios de soporte (email verification, storage R2)
│   │   └── index.ts          # Entrypoint del servidor Express
│   ├── __tests__/            # Suites de pruebas unitarias y de integración backend
│   └── package.json
│
├── frontend/                 # Aplicación Web SPA (Vanilla HTML5 / CSS3 / JS)
│   ├── scripts/              # Servidor local de desarrollo y suite E2E Playwright
│   ├── src/
│   │   ├── css/              # Variables CSS de diseño (theme.css), vistas y componentes
│   │   ├── js/
│   │   │   ├── app.js        # Entrypoint SPA, bootstrap reactivo y cotizador
│   │   │   ├── router.js     # Enrutador History API con guardias RBAC
│   │   │   ├── store.js      # Estado reactivo global
│   │   │   ├── components/   # Modales, drawer de carrito, uploader, perfil, etc.
│   │   │   ├── modules/      # Clientes API, motor matemático de cotización y stores
│   │   │   └── views/        # Vistas modulares SPA (quoter, orders, clients, kanban, etc.)
│   │   └── index.html        # Shell único de la aplicación
│   ├── __tests__/            # Suites de pruebas unitarias y DOM con Vitest
│   └── package.json
│
├── shared/                   # Constantes de negocio y configuración RBAC compartidas
│   ├── business-config.js    # Tarifas UV DTF, márgenes técnicos de bobina, cortes
│   └── rbac-config.js        # Matriz de permisos por rol
│
├── DOCUMENTATION.md          # Single Source of Truth (Arquitectura técnica viva)
├── GEMINI.md                 # Contexto de negocio y reglas maestras de desarrollo
└── README.md                 # Este documento
```

---

## 🚀 Instalación y Configuración Local

### Requisitos Previos
* **Node.js:** Versión 18.0+ o 20.0+ LTS instalada.
* **PostgreSQL:** Servidor local para pruebas (base de datos obligatoria `kroma_test`), o Neon Serverless en la nube.
* **Git:** Para control de versiones bajo flujo GitFlow.

### Paso 1: Clonar el Repositorio
```bash
git clone https://github.com/MiguelDP4/kroma-lab-sales-studio.git
cd kroma-lab-sales-studio
```

### Paso 2: Configurar el Backend
```bash
cd backend
npm install

# Copiar variables de entorno
cp .env.example .env
```

Configura tu archivo `backend/.env`:
```env
PORT=4000
NODE_ENV=development
JWT_SECRET=kroma-lab-sales-studio-jwt-secret-key-2026
FRONTEND_URL=http://localhost:3000

# Base de datos (Local o Neon Postgres):
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/kroma_test?schema=public"

# Cloudflare R2 (Opcional en desarrollo local; usa fallback de almacenamiento local si está vacío):
R2_ACCOUNT_ID=""
R2_ACCESS_KEY_ID=""
R2_SECRET_ACCESS_KEY=""
R2_BUCKET_NAME="kroma-lab-assets"
R2_PUBLIC_URL=""
```

Inicializar esquema y datos de prueba:
```bash
# Generar cliente Prisma y aplicar migraciones
npm run db:postgres:push

# Cargar datos base de prueba (usuarios, insumos, órdenes)
npm run db:postgres:seed
```

### Paso 3: Configurar el Frontend
```bash
cd ../frontend
npm install
```

---

## ⚡ Scripts de Ejecución

### Desarrollo en Simultáneo

**Terminal 1 — Backend (Puerto 4000):**
```bash
cd backend
npm run dev
```

**Terminal 2 — Frontend (Puerto 3000):**
```bash
cd frontend
npm run dev
```
Abre tu navegador en `http://localhost:3000`. El frontend detecta automáticamente el backend local en `http://localhost:4000/api`.

---

## 🧪 Pruebas Automatizadas y QA

### 1. Pruebas Unitarias y Cobertura (Vitest)
Ambos paquetes mantienen una regla de calidad estricta de **cobertura mínima > 85%**:

```bash
# Frontend (Unit tests & Cobertura):
cd frontend
npm test
npm run test:coverage

# Backend (Unit & Integration tests):
cd backend
npm test
npm run test:coverage
```

### 2. Pruebas E2E Automatizadas (Playwright)
Auditoría integral visual, de consola y de flujo sobre `http://localhost:3000`:

```bash
cd frontend
npm run test:e2e
```
*Las pruebas E2E verifican automáticamente ausencia total de errores de consola (`pageerror`), layout Mobile-First en viewports de 375px (cero desbordamiento horizontal) y 49 casos de prueba integrales.*

---

## 🔐 Matriz de Roles y Control de Acceso (RBAC)

El sistema opera bajo una política estricta de **Default-Deny (Oculto y bloqueado por defecto)**:

| Capacidad / Vista | Visitante | Cliente Registrado | Empleado | Administrador |
| :--- | :---: | :---: | :---: | :---: |
| Landing Page y Cotizador Público | ✅ | ✅ | ✅ | ✅ |
| Envío de Cotización por WhatsApp / Lead | ✅ | ✅ | ✅ | ✅ |
| Carrito de Compras & Checkout B2B | ❌ | ✅ | ✅ | ✅ |
| Mis Pedidos y Seguimiento de Producción | ❌ | ✅ | ✅ | ✅ |
| Repositorio de Artes Gráficas Propias | ❌ | ✅ | ✅ | ✅ |
| Tablero Kanban Audley (`/produccion`) | ❌ | ❌ | ✅ | ✅ |
| Gestión General de Pedidos (`/pedidos`) | ❌ | ❌ | ✅ | ✅ |
| Registro de Pedidos Mostrador (Sin Cuenta) | ❌ | ❌ | ✅ | ✅ |
| Control de Inventario Kardex (`/inventario`) | ❌ | ❌ | ✅ | ✅ |
| Cobranza y Abonos Bancarios (`/cuentas-por-cobrar`) | ❌ | ❌ | ✅ | ✅ |
| Generación de Remisiones (`/remisiones`) | ❌ | ❌ | ✅ | ✅ |
| Reportes Comerciales y Analítica (`/reportes`) | ❌ | ❌ | ❌ | ✅ |
| Matriz de Roles y Usuarios (`/usuarios`) | ❌ | ❌ | ❌ | ✅ |

---

## 📏 Normas de Calidad y Protocolos de Ingeniería

1. **Aislamiento Absoluto de Bases de Datos:**
   * Las pruebas automatizadas corren exclusivamente contra la base de datos de test (`kroma_test`). Queda terminantemente prohibido ejecutar tests sobre staging (`neondb`) o producción.
2. **Diseño Mobile-First Obligatorio:**
   * La interfaz se diseña y optimiza prioritariamente para teléfonos móviles (desde 320px / 375px) con áreas de toque mínimas de **44 × 44 px**, expandiéndose progresivamente a tablets y monitores de taller.
3. **Resolución Técnica de Impresión (600 DPI):**
   * Todo arte o archivo de montaje para la impresora UV DTF Audley se valida a **600 DPI** para evitar tramas visibles o degradación en el curado con lámpara LED UV.
4. **Metodología GitFlow Estricta:**
   * `main`: Producción estable.
   * `development`: Staging e integración principal.
   * Ramas temporales (`feature/*`, `fix/*`, `docs/*`, `test/*`): Creación desde `development` y merge únicamente tras aprobación explícita.

---

## 📖 Documentación Viva

Para especificaciones exhaustivas de arquitectura, esquemas relacionales de Prisma, contratos de endpoints REST, tokens de diseño CSS (paleta cromática Space Indigo / Regal Navy / Baltic Blue / Cerulean / Powder Blue) y fórmulas matemáticas detalladas de bobina, consulta:

👉 [**`DOCUMENTATION.md`**](./DOCUMENTATION.md) — *Fuente Única de Verdad del Proyecto.*

---

**Kroma Lab Sales Studio** © 2026 — Desarrollado para operaciones de impresión industrial en Guatemala.
