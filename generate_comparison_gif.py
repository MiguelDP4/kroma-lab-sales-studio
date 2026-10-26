"""
Generador de GIF animado de alta fidelidad: Kroma Spot Studio vs Adobe Photoshop.
Diseñado bajo el sistema de diseño visual de Kroma Lab (Space Indigo, Baltic Blue, Cerulean, Cyan, Magenta).
"""

from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

WIDTH = 840
HEIGHT = 500

# Paleta Kroma Lab
BG_COLOR = (13, 18, 36)          # #0d1224 Deep Indigo
SURFACE_LEFT = (26, 20, 28)      # Dark Reddish Slate for Photoshop
BORDER_LEFT = (90, 30, 45)
SURFACE_RIGHT = (18, 32, 58)     # Deep Cerulean Slate for Kroma Spot Studio
BORDER_RIGHT = (28, 114, 147)    # #1c7293 Cerulean
ACCENT_CYAN = (0, 229, 255)      # Spot 1 / Glow
ACCENT_MAGENTA = (255, 35, 195)  # Spot 3
COLOR_TEXT_PRIMARY = (255, 255, 255)
COLOR_TEXT_MUTED = (158, 179, 194)
COLOR_DANGER = (239, 68, 68)
COLOR_SUCCESS = (16, 185, 129)

def get_font(size: int, bold: bool = False):
    try:
        font_name = "segoeuib.ttf" if bold else "segoeui.ttf"
        return ImageFont.truetype(font_name, size)
    except Exception:
        try:
            return ImageFont.truetype("arial.ttf", size)
        except Exception:
            return ImageFont.load_default()

font_header = get_font(22, bold=True)
font_sub = get_font(13, bold=False)
font_card_title = get_font(18, bold=True)
font_metric = get_font(24, bold=True)
font_label = get_font(12, bold=True)
font_body = get_font(13, bold=False)
font_status = get_font(14, bold=True)
font_footer = get_font(13, bold=True)

def draw_rounded_rect(draw, bbox, radius, fill, outline=None, width=1):
    draw.rounded_rectangle(bbox, radius=radius, fill=fill, outline=outline, width=width)

def render_frame(step: int, total_steps: int) -> Image.Image:
    img = Image.new("RGB", (WIDTH, HEIGHT), BG_COLOR)
    draw = ImageDraw.Draw(img)

    # 1. Cabecera
    draw.text((WIDTH // 2, 24), "CREACIÓN DE CANALES SPOT (BLANCO & BARNIZ) — LOTE DE 100 PNGs", fill=COLOR_TEXT_PRIMARY, font=font_header, anchor="mm")
    draw.text((WIDTH // 2, 48), "Comparativa de rendimiento en taller: Flujo manual tradicional vs Motor binario Kroma Spot Studio", fill=COLOR_TEXT_MUTED, font=font_sub, anchor="mm")

    # 2. Tarjetas principales
    col_w = 380
    top_y = 70
    card_h = 360

    # ==================== COLUMNA IZQUIERDA: PHOTOSHOP ====================
    left_x = 30
    draw_rounded_rect(draw, [left_x, top_y, left_x + col_w, top_y + card_h], 12, SURFACE_LEFT, BORDER_LEFT, 2)

    # Icono y Título
    draw.text((left_x + 20, top_y + 24), "❌ ADOBE PHOTOSHOP", fill=COLOR_DANGER, font=font_card_title)
    draw.text((left_x + 20, top_y + 50), "Acciones automatizadas / Droplet manual", fill=COLOR_TEXT_MUTED, font=font_sub)

    # Simulación de progreso de Photoshop (muy lento, llega max al 12%)
    ps_progress = min(12, int(step * 0.5))
    ps_time_sec = int(step * 65)  # En segundos simulados
    ps_min = ps_time_sec // 60
    ps_sec = ps_time_sec % 60
    ps_time_str = f"{ps_min:02d}:{ps_sec:02d} min"

    # Medidor de Tiempo
    draw_rounded_rect(draw, [left_x + 20, top_y + 80, left_x + col_w - 20, top_y + 140], 8, (38, 24, 30))
    draw.text((left_x + 35, top_y + 96), "TIEMPO TRANSCURRIDO", fill=COLOR_DANGER, font=font_label)
    draw.text((left_x + 35, top_y + 120), ps_time_str, fill=COLOR_TEXT_PRIMARY, font=font_metric)
    draw.text((left_x + col_w - 35, top_y + 120), f"{ps_progress}/100 PNGs", fill=COLOR_TEXT_MUTED, font=font_status, anchor="rm")

    # Barra de progreso PS
    bar_x = left_x + 20
    bar_w = col_w - 40
    bar_y = top_y + 155
    draw_rounded_rect(draw, [bar_x, bar_y, bar_x + bar_w, bar_y + 10], 5, (45, 30, 38))
    fill_ps_w = int((ps_progress / 100.0) * bar_w)
    if fill_ps_w > 0:
        draw_rounded_rect(draw, [bar_x, bar_y, bar_x + fill_ps_w, bar_y + 10], 5, COLOR_DANGER)

    # Métricas de consumo
    y_m = top_y + 185
    draw.text((left_x + 20, y_m), "• Consumo de RAM:", fill=COLOR_TEXT_MUTED, font=font_body)
    draw.text((left_x + col_w - 20, y_m), "14.8 GB (94% - Saturación)", fill=COLOR_DANGER, font=font_body, anchor="ra")

    draw.text((left_x + 20, y_m + 26), "• Tiempo por imagen:", fill=COLOR_TEXT_MUTED, font=font_body)
    draw.text((left_x + col_w - 20, y_m + 26), "~15.0 segundos / archivo", fill=COLOR_DANGER, font=font_body, anchor="ra")

    draw.text((left_x + 20, y_m + 52), "• Intervención del operador:", fill=COLOR_TEXT_MUTED, font=font_body)
    draw.text((left_x + col_w - 20, y_m + 52), "Constante (Photoshop abierto)", fill=COLOR_TEXT_PRIMARY, font=font_body, anchor="ra")

    draw.text((left_x + 20, y_m + 78), "• Riesgo mecánico:", fill=COLOR_TEXT_MUTED, font=font_body)
    draw.text((left_x + col_w - 20, y_m + 78), "Reborde blanco (sin Choke)", fill=COLOR_DANGER, font=font_body, anchor="ra")

    # Estado inferior PS
    draw_rounded_rect(draw, [left_x + 20, top_y + card_h - 52, left_x + col_w - 20, top_y + card_h - 16], 6, (40, 20, 25))
    draw.text((left_x + col_w // 2, top_y + card_h - 34), "⏳ PC del RIP congelada durante el proceso", fill=COLOR_DANGER, font=font_status, anchor="mm")


    # ==================== COLUMNA DERECHA: KROMA SPOT STUDIO ====================
    right_x = WIDTH - col_w - 30
    draw_rounded_rect(draw, [right_x, top_y, right_x + col_w, top_y + card_h], 12, SURFACE_RIGHT, BORDER_RIGHT, 2)

    # Icono y Título
    draw.text((right_x + 20, top_y + 24), "⚡ KROMA SPOT STUDIO", fill=ACCENT_CYAN, font=font_card_title)
    draw.text((right_x + 20, top_y + 50), "Motor binario industrial NumPy + Cython LZW", fill=COLOR_TEXT_MUTED, font=font_sub)

    # Simulación de progreso de Kroma (completa al 100% en los primeros 4 frames)
    kroma_pct = min(100, step * 25)
    kroma_time = min(3.84, step * 0.96)
    kroma_files = min(100, step * 25)

    # Medidor de Tiempo
    draw_rounded_rect(draw, [right_x + 20, top_y + 80, right_x + col_w - 20, top_y + 140], 8, (12, 45, 75))
    draw.text((right_x + 35, top_y + 96), "TIEMPO TOTAL DEL LOTE", fill=ACCENT_CYAN, font=font_label)
    draw.text((right_x + 35, top_y + 120), f"00:0{kroma_time:.2f} s", fill=COLOR_TEXT_PRIMARY, font=font_metric)
    draw.text((right_x + col_w - 35, top_y + 120), f"{kroma_files}/100 TIFFs", fill=COLOR_SUCCESS, font=font_status, anchor="rm")

    # Barra de progreso Kroma
    bar_k_x = right_x + 20
    draw_rounded_rect(draw, [bar_k_x, bar_y, bar_k_x + bar_w, bar_y + 10], 5, (16, 35, 55))
    fill_k_w = int((kroma_pct / 100.0) * bar_w)
    if fill_k_w > 0:
        draw_rounded_rect(draw, [bar_k_x, bar_y, bar_k_x + fill_k_w, bar_y + 10], 5, COLOR_SUCCESS)

    # Métricas de consumo
    draw.text((right_x + 20, y_m), "• Consumo de RAM:", fill=COLOR_TEXT_MUTED, font=font_body)
    draw.text((right_x + col_w - 20, y_m), "42 MB (Cero impacto)", fill=COLOR_SUCCESS, font=font_body, anchor="ra")

    draw.text((right_x + 20, y_m + 26), "• Velocidad por imagen:", fill=COLOR_TEXT_MUTED, font=font_body)
    draw.text((right_x + col_w - 20, y_m + 26), "0.038 segundos / archivo", fill=COLOR_SUCCESS, font=font_body, anchor="ra")

    draw.text((right_x + 20, y_m + 52), "• Canales Spot generados:", fill=COLOR_TEXT_MUTED, font=font_body)
    draw.text((right_x + col_w - 20, y_m + 52), "Spot_1 y Spot_3 (8BIM nativo)", fill=ACCENT_CYAN, font=font_body, anchor="ra")

    draw.text((right_x + 20, y_m + 78), "• Preprensa integrada:", fill=COLOR_TEXT_MUTED, font=font_body)
    draw.text((right_x + col_w - 20, y_m + 78), "Choke (1-5 px) + Limpieza Alfa", fill=COLOR_SUCCESS, font=font_body, anchor="ra")

    # Estado inferior Kroma
    draw_rounded_rect(draw, [right_x + 20, top_y + card_h - 52, right_x + col_w - 20, top_y + card_h - 16], 6, (14, 60, 48))
    draw.text((right_x + col_w // 2, top_y + card_h - 34), "✓ 100% Listo para el RIP (Audley / Hoson / Flexi)", fill=COLOR_SUCCESS, font=font_status, anchor="mm")

    # 3. Pie de página resumen
    draw_rounded_rect(draw, [30, HEIGHT - 52, WIDTH - 30, HEIGHT - 14], 8, (22, 33, 62), (28, 114, 147), 1)
    draw.text((WIDTH // 2, HEIGHT - 33), "🚀 KROMA SPOT STUDIO: 390x MÁS RÁPIDO • CERO CONSUMO DE RAM • 100% OFFLINE", fill=COLOR_TEXT_PRIMARY, font=font_footer, anchor="mm")

    return img

def main():
    assets_dir = Path(r"D:\Kroma Lab\Kroma Lab Sales Studio\frontend\src\assets")
    assets_dir.mkdir(parents=True, exist_ok=True)
    out_gif = assets_dir / "kroma_spot_studio_vs_photoshop.gif"

    frames = []
    total_steps = 24  # 24 frames para un ciclo suave y liviano

    for step in range(1, total_steps + 1):
        frame = render_frame(step, total_steps)
        frames.append(frame)

    # Duraciones por frame: los primeros frames a 160ms, el frame final a 2500ms para leer el resultado
    durations = [180] * (total_steps - 1) + [3000]

    frames[0].save(
        out_gif,
        save_all=True,
        append_images=frames[1:],
        duration=durations,
        loop=0,
        optimize=True,
    )
    print(f"GIF generado con éxito: {out_gif} ({out_gif.stat().st_size / 1024:.1f} KB)")

if __name__ == "__main__":
    main()
