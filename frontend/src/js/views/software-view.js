/**
 * Vista de Kroma Spot Studio — Software de Preprensa Industrial UV DTF y DTF Textil.
 * Presenta la solución técnica, comparativa en GIF vs Photoshop, presets y opciones de descarga.
 */

import { BUSINESS_CONFIG } from '../../shared/business-config.js';

export const softwareView = {
  path: '/software',
  name: 'software',
  allowedRoles: ['VISITOR', 'CUSTOMER', 'EMPLOYEE', 'ADMIN'],
  render: () => {
    const waPhone = BUSINESS_CONFIG?.whatsappPhone || '50200000000';
    const cleanPhone = String(waPhone).replace(/\D/g, '');
    const waMessage = encodeURIComponent(
      '¡Hola Miguel! Me interesa el software Kroma Spot Studio para mi taller de impresión. ¿Podrías darme más información?'
    );
    const waLink = `https://wa.me/${cleanPhone}?text=${waMessage}`;

    return `
      <div class="software-view-container" style="max-width: 1080px; margin: 1rem auto 3rem; padding: 0 0.5rem;">
        
        <!-- ====================================================================
             1. HERO SECTION: TÍTULO, BADGES Y PROPUESTA DE VALOR
             ==================================================================== -->
        <header style="text-align: center; margin-bottom: 2rem;">
          <div style="display: inline-flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; justify-content: center; margin-bottom: 0.75rem;">
            <span class="badge" style="color: var(--cerulean); border-color: var(--cerulean); font-weight: 700;">
              ⚡ TECNOLOGÍA PROPIA KROMA LAB
            </span>
            <span class="badge" style="background: rgba(16, 185, 129, 0.15); color: #10b981; border-color: #10b981; font-weight: 700;">
              ✓ 100% OFFLINE Y AUTÓNOMO
            </span>
            <span class="badge" style="background: rgba(0, 229, 255, 0.15); color: #00E5FF; border-color: #00E5FF; font-weight: 700;">
              🚀 0.04s POR IMAGEN
            </span>
          </div>

          <h1 style="font-size: clamp(2rem, 5vw, 2.9rem); font-weight: 900; line-height: 1.15; color: var(--text-primary); letter-spacing: -0.03em; margin: 0 0 0.75rem;">
            KROMA SPOT STUDIO
          </h1>
          <p style="font-size: clamp(1rem, 2.5vw, 1.25rem); color: var(--text-secondary); max-width: 780px; margin: 0 auto 1.5rem; line-height: 1.45;">
            El generador automático de canales de tinta plana (<strong style="color: var(--accent-uv);">Spot_1 Blanco</strong> y <strong style="color: #FF23C3);">Spot_3 Barniz</strong>) para impresoras industriales UV DTF, DTF Textil y Cama Plana UV. Genera archivos TIFF LZW a 300 DPI listos para tu RIP en segundos, <strong>sin tocar Photoshop</strong>.
          </p>

          <div style="display: flex; gap: 0.75rem; justify-content: center; flex-wrap: wrap;">
            <a href="#demostracion" class="btn btn-primary" id="btnScrollDemo" style="min-height: 48px; padding: 0.75rem 1.4rem; font-weight: 700; display: inline-flex; align-items: center; gap: 0.5rem;">
              <span>Ver Comparativa en Acción</span>
              <span>⚡</span>
            </a>
            <a href="${waLink}" target="_blank" rel="noopener noreferrer" class="btn" style="min-height: 48px; padding: 0.75rem 1.4rem; background: rgba(37, 211, 102, 0.15); color: #25D366; border: 1px solid #25D366; font-weight: 700; display: inline-flex; align-items: center; gap: 0.5rem;">
              <span>Consultar por WhatsApp</span>
              <span>💬</span>
            </a>
          </div>
        </header>

        <!-- ====================================================================
             2. DEMOSTRACIÓN EN GIF: COMPARATIVA PHOTOSHOP VS KROMA SPOT STUDIO
             ==================================================================== -->
        <section id="demostracion" style="margin-bottom: 2.5rem;">
          <div style="background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: 12px; overflow: hidden; box-shadow: 0 8px 30px rgba(0,0,0,0.35);">
            <div style="padding: 1rem 1.25rem; background: var(--bg-surface-elevated); border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.5rem;">
              <div>
                <span style="font-weight: 800; color: var(--text-primary); font-size: 1.05rem;">
                  Prueba de Estrés: Lote de 100 Imágenes PNG a 300 DPI
                </span>
                <span style="display: block; font-size: 0.82rem; color: var(--text-secondary);">
                  Adobe Photoshop (Acciones / Droplet) vs Motor Binario de Kroma Spot Studio
                </span>
              </div>
              <span class="badge" style="background: rgba(0, 229, 255, 0.1); color: #00E5FF; border-color: #00E5FF;">
                99.7% Ahorro de Tiempo
              </span>
            </div>

            <div style="position: relative; text-align: center; background: #000; padding: 0.5rem;">
              <img 
                src="./src/assets/kroma_spot_studio_vs_photoshop.gif" 
                alt="Comparativa de velocidad entre Photoshop y Kroma Spot Studio" 
                id="gifComparisonImg"
                style="width: 100%; max-width: 840px; height: auto; border-radius: 6px; display: block; margin: 0 auto;"
                loading="eager"
              />
            </div>

            <div style="padding: 1rem 1.25rem; background: var(--bg-surface); display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; text-align: center;">
              <div style="padding: 0.75rem; background: var(--bg-surface-elevated); border-radius: 8px; border: 1px solid var(--border-color);">
                <div style="font-size: 1.5rem; font-weight: 900; color: #10b981;">0.038 s</div>
                <div style="font-size: 0.85rem; color: var(--text-secondary);">Por imagen (390x más veloz)</div>
              </div>
              <div style="padding: 0.75rem; background: var(--bg-surface-elevated); border-radius: 8px; border: 1px solid var(--border-color);">
                <div style="font-size: 1.5rem; font-weight: 900; color: #00E5FF;">42 MB</div>
                <div style="font-size: 0.85rem; color: var(--text-secondary);">Consumo de RAM (Cero cuelgues)</div>
              </div>
              <div style="padding: 0.75rem; background: var(--bg-surface-elevated); border-radius: 8px; border: 1px solid var(--border-color);">
                <div style="font-size: 1.5rem; font-weight: 900; color: #F59E0B;">30–45 min</div>
                <div style="font-size: 0.85rem; color: var(--text-secondary);">Ahorro de diseñador al día</div>
              </div>
            </div>
          </div>
        </section>

        <!-- ====================================================================
             3. TABLA COMPARATIVA: EL DOLOR DEL TALLER VS KROMA SPOT STUDIO
             ==================================================================== -->
        <section style="margin-bottom: 2.5rem;">
          <h2 style="font-size: 1.5rem; font-weight: 800; color: var(--text-primary); margin-bottom: 1rem; text-align: center;">
            ¿Por qué los talleres dejan de usar Photoshop para canales Spot?
          </h2>

          <div style="overflow-x: auto; -webkit-overflow-scrolling: touch; border: 1px solid var(--border-color); border-radius: 10px; background: var(--bg-surface);">
            <table style="width: 100%; border-collapse: collapse; min-width: 620px; font-size: 0.95rem;">
              <thead>
                <tr style="background: var(--bg-surface-elevated); border-bottom: 1px solid var(--border-color); text-align: left;">
                  <th style="padding: 0.9rem 1rem; color: var(--text-primary); font-weight: 700;">Aspecto Técnico</th>
                  <th style="padding: 0.9rem 1rem; color: #EF4444; font-weight: 700;">Adobe Photoshop (Acciones / Manual)</th>
                  <th style="padding: 0.9rem 1rem; color: #10B981; font-weight: 700;">Kroma Spot Studio</th>
                </tr>
              </thead>
              <tbody>
                <tr style="border-bottom: 1px solid var(--border-color);">
                  <td style="padding: 0.85rem 1rem; font-weight: 600; color: var(--text-primary);">Tiempo por lote de 100 PNGs</td>
                  <td style="padding: 0.85rem 1rem; color: #EF4444;">18 a 25 minutos</td>
                  <td style="padding: 0.85rem 1rem; color: #10B981; font-weight: 700;">3.8 segundos</td>
                </tr>
                <tr style="border-bottom: 1px solid var(--border-color);">
                  <td style="padding: 0.85rem 1rem; font-weight: 600; color: var(--text-primary);">Impacto en Memoria RAM</td>
                  <td style="padding: 0.85rem 1rem; color: #EF4444;">Satura 16 GB y congela la PC del RIP</td>
                  <td style="padding: 0.85rem 1rem; color: #10B981; font-weight: 700;">Menos de 50 MB de memoria</td>
                </tr>
                <tr style="border-bottom: 1px solid var(--border-color);">
                  <td style="padding: 0.85rem 1rem; font-weight: 600; color: var(--text-primary);">Contracción de Blanco (Choke)</td>
                  <td style="padding: 0.85rem 1rem; color: #EF4444;">Manual y tedioso en selecciones</td>
                  <td style="padding: 0.85rem 1rem; color: #10B981; font-weight: 700;">Deslizador automático de 0 a 5 px</td>
                </tr>
                <tr style="border-bottom: 1px solid var(--border-color);">
                  <td style="padding: 0.85rem 1rem; font-weight: 600; color: var(--text-primary);">Limpieza de Halos Sucios</td>
                  <td style="padding: 0.85rem 1rem; color: #EF4444;">Copia halos transparentes al blanco</td>
                  <td style="padding: 0.85rem 1rem; color: #10B981; font-weight: 700;">Umbral Alfa regulable (0 a 255)</td>
                </tr>
                <tr style="border-bottom: 1px solid var(--border-color);">
                  <td style="padding: 0.85rem 1rem; font-weight: 600; color: var(--text-primary);">Rocío CMYK en fondo transparente</td>
                  <td style="padding: 0.85rem 1rem; color: #EF4444;">Común si el PNG tiene color residual</td>
                  <td style="padding: 0.85rem 1rem; color: #10B981; font-weight: 700;">Blanqueo RGB automático a (255, 255, 255)</td>
                </tr>
                <tr>
                  <td style="padding: 0.85rem 1rem; font-weight: 600; color: var(--text-primary);">Licenciamiento y Dependencia</td>
                  <td style="padding: 0.85rem 1rem; color: #EF4444;">Suscripción mensual costosa ($20–$50/mes)</td>
                  <td style="padding: 0.85rem 1rem; color: #10B981; font-weight: 700;">Pago único de por vida (Sin suscripciones)</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <!-- ====================================================================
             4. COMPATIBILIDAD CON SOFTWARE RIP INDUSTRIAL
             ==================================================================== -->
        <section style="margin-bottom: 2.5rem;">
          <h2 style="font-size: 1.5rem; font-weight: 800; color: var(--text-primary); margin-bottom: 0.5rem; text-align: center;">
            Presets Listos para tu Impresora y Software RIP
          </h2>
          <p style="text-align: center; color: var(--text-secondary); margin-bottom: 1.25rem;">
            Inyecta las etiquetas binarias propietarias de Adobe Photoshop (Tag 34377 y Resource 1007 DisplayInfo con kind=2) para reconocimiento directo:
          </p>

          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1rem;">
            <div style="background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: 8px; padding: 1rem;">
              <div style="font-weight: 700; color: var(--accent-uv); margin-bottom: 0.35rem;">Audley / PhotoPRINT / Flexi</div>
              <div style="font-size: 0.85rem; color: var(--text-secondary);">Blanco: <code style="color: #00E5FF;">Spot_1</code> • Barniz: <code style="color: #FF23C3;">Spot_3</code></div>
            </div>
            <div style="background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: 8px; padding: 1rem;">
              <div style="font-weight: 700; color: var(--accent-uv); margin-bottom: 0.35rem;">Maintop / Hoson</div>
              <div style="font-size: 0.85rem; color: var(--text-secondary);">Blanco: <code style="color: #00E5FF;">W1</code> • Barniz: <code style="color: #FF23C3;">V1</code></div>
            </div>
            <div style="background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: 8px; padding: 1rem;">
              <div style="font-weight: 700; color: var(--accent-uv); margin-bottom: 0.35rem;">Roland VersaWorks</div>
              <div style="font-size: 0.85rem; color: var(--text-secondary);">Blanco: <code style="color: #00E5FF;">RDG_WHITE</code> • Barniz: <code style="color: #FF23C3;">RDG_GLOSS</code></div>
            </div>
            <div style="background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: 8px; padding: 1rem;">
              <div style="font-weight: 700; color: var(--accent-uv); margin-bottom: 0.35rem;">Mimaki RasterLink</div>
              <div style="font-size: 0.85rem; color: var(--text-secondary);">Blanco: <code style="color: #00E5FF;">SpotWhite</code> • Barniz: <code style="color: #FF23C3;">SpotClear</code></div>
            </div>
          </div>
        </section>

        <!-- ====================================================================
             5. SECCIÓN DE DESCARGA / ADQUISICIÓN COMERCIAL
             ==================================================================== -->
        <section id="adquisicion" style="background: var(--bg-surface); border: 2px solid var(--cerulean); border-radius: 14px; padding: 1.75rem 1.25rem; text-align: center;">
          <span class="badge" style="background: rgba(28, 114, 147, 0.2); color: var(--accent-uv); border-color: var(--accent-uv); margin-bottom: 0.5rem;">
            OFERTA DE LANZAMIENTO PARA TALLERES
          </span>
          <h2 style="font-size: clamp(1.5rem, 3.5vw, 2rem); font-weight: 800; color: var(--text-primary); margin: 0 0 0.5rem;">
            Obtén Kroma Spot Studio Hoy Mismo
          </h2>
          <p style="color: var(--text-secondary); max-width: 600px; margin: 0 auto 1.25rem;">
            Sin mensualidades. Licencia de pago único para tu estación de preprensa en el taller. Compatible con Windows 10 y 11 de 64 bits.
          </p>

          <div style="margin-bottom: 1.5rem;">
            <span style="font-size: 2.2rem; font-weight: 900; color: #10B981;">Q195 GTQ</span>
            <span style="font-size: 1.1rem; color: var(--text-secondary); margin-left: 0.35rem;">($25 USD)</span>
            <span style="display: block; font-size: 0.85rem; color: var(--text-muted); margin-top: 0.25rem;">
              Pago único • Uso ilimitado de por vida • Actualizaciones incluidas
            </span>
          </div>

          <div style="display: flex; gap: 0.75rem; justify-content: center; flex-wrap: wrap;">
            <a href="${waLink}" target="_blank" rel="noopener noreferrer" class="btn btn-primary" id="btnBuySoftware" style="min-height: 48px; padding: 0.85rem 1.75rem; font-size: 1rem; font-weight: 800; display: inline-flex; align-items: center; gap: 0.5rem;">
              <span>Comprar / Activar por WhatsApp</span>
              <span>💬</span>
            </a>
            <a href="mailto:migueldp4@gmail.com?subject=Kroma%20Spot%20Studio%20-%20Consulta%20de%20Compra" class="btn" style="min-height: 48px; padding: 0.85rem 1.4rem; background: var(--bg-surface-elevated); color: var(--text-primary); border: 1px solid var(--border-color); font-weight: 700; display: inline-flex; align-items: center; gap: 0.5rem;">
              <span>Escribir por Correo</span>
              <span>✉️</span>
            </a>
          </div>
        </section>

      </div>
    `;
  },
  onMount: (container) => {
    const btnScroll = container?.querySelector('#btnScrollDemo');
    if (btnScroll) {
      const handleScroll = (e) => {
        e.preventDefault();
        const demoSection = container.querySelector('#demostracion');
        if (demoSection) {
          demoSection.scrollIntoView({ behavior: 'smooth' });
        }
      };
      btnScroll.addEventListener('click', handleScroll);
      return () => {
        btnScroll.removeEventListener('click', handleScroll);
      };
    }
    return () => {};
  },
};
