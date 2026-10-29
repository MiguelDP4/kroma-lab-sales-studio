# Plan Maestro de Pruebas Manuales (QA Checklist) — Kroma Lab Sales Studio

Este documento contiene la lista exhaustiva de casos de prueba manuales para auditar el funcionamiento integral de **Kroma Lab Sales Studio**. Está diseñado para ejecutarse con acceso total como **Administrador** (`miguel@kromalab.gt`), cubriendo tanto flujos B2B de clientes como de taller y administración.

---

## Módulo 1: Autenticación, Sesión y Perfil de Usuario
- [X] **Registro de Cliente B2B:**
  - Registrar una cuenta con nombre, teléfono (8 dígitos, ej. `55551234`), correo y contraseña.
  - Verificar validación de números con menos de 8 dígitos y formatos de correo inválidos.
  - Validar recepción del correo real de verificación vía Google SMTP.
- [X] **Verificación de Correo (`/verificar-correo?token=...`):**
  - Hacer clic en el enlace recibido en el correo y verificar que la cuenta pase a estado verificado.
  - Comprobar que tokens inválidos o expirados muestren el mensaje de error con botón de reenvío.
- [X] **Inicio de Sesión:**
  - Iniciar sesión con credenciales válidas.
  - Probar checkbox **"Recordarme"** (mantener sesión tras cerrar y reabrir el navegador).
  - Probar con contraseña incorrecta y verificar mensaje de error amigable.
- [X] **Visibilidad de Barra Superior (TopBar) y Dropdown:**
  - Con sesión iniciada: verificar que **desaparezcan** las opciones "Iniciar Sesión" y "Crear Cuenta".
  - Abrir el dropdown del chip de usuario (esquina superior derecha) y verificar que muestre:
    - Nombre del usuario, correo y badge de rol (**👑 Admin**, **🛠️ Taller** o **🏢 Cliente**).
    - Enlace a "Configuración de la Cuenta".
    - Botón rojo "Cerrar Sesión".
- [X] **Página Mi Cuenta (`/mi-cuenta`):**
  - Actualizar nombre, teléfono o empresa y presionar "Guardar Cambios". Verificar que guarde sin refrescar la página completa.
  - Probar cambio de contraseña (actual vs. nueva).
  - Pulsar "Cerrar Sesión" desde `/mi-cuenta` y verificar que limpie el token y redirija al inicio.

---

## Módulo 2: Cotizador Interactivo UV DTF (`/` o `/cotizador`)
- [x] **Dimensiones y Validación de Bobina Industrial:**
  - Probar stickers de `5x5 cm`, `10x10 cm` y verificar el cálculo de stickers por fila (ancho útil 28 cm).
  - Intentar ingresar un ancho mayor a `28 cm` y confirmar que el sistema restrinja o alerte el límite físico de la Audley.
- [x] **Dropzone y Carga de Archivos:**
  - Arrastrar/seleccionar archivos en formatos soportados (`.png`, `.tiff`, `.pdf`, `.ai`, `.svg`).
  - Probar un archivo mayor a 50 MB y validar la advertencia de tamaño.
  - Activar **"Mantener proporción"**: verificar que al cambiar el ancho, el alto se recalcule automáticamente según la relación de aspecto de la imagen.
  - Probar el botón **"Rotar 90°"**: comprobar que la imagen y el cálculo de piezas por metro se reorienten en el canvas.
  - Eliminar el archivo con el botón de papelera y comprobar que los campos vuelvan al estado por defecto.
- [X] **Simulador de Bobina (Canvas):**
  - Verificar que el dibujo en canvas muestre la cuadrícula, los stickers posicionados y el aprovechamiento visual del rollo.
  - Cambiar entre **Modo Oscuro** y **Modo Claro**; verificar que el fondo del canvas y las guías adapten su contraste.
- [X] **Opciones Adicionales de Tiraje:**
  - Alternar opción de corte con plotter (+Q15/metro lineal) y verificar que sume al total en Quetzales.
- [X] **Acciones del Cotizador:**
  - **"Cotizar por WhatsApp":** verificar que abra enlace con texto formateado (medidas, metros, precio en Q).
  - **"Guardar Cotización":** abrir modal, llenar datos de proyecto y presionar guardar. Confirmar redirección automática a cotizaciones guardadas.
  - **"Agregar al Carrito":** verificar que abra el Drawer lateral y suba el archivo (Lazy Upload a R2 o Local).

---

## Módulo 3: Cotizaciones Guardadas (`/cotizaciones`)
- [X] **Listado y Visualización:**
  - Verificar que aparezca la cotización recién guardada con su código correlativo (`COT-2026-XXX`), miniatura y especificaciones.
  - Confirmar que los KPIs superiores (Total, Pendientes, Convertidas, Tasa de Conversión) reflejen los números correctos.
- [X] **Filtros y Búsqueda:**
  - Filtrar por pestañas: *Todas*, *Pendientes* y *Convertidas*.
  - Usar la barra de búsqueda por nombre de proyecto, cliente o teléfono.
- [X] **Conversión en 1 Clic:**
  - Pulsar el botón **"Convertir a Orden"** en una cotización guardada.
  - Verificar que la cotización cambie a estado *Convertida* y se cree automáticamente una nueva orden en el sistema.

---

## Módulo 4: Carrito de Compras y Checkout
- [X] **Drawer del Carrito:**
  - Agregar múltiples diseños con distintas medidas y cantidades.
  - Modificar cantidades o eliminar un ítem desde el drawer.
  - Verificar la suma de metros lineales totales y el cálculo de tarifa según escala de volumen.
- [X] **Modal de Checkout:**
  - Ingresar datos de entrega y facturación (Nombre, Teléfono, Dirección, NIT / CF).
  - Completar el pedido y verificar que genere el número de orden de 10 dígitos (ej. `0000000001`).

---

## Módulo 5: Gestión de Pedidos (`/pedidos`)
- [X] **Responsividad e Interfaz:**
  - En pantalla de escritorio (> 1200px): verificar la tabla tabular con todas sus columnas.
  - En pantalla móvil o tablet ($\le$ 1200px): verificar que la tabla se transforme en **Dispatch Cards** independientes, sin desbordamiento horizontal.
- [X] **Numeración y Acciones:**
  - Confirmar que la columna o etiqueta de orden muestre el número en formato de 10 dígitos.
  - Pulsar **"Ver detalle"** y verificar el modal con el desglose de ítems, medidas y comprobantes.
- [X] **Impresión Unificada de Comprobante / Ticket:**
  - Pulsar el botón de imprimir comprobante térmico / remisión y verificar que abra la vista previa de impresión en formato limpio.

---

## Módulo 6: Cola de Producción & Taller (`/produccion`)
- [X] **Visualización Operativa (Audley UV DTF):**
  - Entrar como Admin o cambiar de rol para comprobar que un Cliente regular no tenga acceso a esta vista.
  - Verificar órdenes en estado `PENDING_REVIEW` o `READY_FOR_PRINT`.
  - Descargar o inspeccionar el archivo gráfico original de impresión.
- [X] **Transición de Estados de Taller:**
  - Avanzar pedido de "En Cola" a "Imprimiendo" y luego a "Terminado / Listo para Despacho".

---

## Módulo 7: Despacho y Remisiones (`/despacho`)
- [ ] **Generación de Remisión:**
  - Seleccionar pedidos listos para despacho y generar una remisión de entrega (folio `REM-2026-XXX`).
  - Indicar método de entrega (Mensajería / Retiro en Taller / Guatex) y notas.
- [ ] **Finalización de Entrega:**
  - Marcar la remisión como `DELIVERED` y confirmar que el pedido vinculado pase automáticamente a `COMPLETED`.
  - Probar la impresión de la remisión física para entrega al cliente.

---

## Módulo 8: Cuentas por Cobrar y Cobranza (`/cobranza`)
- [X] **Diseño y Clasificación de Antigüedad:**
  - Verificar el diseño en tarjetas cuando la pantalla es $\le$ 1200px.
  - Confirmar las etiquetas de antigüedad: `CURRENT` (Al día), `WARNING` (Próximo a vencer) y `OVERDUE` (Vencido).
  - Verificar los botones de acción apilados verticalmente con tamaño táctil ($\ge$ 44px).
- [X] **Gestión de Abonos:**
  - Registrar un abono parcial en Quetzales a una orden con saldo pendiente.
  - Comprobar que el saldo de la orden disminuya de inmediato.
  - Probar la opción de anular un abono erróneo y verificar que el saldo se restituya íntegramente.

---

## Módulo 9: Inventario UV DTF y Kardex (`/inventario`)
- [X] **Monitoreo de Insumos:**
  - Revisar niveles de Film A, Film B, Tintas CMYK, Tinta Blanca, Barniz y Flush.
  - Confirmar que los insumos con stock bajo muestren indicador de alerta amarilla/roja.
- [X] **Movimientos de Kardex:**
  - Registrar una entrada por compra / reabastecimiento con costo unitario en Quetzales.
  - Registrar un ajuste de inventario por consumo de taller o calibración.
  - Verificar que el historial del Kardex registre fecha, tipo de movimiento y saldo actualizado.

---

## Módulo 10: Cartera de Clientes B2B (`/clientes`)
- [X] **Vista 360° de Clientes:**
  - Probar la transformación de tabla a tarjetas en pantallas menores a 1200px.
  - Crear un nuevo cliente B2B y validar campos requeridos.
  - Ver el perfil de un cliente y validar métricas de pedidos acumulados y saldo pendiente de cobro.

---

## Módulo 11: Finanzas y Rentabilidad (`/reportes` y `/rentabilidad`)
- [ ] **Reportes Comerciales:**
  - Consultar métricas de ventas, metros impresos y ticket promedio en Quetzales.
- [ ] **Calculadora de Rentabilidad Industrial:**
  - Simular un tiraje (ej. 10 metros lineales con 80% cobertura de blanco y barniz).
  - Verificar el desglose de costos: Film, tintas, desgaste de cabezales, electricidad y depreciación.
  - Reducir la ventana a menos de 964px y verificar que la tabla **"Desglose técnico de insumos para este tiraje"** sea completamente legible y no desborde la pantalla.

---

## Módulo 12: Gestión de Usuarios (`/usuarios`)
- [X] **Panel de Administración (Sólo Admin):**
  - Listar los usuarios registrados en el sistema.
  - Crear un colaborador con rol `EMPLOYEE` (Operador de Taller) y comprobar que sus credenciales funcionen y restrinjan vistas financieras.

---

## Módulo 13: Experiencia Móvil Global y Ergonomía
- [X] **Menú Lateral (Sidebar Drawer):**
  - En celular o reduciendo la ventana a menos de 768px, abrir el menú hamburguesa ☰.
  - Verificar que el fondo se bloquee, que los enlaces correspondan al rol actual y que se cierre al hacer clic fuera o presionar la tecla Escape.
- [X] **Tema Claro / Oscuro:**
  - Probar el botón de tema (sol / luna) en cada una de las páginas; asegurar que ningún texto quede ilegible o con bajo contraste.
