/**
 * Gestor Dinámico de SEO y Metadatos por Ruta (SPA) — Kroma Lab Sales Studio
 * Sincroniza title, meta description, robots, canonical URL, Open Graph,
 * Twitter Cards y datos estructurados JSON-LD según la ruta activa.
 */

export const SITE_BASE_URL = 'https://kroma-lab.pages.dev';
export const DEFAULT_OG_IMAGE = `${SITE_BASE_URL}/og-image.png`;
export const INDEX_ROBOTS = 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1';
export const NOINDEX_ROBOTS = 'noindex, nofollow';

export const FAQ_ITEMS = [
  {
    question: '¿Qué es la impresión UV DTF y en qué superficies se adhiere?',
    answer: 'La impresión UV DTF (Direct to Film) utiliza tintas curadas por luz LED UV, cama blanca fotográfica y barniz brillante con relieve 3D sobre film A/B. Se adhiere de forma permanente sin calor ni plancha sobre superficies rígidas como termos de acero inoxidable, vidrio, acrílico, plástico, madera barnizada, cerámica, metal y empaques.',
  },
  {
    question: '¿Cuál es el pedido mínimo y cómo se calcula el precio por metro?',
    answer: 'El pedido mínimo es de 1 metro lineal (Q150.00) sobre nuestra bobina industrial Audley de 28 cm de ancho útil con 3 mm de separación técnica entre diseños. El precio baja automáticamente por volumen desde Q150/m (1–2 m) hasta Q95/m en pedidos de 20 metros o más.',
  },
  {
    question: '¿Qué formato y resolución deben tener mis archivos de diseño?',
    answer: 'Recomendamos enviar tus diseños en formato PNG con fondo transparente, TIFF o PDF vectorial a 600 DPI reales en tamaño final de impresión. Nuestro cotizador también acepta JPG, SVG y AI de hasta 100 MB con vista previa instantánea sobre la bobina.',
  },
  {
    question: '¿Realizan envíos a todo el país en Guatemala?',
    answer: 'Sí. Realizamos entregas en Villa Nueva, Ciudad de Guatemala y Área Metropolitana, además de envíos a los 22 departamentos mediante Guatex, Forza Delivery Express o Cargo Expreso. Ofrecemos envío gratis en pedidos desde Q575 en Capital y Q1,000 en Departamentos.',
  },
  {
    question: '¿Cómo se entregan los stickers UV DTF y cuáles son los términos de pago?',
    answer: 'Por estándar industrial el pedido se entrega en rollo continuo listo para cortar y aplicar, o puedes agregar servicio opcional de corte perimetral recto desde Q0.25 por pieza (tarifa mínima Q25). Trabajamos con 50% de anticipo para iniciar producción y 50% contra verificación antes del envío.',
  },
];

const PUBLIC_SEO_ROUTES = {
  '/': {
    title: 'Kroma Lab | Impresión UV DTF Industrial en Guatemala — Cotizador Online',
    description: 'Cotiza tu impresión UV DTF por metro lineal en tiempo real en Guatemala. Stickers con cama blanca, relieve 3D, barniz brillante y envíos a todo el país.',
    robots: INDEX_ROBOTS,
    canonicalPath: '/',
    ogType: 'website',
  },
  '/software': {
    title: 'Kroma Spot Studio | Generador de Canales Spot Blanco y Barniz UV DTF',
    description: 'Software de preprensa industrial para UV DTF y DTF Textil. Genera canales Spot_1 Blanco y Spot_3 Barniz en TIFF LZW en segundos sin tocar Photoshop.',
    robots: INDEX_ROBOTS,
    canonicalPath: '/software',
    ogType: 'product',
  },
};

const ROUTE_ALIASES = {
  '/cotizador': '/',
  '/spot-studio': '/software',
  '/preprensa': '/software',
};

const PRIVATE_ROUTE_TITLES = {
  '/quotes': 'Cotizaciones Guardadas | Kroma Lab Guatemala',
  '/cotizaciones': 'Cotizaciones Guardadas | Kroma Lab Guatemala',
  '/cotizaciones-guardadas': 'Cotizaciones Guardadas | Kroma Lab Guatemala',
  '/pedidos': 'Pedidos | Kroma Lab Sales Studio',
  '/produccion': 'Tablero de Producción Audley | Kroma Lab Sales Studio',
  '/clientes': 'Directorio de Clientes B2B | Kroma Lab Sales Studio',
  '/inventario': 'Inventario de Insumos | Kroma Lab Sales Studio',
  '/receivables': 'Cuentas por Cobrar | Kroma Lab Sales Studio',
  '/cuentas-por-cobrar': 'Cuentas por Cobrar | Kroma Lab Sales Studio',
  '/dispatch': 'Remisiones y Despacho | Kroma Lab Sales Studio',
  '/remisiones': 'Remisiones y Despacho | Kroma Lab Sales Studio',
  '/reportes': 'Reportes Comerciales | Kroma Lab Sales Studio',
  '/rentabilidad': 'Costos y Rentabilidad | Kroma Lab Sales Studio',
  '/usuarios': 'Administración de Usuarios | Kroma Lab Sales Studio',
  '/settings': 'Configuración del Sistema | Kroma Lab Sales Studio',
  '/configuracion': 'Configuración del Sistema | Kroma Lab Sales Studio',
  '/mi-cuenta': 'Mi Cuenta | Kroma Lab Guatemala',
  '/cuenta': 'Mi Cuenta | Kroma Lab Guatemala',
  '/perfil': 'Mi Cuenta | Kroma Lab Guatemala',
  '/verify-email': 'Verificación de Correo | Kroma Lab Guatemala',
  '/confirmar-correo': 'Verificación de Correo | Kroma Lab Guatemala',
};

/**
 * Normaliza una ruta eliminando query string, hash y barra final redundante.
 * @param {string} path
 * @returns {string}
 */
export function normalizeSeoPath(path) {
  if (!path || typeof path !== 'string') return '/';
  const cleaned = path.split('?')[0].split('#')[0].trim();
  if (!cleaned || cleaned === '/') return '/';
  return cleaned.endsWith('/') ? cleaned.slice(0, -1) : cleaned;
}

/**
 * Resuelve la metadata SEO correspondiente a una ruta y estado de vista.
 * @param {string} path
 * @param {{ isAccessDenied?: boolean, isNotFound?: boolean }} [options]
 */
export function getRouteSeoMeta(path, options = {}) {
  const normalized = normalizeSeoPath(path);

  if (options.isNotFound || normalized === '*') {
    return {
      title: 'Página no encontrada (404) | Kroma Lab Guatemala',
      description: 'La página solicitada no existe en Kroma Lab Guatemala. Regresa al cotizador en línea de impresión UV DTF.',
      robots: NOINDEX_ROBOTS,
      canonicalPath: '/',
      canonicalUrl: `${SITE_BASE_URL}/`,
      ogType: 'website',
      ogImage: DEFAULT_OG_IMAGE,
      isPublicIndexable: false,
    };
  }

  if (options.isAccessDenied) {
    return {
      title: 'Acceso Restringido | Kroma Lab Sales Studio',
      description: 'Sección privada de Kroma Lab Sales Studio. Inicia sesión para acceder a tu portal de clientes o panel operativo.',
      robots: NOINDEX_ROBOTS,
      canonicalPath: normalized,
      canonicalUrl: `${SITE_BASE_URL}${normalized}`,
      ogType: 'website',
      ogImage: DEFAULT_OG_IMAGE,
      isPublicIndexable: false,
    };
  }

  const canonicalKey = ROUTE_ALIASES[normalized] || normalized;
  const publicMeta = PUBLIC_SEO_ROUTES[canonicalKey];
  if (publicMeta) {
    return {
      ...publicMeta,
      canonicalUrl: `${SITE_BASE_URL}${publicMeta.canonicalPath === '/' ? '/' : publicMeta.canonicalPath}`,
      ogImage: DEFAULT_OG_IMAGE,
      isPublicIndexable: true,
    };
  }

  const privateTitle = PRIVATE_ROUTE_TITLES[normalized] || 'Kroma Lab | Impresión UV DTF Industrial en Guatemala';
  return {
    title: privateTitle,
    description: PUBLIC_SEO_ROUTES['/'].description,
    robots: NOINDEX_ROBOTS,
    canonicalPath: normalized,
    canonicalUrl: `${SITE_BASE_URL}${normalized}`,
    ogType: 'website',
    ogImage: DEFAULT_OG_IMAGE,
    isPublicIndexable: false,
  };
}

/**
 * Construye el payload JSON-LD estructurado para las rutas públicas indexables.
 * @param {string} canonicalPath
 * @returns {object|null}
 */
export function buildStructuredDataForRoute(canonicalPath) {
  if (canonicalPath === '/software') {
    return {
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      name: 'Kroma Spot Studio',
      applicationCategory: 'DesignApplication',
      operatingSystem: 'Windows 10, Windows 11 (64-bit)',
      description: PUBLIC_SEO_ROUTES['/software'].description,
      url: `${SITE_BASE_URL}/software`,
      offers: {
        '@type': 'Offer',
        price: '195.00',
        priceCurrency: 'GTQ',
        availability: 'https://schema.org/InStock',
      },
      publisher: {
        '@type': 'Organization',
        name: 'Kroma Lab Guatemala',
        url: `${SITE_BASE_URL}/`,
      },
    };
  }

  if (canonicalPath === '/') {
    return {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'ProfessionalService',
          '@id': `${SITE_BASE_URL}/#business`,
          name: 'Kroma Lab — Impresión UV DTF Industrial',
          alternateName: 'Kroma Lab Guatemala',
          url: `${SITE_BASE_URL}/`,
          logo: `${SITE_BASE_URL}/favicon.svg`,
          image: DEFAULT_OG_IMAGE,
          description: PUBLIC_SEO_ROUTES['/'].description,
          telephone: '+50254066217',
          priceRange: 'Q95 - Q150 / metro lineal',
          currenciesAccepted: 'GTQ',
          address: {
            '@type': 'PostalAddress',
            addressLocality: 'Villa Nueva',
            addressRegion: 'Guatemala',
            addressCountry: 'GT',
          },
          areaServed: [
            { '@type': 'Country', name: 'Guatemala' },
            { '@type': 'City', name: 'Ciudad de Guatemala' },
            { '@type': 'City', name: 'Villa Nueva' },
            { '@type': 'City', name: 'Mixco' },
          ],
          sameAs: [
            'https://api.whatsapp.com/send?phone=50254066217',
          ],
          hasOfferCatalog: {
            '@type': 'OfferCatalog',
            name: 'Servicios de Impresión UV DTF Industrial',
            itemListElement: [
              {
                '@type': 'Offer',
                itemOffered: {
                  '@type': 'Service',
                  name: 'Impresión UV DTF por Metro Lineal (Bobina 28 cm útiles)',
                  description: 'Impresión LED UV a 600 DPI con cama blanca y barniz con relieve 3D para superficies rígidas.',
                },
                priceSpecification: {
                  '@type': 'PriceSpecification',
                  minPrice: '95.00',
                  maxPrice: '150.00',
                  priceCurrency: 'GTQ',
                },
              },
              {
                '@type': 'Offer',
                itemOffered: {
                  '@type': 'Service',
                  name: 'Servicio de Corte Perimetral Recto de Precisión',
                  description: 'Despiece individual de stickers UV DTF listos para aplicar o distribuir.',
                },
                priceSpecification: {
                  '@type': 'PriceSpecification',
                  minPrice: '25.00',
                  priceCurrency: 'GTQ',
                },
              },
            ],
          },
        },
        {
          '@type': 'WebSite',
          '@id': `${SITE_BASE_URL}/#website`,
          url: `${SITE_BASE_URL}/`,
          name: 'Kroma Lab Guatemala',
          inLanguage: 'es-GT',
        },
        {
          '@type': 'WebApplication',
          '@id': `${SITE_BASE_URL}/#quoter-app`,
          name: 'Cotizador UV DTF Online — Kroma Lab',
          url: `${SITE_BASE_URL}/`,
          applicationCategory: 'BusinessApplication',
          operatingSystem: 'Web',
          browserRequirements: 'Requires JavaScript',
          inLanguage: 'es-GT',
          offers: {
            '@type': 'Offer',
            price: '0',
            priceCurrency: 'GTQ',
          },
        },
        {
          '@type': 'FAQPage',
          '@id': `${SITE_BASE_URL}/#faq`,
          mainEntity: FAQ_ITEMS.map((item) => ({
            '@type': 'Question',
            name: item.question,
            acceptedAnswer: {
              '@type': 'Answer',
              text: item.answer,
            },
          })),
        },
      ],
    };
  }

  return null;
}

function upsertMetaTag(attrName, attrValue, content) {
  if (typeof document === 'undefined' || !document.head) return;
  let el = document.head.querySelector(`meta[${attrName}="${attrValue}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attrName, attrValue);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function upsertLinkTag(relValue, hrefValue) {
  if (typeof document === 'undefined' || !document.head) return;
  let el = document.head.querySelector(`link[rel="${relValue}"]`);
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', relValue);
    document.head.appendChild(el);
  }
  el.setAttribute('href', hrefValue);
}

function upsertStructuredData(schemaObj) {
  if (typeof document === 'undefined' || !document.head) return;
  const existing = document.getElementById('seo-structured-data');
  if (!schemaObj) {
    if (existing && existing.parentNode) {
      existing.parentNode.removeChild(existing);
    }
    return;
  }
  const scriptEl = existing || document.createElement('script');
  scriptEl.id = 'seo-structured-data';
  scriptEl.type = 'application/ld+json';
  scriptEl.textContent = JSON.stringify(schemaObj);
  if (!existing) {
    document.head.appendChild(scriptEl);
  }
}

/**
 * Actualiza dinámicamente las etiquetas SEO y datos estructurados del documento.
 * @param {string} path
 * @param {{ isAccessDenied?: boolean, isNotFound?: boolean }} [options]
 * @returns {object} Metadata aplicada
 */
export function updateDocumentSeo(path, options = {}) {
  const meta = getRouteSeoMeta(path, options);
  if (typeof document === 'undefined') return meta;

  document.title = meta.title;
  upsertMetaTag('name', 'description', meta.description);
  upsertMetaTag('name', 'robots', meta.robots);
  upsertLinkTag('canonical', meta.canonicalUrl);

  upsertMetaTag('property', 'og:type', meta.ogType);
  upsertMetaTag('property', 'og:title', meta.title);
  upsertMetaTag('property', 'og:description', meta.description);
  upsertMetaTag('property', 'og:url', meta.canonicalUrl);
  upsertMetaTag('property', 'og:image', meta.ogImage);

  upsertMetaTag('name', 'twitter:title', meta.title);
  upsertMetaTag('name', 'twitter:description', meta.description);
  upsertMetaTag('name', 'twitter:image', meta.ogImage);

  const schema = meta.isPublicIndexable ? buildStructuredDataForRoute(meta.canonicalPath) : null;
  upsertStructuredData(schema);

  return meta;
}
