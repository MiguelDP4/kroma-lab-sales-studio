import { describe, it, expect } from 'vitest';
import {
  renderMetricsSkeleton,
  renderTableSkeleton,
  renderCardsSkeleton,
  renderKanbanSkeleton,
  renderChartSkeleton,
  renderProfileSkeleton,
} from '../src/js/components/skeleton-loader.js';

describe('Skeleton Loader Component', () => {
  describe('renderMetricsSkeleton', () => {
    it('debe generar 4 tarjetas de métricas por defecto con atributos de accesibilidad', () => {
      const html = renderMetricsSkeleton();
      expect(html).toContain('role="status"');
      expect(html).toContain('aria-busy="true"');
      expect(html).toContain('metrics-grid');
      
      const cardMatches = html.match(/skeleton-metric-card/g);
      expect(cardMatches).toHaveLength(4);
    });

    it('debe generar una cantidad personalizada de tarjetas de métricas', () => {
      const html = renderMetricsSkeleton(2);
      const cardMatches = html.match(/skeleton-metric-card/g);
      expect(cardMatches).toHaveLength(2);
    });
  });

  describe('renderTableSkeleton', () => {
    it('debe generar 5 filas y 6 columnas por defecto con clases skeleton', () => {
      const html = renderTableSkeleton();
      expect(html).toContain('skeleton-table-row');
      expect(html).toContain('skeleton-table-cell');
      
      const rowMatches = html.match(/<tr class="skeleton-table-row"/g);
      expect(rowMatches).toHaveLength(5);

      const cellMatches = html.match(/<td class="skeleton-table-cell">/g);
      expect(cellMatches).toHaveLength(5 * 6);
    });

    it('debe generar una cantidad personalizada de filas y columnas', () => {
      const html = renderTableSkeleton(3, 4);
      const rowMatches = html.match(/<tr class="skeleton-table-row"/g);
      expect(rowMatches).toHaveLength(3);

      const cellMatches = html.match(/<td class="skeleton-table-cell">/g);
      expect(cellMatches).toHaveLength(3 * 4);
    });
  });

  describe('renderCardsSkeleton', () => {
    it('debe generar 3 tarjetas por defecto con placeholders de texto y botones', () => {
      const html = renderCardsSkeleton();
      expect(html).toContain('skeleton-card');
      expect(html).toContain('role="status"');
      expect(html).toContain('aria-busy="true"');

      const cardMatches = html.match(/class="skeleton-card"/g);
      expect(cardMatches).toHaveLength(3);
    });

    it('debe generar una cantidad personalizada de tarjetas', () => {
      const html = renderCardsSkeleton(5);
      const cardMatches = html.match(/class="skeleton-card"/g);
      expect(cardMatches).toHaveLength(5);
    });
  });

  describe('renderKanbanSkeleton', () => {
    it('debe generar 4 columnas y 2 tarjetas por columna por defecto para producción', () => {
      const html = renderKanbanSkeleton();
      expect(html).toContain('kanban-column');
      expect(html).toContain('skeleton-kanban-card');

      const colMatches = html.match(/class="kanban-column"/g);
      expect(colMatches).toHaveLength(4);

      const cardMatches = html.match(/class="skeleton-kanban-card"/g);
      expect(cardMatches).toHaveLength(4 * 2);
    });

    it('debe soportar columnas y tarjetas personalizadas', () => {
      const html = renderKanbanSkeleton(2, 3);
      const colMatches = html.match(/class="kanban-column"/g);
      expect(colMatches).toHaveLength(2);

      const cardMatches = html.match(/class="skeleton-kanban-card"/g);
      expect(cardMatches).toHaveLength(2 * 3);
    });
  });

  describe('renderChartSkeleton', () => {
    it('debe renderizar la estructura de un gráfico con altura por defecto de 220px', () => {
      const html = renderChartSkeleton();
      expect(html).toContain('height: 220px');
      expect(html).toContain('aria-label="Cargando gráfico..."');
      expect(html).toContain('skeleton-box');
    });

    it('debe permitir especificar una altura personalizada', () => {
      const html = renderChartSkeleton(350);
      expect(html).toContain('height: 350px');
    });
  });

  describe('renderProfileSkeleton', () => {
    it('debe renderizar un placeholder de perfil con avatar circular y campos de formulario', () => {
      const html = renderProfileSkeleton();
      expect(html).toContain('skeleton-circle');
      expect(html).toContain('aria-label="Cargando perfil..."');
      expect(html).toContain('role="status"');
      expect(html).toContain('aria-busy="true"');
      expect(html).toContain('grid-template-columns: repeat(auto-fit, minmax(200px, 1fr))');
    });
  });
});
