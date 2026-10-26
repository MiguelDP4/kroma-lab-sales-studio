import { describe, it, expect, vi } from 'vitest';
import { softwareView } from '../src/js/views/software-view.js';

describe('SoftwareView — Kroma Spot Studio Landing y Preprensa', () => {
  it('define los metadatos de ruta y permisos universales RBAC', () => {
    expect(softwareView.path).toBe('/software');
    expect(softwareView.name).toBe('software');
    expect(softwareView.allowedRoles).toEqual(
      expect.arrayContaining(['VISITOR', 'CUSTOMER', 'EMPLOYEE', 'ADMIN'])
    );
  });

  it('renderiza la estructura completa del software con GIF comparativo y presets', () => {
    const html = softwareView.render();
    expect(html).toContain('KROMA SPOT STUDIO');
    expect(html).toContain('kroma_spot_studio_vs_photoshop.gif');
    expect(html).toContain('Prueba de Estrés: Lote de 100 Imágenes PNG a 300 DPI');
    expect(html).toContain('Adobe Photoshop (Acciones / Droplet)');
    expect(html).toContain('Motor Binario de Kroma Spot Studio');
    expect(html).toContain('Audley / PhotoPRINT / Flexi');
    expect(html).toContain('Maintop / Hoson');
    expect(html).toContain('Roland VersaWorks');
    expect(html).toContain('Mimaki RasterLink');
    expect(html).toContain('Q195 GTQ');
    expect(html).toContain('Comprar / Activar por WhatsApp');
    expect(html).toContain('mailto:migueldp4@gmail.com');
  });

  it('ejecuta onMount y enlaza el desplazamiento suave hacia la sección de demostración', () => {
    const container = document.createElement('div');
    container.innerHTML = softwareView.render();
    document.body.appendChild(container);

    const demoSection = container.querySelector('#demostracion');
    demoSection.scrollIntoView = vi.fn();

    const cleanup = softwareView.onMount(container);
    expect(typeof cleanup).toBe('function');

    const btnScroll = container.querySelector('#btnScrollDemo');
    expect(btnScroll).toBeTruthy();

    btnScroll.click();
    expect(demoSection.scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth' });

    // Ejecutar teardown
    cleanup();
    btnScroll.click();
    document.body.removeChild(container);
  });

  it('maneja de forma segura onMount cuando no existe el botón o el contenedor es nulo', () => {
    const emptyContainer = document.createElement('div');
    const cleanup1 = softwareView.onMount(emptyContainer);
    expect(typeof cleanup1).toBe('function');
    cleanup1();

    const cleanup2 = softwareView.onMount(null);
    expect(typeof cleanup2).toBe('function');
    cleanup2();
  });
});
