import { describe, it, expect, beforeEach } from 'vitest';
import {
  SITE_BASE_URL,
  DEFAULT_OG_IMAGE,
  INDEX_ROBOTS,
  NOINDEX_ROBOTS,
  FAQ_ITEMS,
  normalizeSeoPath,
  getRouteSeoMeta,
  buildStructuredDataForRoute,
  updateDocumentSeo,
} from '../src/js/modules/seo-manager.js';

describe('SEO Manager — Metadatos Dinámicos, Canónicas y Schema JSON-LD', () => {
  beforeEach(() => {
    document.head.innerHTML = '';
    document.title = '';
  });

  describe('normalizeSeoPath', () => {
    it('normaliza rutas con barras finales, query strings, hashes y valores vacíos', () => {
      expect(normalizeSeoPath('/')).toBe('/');
      expect(normalizeSeoPath('')).toBe('/');
      expect(normalizeSeoPath(null)).toBe('/');
      expect(normalizeSeoPath('/software/')).toBe('/software');
      expect(normalizeSeoPath('/cotizador?utm_source=meta#cotizador')).toBe('/cotizador');
    });
  });

  describe('getRouteSeoMeta', () => {
    it('devuelve metadata indexable y URL canónica raíz para "/" y su alias "/cotizador"', () => {
      const homeMeta = getRouteSeoMeta('/');
      const aliasMeta = getRouteSeoMeta('/cotizador');

      expect(homeMeta.isPublicIndexable).toBe(true);
      expect(homeMeta.robots).toBe(INDEX_ROBOTS);
      expect(homeMeta.canonicalUrl).toBe(`${SITE_BASE_URL}/`);
      expect(homeMeta.ogImage).toBe(DEFAULT_OG_IMAGE);
      expect(homeMeta.title).toContain('Kroma Lab');

      expect(aliasMeta.canonicalUrl).toBe(`${SITE_BASE_URL}/`);
      expect(aliasMeta.title).toBe(homeMeta.title);
      expect(aliasMeta.robots).toBe(INDEX_ROBOTS);
    });

    it('devuelve metadata indexable y URL canónica /software para "/software" y sus alias', () => {
      const swMeta = getRouteSeoMeta('/software');
      const spotMeta = getRouteSeoMeta('/spot-studio');
      const preMeta = getRouteSeoMeta('/preprensa');

      expect(swMeta.isPublicIndexable).toBe(true);
      expect(swMeta.canonicalUrl).toBe(`${SITE_BASE_URL}/software`);
      expect(swMeta.ogType).toBe('product');
      expect(spotMeta.canonicalUrl).toBe(`${SITE_BASE_URL}/software`);
      expect(preMeta.canonicalUrl).toBe(`${SITE_BASE_URL}/software`);
    });

    it('marca rutas privadas, operativas y de cuenta como noindex, nofollow', () => {
      const privatePaths = ['/pedidos', '/produccion', '/clientes', '/usuarios', '/cotizaciones', '/mi-cuenta', '/ruta-desconocida'];
      privatePaths.forEach((p) => {
        const meta = getRouteSeoMeta(p);
        expect(meta.isPublicIndexable).toBe(false);
        expect(meta.robots).toBe(NOINDEX_ROBOTS);
      });
    });

    it('marca vistas 404 y Acceso Restringido como noindex, nofollow', () => {
      const notFoundMeta = getRouteSeoMeta('/no-existe', { isNotFound: true });
      expect(notFoundMeta.robots).toBe(NOINDEX_ROBOTS);
      expect(notFoundMeta.title).toContain('404');
      expect(notFoundMeta.isPublicIndexable).toBe(false);

      const deniedMeta = getRouteSeoMeta('/usuarios', { isAccessDenied: true });
      expect(deniedMeta.robots).toBe(NOINDEX_ROBOTS);
      expect(deniedMeta.title).toContain('Acceso Restringido');
      expect(deniedMeta.isPublicIndexable).toBe(false);
    });
  });

  describe('buildStructuredDataForRoute', () => {
    it('construye grafo JSON-LD completo con ProfessionalService, WebSite, WebApplication y FAQPage en "/"', () => {
      const schema = buildStructuredDataForRoute('/');
      expect(schema).toBeTruthy();
      expect(schema['@context']).toBe('https://schema.org');
      expect(Array.isArray(schema['@graph'])).toBe(true);

      const types = schema['@graph'].map((n) => n['@type']);
      expect(types).toContain('ProfessionalService');
      expect(types).toContain('WebSite');
      expect(types).toContain('WebApplication');
      expect(types).toContain('FAQPage');

      const faqNode = schema['@graph'].find((n) => n['@type'] === 'FAQPage');
      expect(faqNode.mainEntity.length).toBe(FAQ_ITEMS.length);
    });

    it('construye schema SoftwareApplication en "/software"', () => {
      const schema = buildStructuredDataForRoute('/software');
      expect(schema['@type']).toBe('SoftwareApplication');
      expect(schema.name).toBe('Kroma Spot Studio');
      expect(schema.offers.priceCurrency).toBe('GTQ');
    });

    it('retorna null para rutas privadas no indexables', () => {
      expect(buildStructuredDataForRoute('/pedidos')).toBeNull();
    });
  });

  describe('updateDocumentSeo', () => {
    it('crea y actualiza etiquetas meta, canonical, Open Graph, Twitter y JSON-LD en document.head', () => {
      updateDocumentSeo('/');

      expect(document.title).toContain('Kroma Lab');
      expect(document.head.querySelector('meta[name="description"]').getAttribute('content')).toContain('UV DTF');
      expect(document.head.querySelector('meta[name="robots"]').getAttribute('content')).toBe(INDEX_ROBOTS);
      expect(document.head.querySelector('link[rel="canonical"]').getAttribute('href')).toBe(`${SITE_BASE_URL}/`);
      expect(document.head.querySelector('meta[property="og:url"]').getAttribute('content')).toBe(`${SITE_BASE_URL}/`);
      expect(document.head.querySelector('meta[property="og:image"]').getAttribute('content')).toBe(DEFAULT_OG_IMAGE);
      expect(document.head.querySelector('meta[name="twitter:title"]').getAttribute('content')).toContain('Kroma Lab');

      const ldScript = document.getElementById('seo-structured-data');
      expect(ldScript).not.toBeNull();
      const parsed = JSON.parse(ldScript.textContent);
      expect(parsed['@graph'].length).toBeGreaterThanOrEqual(4);
    });

    it('actualiza etiquetas existentes al navegar a /software y remueve JSON-LD en rutas noindex', () => {
      updateDocumentSeo('/');
      updateDocumentSeo('/software');

      expect(document.title).toContain('Kroma Spot Studio');
      expect(document.head.querySelector('link[rel="canonical"]').getAttribute('href')).toBe(`${SITE_BASE_URL}/software`);
      const swSchema = JSON.parse(document.getElementById('seo-structured-data').textContent);
      expect(swSchema['@type']).toBe('SoftwareApplication');

      updateDocumentSeo('/pedidos');
      expect(document.head.querySelector('meta[name="robots"]').getAttribute('content')).toBe(NOINDEX_ROBOTS);
      expect(document.getElementById('seo-structured-data')).toBeNull();
    });

    it('reutiliza etiquetas existentes sin duplicar elementos en document.head', () => {
      updateDocumentSeo('/');
      updateDocumentSeo('/cotizador');
      expect(document.head.querySelectorAll('link[rel="canonical"]').length).toBe(1);
      expect(document.head.querySelectorAll('meta[name="robots"]').length).toBe(1);
      expect(document.head.querySelectorAll('meta[name="description"]').length).toBe(1);
    });
  });
});
