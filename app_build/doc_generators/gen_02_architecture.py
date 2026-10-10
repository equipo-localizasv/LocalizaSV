import os
import sys
sys.path.append(os.path.dirname(__file__))
from docx_helper import (
    create_document, add_h1, add_h2, add_h3, add_p, add_bullet, 
    add_callout, add_table, add_image_if_exists
)
from PIL import Image, ImageDraw, ImageFont

OUTPUT_DIR = r"C:\Users\ANDERSON ALFARO\Desktop\DOCUMENTACION_MAGISTRAL_LOCALIZASV\02_ARQUITECTURA_Y_DIAGRAMAS"
IMG_ERD = r"C:\Users\ANDERSON ALFARO\.gemini\antigravity-ide\brain\c99c2690-1033-4c0b-b5e7-96ff5842af4e\erd_diagram_visual_1786980384116.jpg"
IMG_C4I_DASH = r"C:\Users\ANDERSON ALFARO\.gemini\antigravity-ide\brain\c99c2690-1033-4c0b-b5e7-96ff5842af4e\figma_dashboard_c4i_1790611512714.jpg"
IMG_MOD = r"C:\Users\ANDERSON ALFARO\.gemini\antigravity-ide\brain\c99c2690-1033-4c0b-b5e7-96ff5842af4e\figma_moderator_surveillance_1790611584184.jpg"
IMG_PNC = r"C:\Users\ANDERSON ALFARO\.gemini\antigravity-ide\brain\c99c2690-1033-4c0b-b5e7-96ff5842af4e\figma_authority_panel_1790611617452.jpg"

def create_layer_arch_image(filepath):
    width, height = 1200, 680
    im = Image.new("RGB", (width, height), (10, 15, 29))
    draw = ImageDraw.Draw(im)

    # Title box
    draw.rectangle([40, 25, 1160, 80], fill=(15, 23, 42), outline=(56, 189, 248), width=2)
    draw.text((60, 42), "LOCALIZASV — ARQUITECTURA GENERAL DEL SISTEMA C4I (4 CAPAS)", fill=(248, 250, 252))

    layers = [
        ("CAPA 1: PRESENTACIÓN & EXPERIENCIA CUA", "React 18 SPA + Vite • Leaflet GIS • WebSockets • Tailwind/Vanilla CSS Táctico • Glassmorphism", (2, 132, 199)),
        ("CAPA 2: SERVICIOS Y COMUNICACIÓN EN TIEMPO REAL", "Node.js Express REST API • Socket.io Engine • Ruteo Geodésico • Servicio Push FCM", (14, 165, 233)),
        ("CAPA 3: INTELIGENCIA ARTIFICIAL Y VISIÓN COMPUTACIONAL", "Detector YuNet (ONNX) • Extractor ArcFace 512-D • Zero-Copy Video Pipe • Similitud Coseno", (168, 85, 247)),
        ("CAPA 4: PERSISTENCIA, CRIPTOGRAFÍA Y CUSTODIA FORENSE", "Base de Datos Relacional PostgreSQL • Sellado Criptográfico SHA-256 • Bcrypt • File Storage", (16, 185, 129))
    ]

    y_start = 110
    for idx, (title, desc, color) in enumerate(layers):
        y1 = y_start + idx * 135
        y2 = y1 + 105
        # Box
        draw.rectangle([40, y1, 1160, y2], fill=(15, 23, 42), outline=color, width=3)
        draw.rectangle([40, y1, 1160, y1 + 35], fill=color)
        draw.text((60, y1 + 8), title, fill=(255, 255, 255))
        draw.text((60, y1 + 55), desc, fill=(203, 213, 225))

    im.save(filepath, quality=95)
    return filepath

def generate_sad():
    doc = create_document(
        title="DOCUMENTO DE ARQUITECTURA DE SOFTWARE (SAD)",
        subtitle="Modelo de Vistas 4+1 • Infraestructura C4I de Alta Disponibilidad",
        doc_code="SAD-LOCSV-ARCH-4P1",
        version="2.5.0"
    )

    add_h1(doc, "1. INTRODUCCIÓN Y METODOLOGÍA ARQUITECTÓNICA")
    add_p(doc, "El presente Documento de Arquitectura de Software describe la estructura técnica, componentes, patrones de diseño y mecanismos de comunicación de la plataforma LocalizaSV. Se adopta el modelo de vistas 4+1 de Philippe Kruchten para representar de manera integral las dimensiones lógica, de desarrollo, de procesos, física y de casos de uso.")

    add_h1(doc, "2. ARQUITECTURA DE CAPAS Y MODELO CONCEPTUAL")
    arch_img = os.path.join(OUTPUT_DIR, "diagrama_arquitectura_capas.jpg")
    create_layer_arch_image(arch_img)
    add_image_if_exists(doc, arch_img, caption="Figura 1: Arquitectura de 4 Capas de la Plataforma LocalizaSV C4I", width_inches=6.2)

    add_h2(doc, "2.1 Capa de Presentación (Frontend)")
    add_bullet(doc, "SPA moderna basada en React 18 y Vite con tiempos de recarga HMR inferiores a 50 ms.", "Tecnología:")
    add_bullet(doc, "Implementación rigurosa de la Técnica CUA (Claro, Único y Atractivo) con estética GovTech C4I.", "Diseño:")
    add_bullet(doc, "React-Leaflet, Leaflet.heat (mapa de calor) y Leaflet.markercluster para visualización cartográfica táctica.", "GIS Táctico:")

    add_h2(doc, "2.2 Capa de Negocio y Comunicación (Backend)")
    add_bullet(doc, "API RESTful construida sobre Node.js y Express con arquitectura modular de rutas, controladores y middlewares.", "Servidor de Aplicación:")
    add_bullet(doc, "Canal bidireccional WebSockets (Socket.io) para despacho instantáneo de Código Rojo y telemetría de patrullas.", "Eventos en Tiempo Real:")
    add_bullet(doc, "Algoritmo de cálculo de ruta geodésica con estimación de velocidad promedio de emergencia (sirena policial) y generación de deep links para Google Maps y Waze.", "Ruteo de Intercepción:")

    add_h2(doc, "2.3 Capa de Inteligencia Artificial Forense")
    add_bullet(doc, "Tubería Zero-Copy de alta velocidad que evita copias redundantes en memoria RAM durante el análisis de video CCTV.", "Transmisión de Video:")
    add_bullet(doc, "Modelo YuNet de detección facial que extrae 68 coordenadas faciales en 12 ms por fotograma.", "Detección Facial:")
    add_bullet(doc, "Modelo ArcFace que proyecta los rostros a un espacio euclidiano de 512 dimensiones y computa la similitud coseno contra la base de personas desaparecidas.", "Extracción y Cotejo:")

    add_h2(doc, "2.4 Capa de Persistencia y Seguridad Criptográfica")
    add_bullet(doc, "Esquema relacional en PostgreSQL / MockDB con soporte para transacciones ACID e índices geográficos.", "Base de Datos:")
    add_bullet(doc, "Generación de hashes SHA-256 para sellar actas de intervención policial y fotografías de evidencia.", "Cadena de Custodia:")

    add_h1(doc, "3. DIAGRAMA DE DESPLIEGUE Y TOPOLOGÍA DE RED")
    add_p(doc, "La infraestructura está diseñada para operar tanto en centro de datos gubernamental como en nodos perimetrales (Edge Computing) en delegaciones policiales:")

    top_headers = ["Nodo / Componente", "Tecnología", "Ubicación / Red", "Función"]
    top_data = [
        ["Gateway C4I", "Nginx / Reverse Proxy SSL", "DMZ Perimetral", "Balanceo y terminación TLS 1.3"],
        ["Backend API Server", "Node.js v20 LTS", "Red Interna Segura", "Lógica de negocio, autenticación y despacho"],
        ["AI Inference Worker", "Python / OpenCV ONNX", "Cluster GPU Forense", "Procesamiento de streams y biometría"],
        ["Database Primary", "PostgreSQL 15", "Red de Datos Aislada", "Persistencia de expedientes, alertas y usuarios"],
        ["Police Mobile Units", "PWA / Tablets PNC", "Red Celular LTE Encriptada", "Recepción de rutas y transmisión de GPS"]
    ]
    add_table(doc, top_headers, top_data)

    output_path = os.path.join(OUTPUT_DIR, "01_Documento_Arquitectura_Sistema_C4I_SAD.docx")
    doc.save(output_path)
    print(f"Generado: {output_path}")

def generate_diagrams_doc():
    doc = create_document(
        title="CATÁLOGO DE DIAGRAMAS ESTRUCTURALES Y DE COMPORTAMIENTO",
        subtitle="Modelos UML, Esquema ERD y Prototipos Operativos de Alta Fidelidad",
        doc_code="UML-LOCSV-CATALOGO",
        version="2.5.0"
    )

    add_h1(doc, "1. DIAGRAMA ENTIDAD-RELACIÓN (ERD)")
    add_p(doc, "El esquema de base de datos relacional modela el ciclo de vida de los casos de personas desaparecidas, pre-alertas de sensores, validación de moderadores y asignación policial:")
    add_image_if_exists(doc, IMG_ERD, caption="Figura 1: Diagrama Entidad-Relación (ERD) de la Base de Datos LocalizaSV", width_inches=6.2)

    add_h1(doc, "2. CONSOLA DE SUPERVISIÓN C4I Y MODERACIÓN BIOMÉTRICA")
    add_p(doc, "Prototipo de alta fidelidad que ilustra el flujo de videovigilancia ciudadana, detección facial simultánea y panel de confirmación humana:")
    add_image_if_exists(doc, IMG_MOD, caption="Figura 2: Consola de Videovigilancia y Moderación CCTV con Detección Biométrica", width_inches=6.2)
    add_image_if_exists(doc, IMG_C4I_DASH, caption="Figura 3: Cuadro de Mando Integral C4I de Búsqueda y Cobertura Nacional", width_inches=6.2)

    add_h1(doc, "3. CENTRO DE MANDO Y DESPACHO TÁCTICO POLICIAL (PNC)")
    add_p(doc, "Diseño de la consola de autoridad policial que integra el mapa de cobertura nacional, capas de calor, telemetría de patrullas y cálculo de ruta de llegada rápida:")
    add_image_if_exists(doc, IMG_PNC, caption="Figura 4: Centro de Mando Táctico PNC con Despacho de Emergencia y Ruteo GPS", width_inches=6.2)

    output_path = os.path.join(OUTPUT_DIR, "02_Diagramas_Estructurales_y_Comportamiento.docx")
    doc.save(output_path)
    print(f"Generado: {output_path}")

if __name__ == "__main__":
    generate_sad()
    generate_diagrams_doc()
