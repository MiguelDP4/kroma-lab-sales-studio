# Catálogo Maestro de Variables y Parámetros de Configuración — Kroma Lab Sales Studio

> **Propósito de este documento:** Centralizar en un único archivo todas las variables de configuración del sistema: parámetros dinámicos en base de datos (`SystemSetting`), configuración operativa de taller (`WorkshopConfig`), constantes compartidas de negocio (`BUSINESS_CONFIG`) y variables de entorno de infraestructura (`Backend` / `Render` / `R2` / `SMTP`).

---

## 1. Parámetros Dinámicos en Base de Datos (`SystemSetting`)

Almacenados en la tabla `SystemSetting` (`key`, `value`, `description`, `createdAt`, `updatedAt`).

- **Gestión en vivo:** Panel exclusivo para `ADMIN` en la ruta `/settings` (accesible únicamente desde el **Sidebar Drawer → Configuración**).
- **Creación de nuevos parámetros:** El botón **«➕ Nuevo»** abre un formulario *inline* para registrar claves nuevas (`key`, `value`, `description`) sin depender de migraciones ni despliegues.
- **Inicialización automática (No destructiva):** Al iniciar el servidor (`backend/src/index.ts`) o ejecutar `seed.js` (`backend/src/db/seed.ts`), la función `ensureDefaultSystemSettings()` inserta únicamente las claves base que aún no existan en la base de datos (sin sobrescribir valores o descripciones modificadas en producción).

| Clave (`key`) | Valor por Defecto | Descripción de Uso (`description`) | Impacto / Módulos donde se utiliza |
| :--- | :--- | :--- | :--- |
| `FREE_SHIPPING_THRESHOLD` | `575` | Monto mínimo en Quetzales (GTQ) para calificar a envío gratis dentro de la Ciudad de Guatemala / Capital (~5 metros lineales). | • `GET /api/settings/shipping` (`settings.controller.ts`)<br>• Cotizador público, barra de progreso y WhatsApp (`app.js`, `quoter-view.js`, `quoter-engine.js`)<br>• Carrito Drawer (`cart-drawer.js`, `cart-engine.js`) |
| `FREE_SHIPPING_THRESHOLD_OUTSIDE_CAPITAL` | `1000` | Monto mínimo en Quetzales (GTQ) para calificar a envío gratis hacia Departamentos / Interior del país (~10 metros lineales). | • `GET /api/settings/shipping` (`settings.controller.ts`)<br>• Cotizador público, barra de progreso y WhatsApp (`app.js`, `quoter-view.js`, `quoter-engine.js`)<br>• Carrito Drawer (`cart-drawer.js`, `cart-engine.js`) |

### Endpoints API para `SystemSetting`
| Método | Ruta | Acceso | Descripción |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/settings/shipping` | Público | Retorna `{ success: true, shipping: { capital, interior } }` (con contingencia `575` / `1000` si no existen registros). |
| `GET` | `/api/settings` | `ADMIN` | Lista todos los registros de `SystemSetting` ordenados alfabéticamente por `key`. |
| `POST` | `/api/settings` | `ADMIN` | Crea un nuevo parámetro `{ key, value, description? }`. Retorna `409 Conflict` si la clave ya existe. |
| `PUT` | `/api/settings` | `ADMIN` | Actualiza (o crea con `upsert`) uno o varios parámetros `{ key, value, description? }`. |

---

## 2. Configuración Operativa de Taller (`WorkshopConfig`)

Almacenada en la tabla `WorkshopConfig` (`id = "default"`), administrada mediante `/api/workshop` (`GET` público/staff y `PUT` para `ADMIN`). Si el registro `"default"` no existe, `getWorkshopConfig` lo crea automáticamente.

| Campo | Valor por Defecto | Descripción |
| :--- | :--- | :--- |
| `printableRollWidthCm` | `28.0` | Ancho útil imprimible de la bobina Audley UV DTF (en cm). |
| `rollWidthCm` | `30.0` | Ancho físico total del rollo de Film UV DTF (en cm). |
| `rateTier1` | `130.0` | Tarifa base por metro lineal (escala 1 en BD). |
| `rateTier2` | `120.0` | Tarifa por metro lineal (escala 2 en BD). |
| `rateTier3` | `115.0` | Tarifa por metro lineal (escala 3 en BD). |
| `rateTier4` | `105.0` | Tarifa por metro lineal (escala 4 en BD). |
| `rateTier5` | `95.0` | Tarifa por metro lineal de mayoreo (escala 5 en BD). |
| `cuttingFeePerPieceQ` | `0.08` | Costo operativo base por pieza en mesa de corte. |
| `bankBiAccount` | `"5371667253"` | Cuenta bancaria principal en Banco Industrial (GTQ). |
| `bankBacAccount` | `null` | Cuenta bancaria en BAC Credomatic (opcional). |
| `bankGytAccount` | `null` | Cuenta bancaria en Banco G&T Continental (opcional). |
| `bankBanruralAccount` | `null` | Cuenta bancaria en Banrural (opcional). |
| `whatsappNumber` | `"+502 5555-0000"` | Número de contacto del taller registrado en configuración. |
| `filmACostPerM` | `6.30` | Costo directo de insumo Film A por metro lineal (Q). |
| `filmBCostPerM` | `4.08` | Costo directo de insumo Film B por metro lineal (Q). |
| `inkCostPerM` | `8.25` | Costo promedio de tinta UV + barniz por metro lineal (Q). |
| `monthlyNetTargetQ` | `20000.0` | Meta mensual de flujo neto de utilidad del taller (Q). |

---

## 3. Constantes de Negocio y Contingencia Frontend (`BUSINESS_CONFIG`)

Definidas en `frontend/src/shared/business-config.js` (y `shared/business-config.js`). Sirven como reglas de cálculo inmediatas y valores de respaldo (*fallback*) si el backend aún no responde.

| Propiedad / Constante | Valor | Descripción |
| :--- | :--- | :--- |
| `BUSINESS_CONFIG.rollWidthCm` | `30.0` | Ancho total del rollo (cm). |
| `BUSINESS_CONFIG.printableWidthCm` | `28.0` | Ancho máximo imprimible en simulador y cotizador (cm). |
| `BUSINESS_CONFIG.marginBetweenCm` | `0.3` | Separación entre diseños en el acomodo (3 mm). |
| `BUSINESS_CONFIG.minimumBillableMeters` | `1.0` | Longitud mínima facturable por trabajo (metros lineales). |
| `BUSINESS_CONFIG.minimumBasePriceQ` | `150.0` | Precio mínimo base de pedido (Q). |
| `BUSINESS_CONFIG.cuttingMinimumQ` | `25.0` | Tarifa mínima por servicio de corte individual (Q). |
| `BUSINESS_CONFIG.phoneWhatsApp` | `"50254066217"` | Número comercial de WhatsApp para cotizaciones y carrito. |
| `BUSINESS_CONFIG.currencySymbol` / `currencyCode` | `"Q"` / `"GTQ"` | Moneda base operativa (Quetzales guatemaltecos). |
| `BUSINESS_CONFIG.freeShippingThresholds.capital` | `575.0` | Respaldo local para umbral Capital (sobrescrito al cargar `/api/settings/shipping`). |
| `BUSINESS_CONFIG.freeShippingThresholds.interior` | `1000.0` | Respaldo local para umbral Departamentos (sobrescrito al cargar `/api/settings/shipping`). |
| `BUSINESS_CONFIG.paymentPolicy.advancePercentage` | `50` | Porcentaje de anticipo requerido para pasar a producción (%). |
| `BUSINESS_CONFIG.paymentPolicy.balanceBeforeDelivery` | `50` | Porcentaje restante requerido previo a entrega/despacho (%). |
| `BUSINESS_CONFIG.paymentPolicy.allowCOD` | `false` | Pago contra entrega deshabilitado por política de seguridad. |
| `PRICING_TIERS` | `Q150 / Q125 / Q115 / Q105 / Q95` | Escalas progresivas por metro: 1-2m (Q150), 2-5m (Q125), 5-10m (Q115), 10-20m (Q105), 20+m (Q95). |
| `CUTTING_TIERS` | `Q0.35 / Q0.30 / Q0.25` | Tarifa de corte recto individual por unidad: ≤50 (Q0.35), ≤200 (Q0.30), >200 (Q0.25). |

---

## 4. Variables de Entorno (`Backend / Infraestructura`)

Configuradas en `backend/.env` (local), `backend/.env.test` (pruebas) y variables de entorno en Render / Cloud Run (`render.yaml`).

### A. Entorno, Servidor y Seguridad
| Variable | Requerida | Valor por Defecto | Descripción |
| :--- | :--- | :--- | :--- |
| `NODE_ENV` | Sí | `"development"` | Entorno de ejecución (`development`, `test`, `production`). Controla cookies seguras (`secure`), logging de Prisma y protección de seed de pruebas. |
| `PORT` | No | `4000` | Puerto HTTP en el que escucha el servidor Express. |
| `FRONTEND_URL` | Sí (Prod) | `"http://localhost:3000"` | Origen autorizado en CORS y base para enlaces de verificación en correos electrónicos. |
| `JWT_SECRET` | Sí (Prod) | Fallback local dev | Llave secreta para firmar y validar tokens JWT de sesión y refresh tokens. |

### B. Base de Datos (Prisma)
| Variable | Requerida | Ejemplo / Uso | Descripción |
| :--- | :--- | :--- | :--- |
| `DATABASE_URL` | Sí | `file:./dev.db` (local) / `postgresql://...` (prod) | Cadena de conexión principal de Prisma (SQLite en local, PostgreSQL Neon en staging/producción). |
| `TEST_DATABASE_URL` | Solo Tests | `file:./test.db` / `kroma_test` | Cadena de conexión aislada exclusiva para la suite Vitest y E2E. **Nunca debe apuntar a `neondb` (staging/producción).** |

### C. Almacenamiento de Archivos — Cloudflare R2 (`storage.service.ts`)
| Variable | Requerida | Valor por Defecto | Descripción |
| :--- | :--- | :--- | :--- |
| `R2_ACCOUNT_ID` | Sí (Prod) | — | ID de cuenta de Cloudflare R2. Si falta en desarrollo, activa almacenamiento simulado local. |
| `R2_ACCESS_KEY_ID` | Sí (Prod) | — | Access Key ID del bucket R2. |
| `R2_SECRET_ACCESS_KEY` | Sí (Prod) | — | Secret Access Key del bucket R2. |
| `R2_BUCKET_NAME` | No | `"kroma-lab-assets"` | Nombre del bucket R2 para artes de impresión (600 DPI) y boletas bancarias. |
| `R2_PUBLIC_URL` | Sí (Prod) | — | URL pública o dominio personalizado para lectura de vistas previas/comprobantes. |

### D. Correo Transaccional SMTP (`email.service.ts`)
| Variable | Requerida | Valor por Defecto | Descripción |
| :--- | :--- | :--- | :--- |
| `SMTP_HOST` | No | `"smtp.gmail.com"` | Host del servidor SMTP para correos de verificación y notificaciones. |
| `SMTP_PORT` | No | `465` | Puerto SMTP. |
| `SMTP_SECURE` | No | `true` si puerto `465` | Define conexión TLS directa (`"true"` / `"false"`). |
| `SMTP_USER` | Sí (Prod) | — | Usuario/cuenta de correo remitente SMTP. |
| `SMTP_PASS` | Sí (Prod) | — | Contraseña o App Password de la cuenta SMTP. |
| `SMTP_FROM` | No | `"Kroma Lab" <no-reply@kromalab.gt>` | Nombre y dirección visible en el encabezado `From` de los correos. |

---

## 5. Configuración de API en Frontend (`frontend/index.html`)

| Variable Global | Entorno Local (`localhost` / `127.0.0.1`) | Entorno Producción | Descripción |
| :--- | :--- | :--- | :--- |
| `window.__KROMA_API_URL__` | `http://localhost:4000/api` | `https://kroma-lab-backend-216908488828.us-central1.run.app/api` | URL base utilizada por `ApiClient` (`frontend/src/js/modules/api-client.js`) para todas las peticiones REST. |
