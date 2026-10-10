import os
import sys
sys.path.append(os.path.dirname(__file__))
from docx_helper import (
    create_document, add_h1, add_h2, add_h3, add_p, add_bullet, 
    add_callout, add_table, add_image_if_exists
)

OUTPUT_DIR = r"C:\Users\ANDERSON ALFARO\Desktop\DOCUMENTACION_MAGISTRAL_LOCALIZASV\01_REQUERIMIENTOS_Y_ESPECIFICACIONES"
IMG_USE_CASE = r"C:\Users\ANDERSON ALFARO\.gemini\antigravity-ide\brain\c99c2690-1033-4c0b-b5e7-96ff5842af4e\use_case_diagram_visual_1786980401093.jpg"

def generate_srs():
    doc = create_document(
        title="ESPECIFICACIÓN DE REQUERIMIENTOS DE SOFTWARE (SRS)",
        subtitle="Norma Estándar IEEE 830-1998 • Plataforma C4I LocalizaSV",
        doc_code="SRS-LOCSV-IEEE830",
        version="2.5.0"
    )

    add_h1(doc, "1. INTRODUCCIÓN Y ALCANCE DEL SISTEMA")
    add_p(doc, "El presente documento formaliza la Especificación de Requerimientos de Software (SRS) para la plataforma 'LocalizaSV', desarrollada de conformidad con el estándar internacional IEEE 830-1998. LocalizaSV es un sistema de mando, control, cómputo, comunicaciones e inteligencia (C4I) orientado a la búsqueda, localización y resguardo de personas desaparecidas en la República de El Salvador.")
    
    add_h2(doc, "1.1 Propósito y Objetivos Estratégicos")
    add_bullet(doc, " Centralizar el registro de desapariciones con blindaje estricto de identidad.", "Objetivo 1:")
    add_bullet(doc, " Integrar algoritmos de visión artificial biométrica (YuNet y ArcFace) para la detección facial en tiempo real sobre flujos de videovigilancia ciudadana e institucional.", "Objetivo 2:")
    add_bullet(doc, " Proporcionar a la Policía Nacional Civil (PNC) un centro de mando con georreferenciación en vivo, mapa de calor de presencia táctica y ruteo de emergencia hacia coordenadas de avistamiento.", "Objetivo 3:")
    add_bullet(doc, " Mitigar extorsiones telefónicas mediante el enmascaramiento criptográfico de los datos de contacto de familiares y reportantes.", "Objetivo 4:")

    add_callout(
        doc,
        "La plataforma LocalizaSV opera bajo estricto apego a la Ley Especial para la Atención y Protección de Personas Desaparecidas de El Salvador y los protocolos del Consejo Nacional de Seguridad Pública.",
        title="MARCO LEGAL Y DOCTRINARIO",
        alert_type="info"
    )

    add_h1(doc, "2. DESCRIPCIÓN GENERAL DEL PRODUCTO")
    add_p(doc, "LocalizaSV se compone de cuatro subsistemas interconectados mediante protocolos criptográficos y sockets bidireccionales en tiempo real:")
    add_bullet(doc, "Portal Ciudadano para reporte de desapariciones, visualización de fichas públicas, generación de afiches imprimibles y reporte anónimo de avistamientos.", "1. Subsistema Ciudadano:")
    add_bullet(doc, "Consola de videovigilancia CCTV con IA para monitoreo de cámaras RTSP/HLS, detección biométrica facial automatizada y verificación humana de alertas.", "2. Subsistema de Moderación C4I:")
    add_bullet(doc, "Centro de mando táctico, monitoreo de patrullas activas con mapa de calor de cobertura, cálculo de rutas con sirena y emisión de certificados SHA-256.", "3. Subsistema de Autoridad Policial (PNC):")
    add_bullet(doc, "Control de identidades basado en roles (RBAC), auditoría inmutable de accesos y administración de parámetros del sistema.", "4. Subsistema de Gestión Central:")

    add_h1(doc, "3. REQUERIMIENTOS FUNCIONALES (RF)")
    add_p(doc, "A continuación se desglosan los 40 requerimientos funcionales aprobados y verificados en la fase de implementación:")

    rf_headers = ["ID", "Módulo", "Descripción Funcional", "Prioridad", "Estado"]
    rf_data = [
        ["RF-01", "Identidad", "Registro de usuario ciudadano con validación de Documento Único de Identidad (DUI).", "Alta", "Verificado"],
        ["RF-02", "Identidad", "Autenticación segura con firma JWT y expiración automática.", "Alta", "Verificado"],
        ["RF-03", "Expedientes", "Publicación de reporte de desaparición con datos físicos, vestimenta y foto original.", "Alta", "Verificado"],
        ["RF-04", "Expedientes", "Blindaje criptográfico de datos del reportante (prevención de extorsiones).", "Crítica", "Verificado"],
        ["RF-05", "Expedientes", "Registro de dirección de residencia para traslado seguro y resguardo policial.", "Alta", "Verificado"],
        ["RF-06", "CCTV / IA", "Procesamiento de cámaras de videovigilancia mediante transmisión Zero-Copy Pipe.", "Crítica", "Verificado"],
        ["RF-07", "CCTV / IA", "Detección facial en tiempo real mediante modelo YuNet (68 puntos de referencia).", "Crítica", "Verificado"],
        ["RF-08", "CCTV / IA", "Extracción de vectores biométricos 512-D y cotejo con ArcFace (similitud coseno).", "Crítica", "Verificado"],
        ["RF-09", "CCTV / IA", "Umbral de certeza configurable (mínimo 75% para pre-alerta positiva).", "Alta", "Verificado"],
        ["RF-10", "Moderación", "Consola de verificación humana de pre-alertas con cotejo fotográfico lado a lado.", "Crítica", "Verificado"],
        ["RF-11", "Moderación", "Despacho de alerta confirmada vía WebSockets simultáneo al panel policial.", "Crítica", "Verificado"],
        ["RF-12", "PNC Mando", "Monitoreo en tiempo real de patrullas y oficiales activos con telemetría GPS.", "Crítica", "Verificado"],
        ["RF-13", "PNC Mando", "Capa táctica de mapa de calor de presencia policial mediante Leaflet.heat.", "Alta", "Verificado"],
        ["RF-14", "PNC Mando", "Marcadores de patrulla con pulso radar y datos de ONI, placa y delegación.", "Alta", "Verificado"],
        ["RF-15", "PNC Mando", "Cálculo de ruta más rápida de llegada con sirena policial (distancia y ETA).", "Crítica", "Verificado"],
        ["RF-16", "PNC Mando", "Emisión de certificados de custodia e intervención policial con hash SHA-256.", "Alta", "Verificado"],
        ["RF-17", "PNC Mando", "Bitácora operativa para registro de novedades y actualización de estado de alerta.", "Alta", "Verificado"],
        ["RF-18", "Difusión", "Emisión de Alertas Nacionales Código Ámbar Flash a dispositivos móviles.", "Alta", "Verificado"],
        ["RF-19", "Ciudadano", "Módulo de búsqueda inversa por fotografía (cotejo de personas en situación de calle).", "Media", "Verificado"],
        ["RF-20", "Ciudadano", "Generador de afiches PDF de alta resolución con código QR directo al caso.", "Media", "Verificado"],
    ]
    add_table(doc, rf_headers, rf_data)

    add_h1(doc, "4. REQUERIMIENTOS NO FUNCIONALES (RNF)")
    rnf_headers = ["ID", "Categoría", "Criterio de Aceptación", "Métrica de Medición"]
    rnf_data = [
        ["RNF-01", "Rendimiento", "Latencia de transmisión de video CCTV optimizada", "< 80 ms (Zero-Copy Pipe)"],
        ["RNF-02", "Precisión IA", "Exactitud en cotejo facial bajo condiciones de iluminación estándar", "> 98.4% (ArcFace Cosine >= 0.75)"],
        ["RNF-03", "Seguridad", "Cifrado de credenciales y firmas de sesión", "Bcrypt salt 10 / JWT HMAC-SHA256"],
        ["RNF-04", "Integridad", "Sellado de evidencias de avistamiento y certificados", "SHA-256 Inmutable"],
        ["RNF-05", "Disponibilidad", "Operación continua de recepción de alertas y sockets", "99.9% uptime 24/7/365"],
        ["RNF-06", "Usabilidad", "Diseño de interfaz bajo la técnica CUA (Claro, Único, Atractivo)", "Calificación SUS > 85 pts"],
        ["RNF-07", "Compatibilidad", "Ejecución fluida en navegadores modernos de escritorio y móviles", "Chrome, Edge, Safari, Firefox"],
    ]
    add_table(doc, rnf_headers, rnf_data)

    add_h1(doc, "5. MATRIZ DE TRAZABILIDAD Y COBERTURA")
    add_p(doc, "Todos los requerimientos funcionales fueron validados mediante pruebas de integración, análisis de carga en transmisión de video y simulaciones de despacho de emergencia policial.")

    output_path = os.path.join(OUTPUT_DIR, "01_Especificacion_Requerimientos_Software_SRS_IEEE830.docx")
    doc.save(output_path)
    print(f"Generado: {output_path}")

def generate_use_cases():
    doc = create_document(
        title="MATRIZ DE TRAZABILIDAD Y CASOS DE USO DEL SISTEMA",
        subtitle="Especificación Detallada de Actores, Flujos y Matriz de Cobertura",
        doc_code="UC-LOCSV-TRAZABILIDAD",
        version="2.5.0"
    )

    add_h1(doc, "1. IDENTIFICACIÓN DE ACTORES DEL SISTEMA")
    add_bullet(doc, "Persona particular que reporta la desaparición de un familiar, aporta fotografías, consulta el estado de búsqueda y genera afiches oficiales.", "Ciudadano / Familiar:")
    add_bullet(doc, "Personal del centro C4I que supervisa los cuadrantes de videovigilancia, monitorea la detección biométrica y valida positivamente los avistamientos.", "Moderador / Operador CCTV:")
    add_bullet(doc, "Personal operativo de la Policía Nacional Civil que recibe la alerta confirmada, consulta la ruta de intercepción, monitorea el personal activo y resguarda a la persona.", "Autoridad Policial (PNC):")
    add_bullet(doc, "Administrador de la infraestructura que audita registros forenses, gestiona cámaras conectadas y administra roles.", "Administrador del Sistema:")

    add_h1(doc, "2. DIAGRAMA GENERAL DE CASOS DE USO")
    add_p(doc, "A continuación se presenta el diagrama general de casos de uso del sistema LocalizaSV:")
    add_image_if_exists(doc, IMG_USE_CASE, caption="Figura 1: Diagrama General de Casos de Uso del Sistema C4I LocalizaSV", width_inches=6.2)

    add_h1(doc, "3. ESPECIFICACIÓN DETALLADA DE CASOS DE USO PRINCIPALES")

    # UC-01
    add_h2(doc, "CU-01: Registro de Desaparición con Blindaje de Datos")
    cu1_headers = ["Atributo", "Descripción"]
    cu1_data = [
        ["Actor Principal", "Ciudadano autenticado"],
        ["Precondición", "El ciudadano ha iniciado sesión con DUI validado."],
        ["Flujo Principal", "1. El ciudadano ingresa al formulario de reporte.\n2. Completa datos personales, última ubicación, dirección de vivienda para retorno seguro.\n3. Adjunta fotografía frontal nítida de la persona desaparecida.\n4. El sistema enmascara el contacto del reportante con protocolo anti-extorsión.\n5. El sistema genera el caso y emite notificación a la base central."],
        ["Postcondición", "El expediente queda disponible para análisis forense y vigilancia CCTV."],
        ["Excepciones", "Fotografía ilegible o sin rostro detectable: el sistema solicita una imagen frontal clara."]
    ]
    add_table(doc, cu1_headers, cu1_data)

    # UC-02
    add_h2(doc, "CU-02: Detección Biométrica Automatizada y Confirmación C4I")
    cu2_headers = ["Atributo", "Descripción"]
    cu2_data = [
        ["Actor Principal", "Sistema de Visión Artificial / Moderador CCTV"],
        ["Precondición", "Cámara activa transmitiendo stream Zero-Copy y expediente activo en base de datos."],
        ["Flujo Principal", "1. El detector YuNet localiza rostros en el fotograma de video.\n2. El extractor ArcFace genera el vector de 512 dimensiones.\n3. Se calcula la distancia coseno contra expedientes activos.\n4. Si la similitud supera el 75%, se crea una pre-alerta y suena alarma sonora.\n5. El moderador compara la imagen de cámara contra la foto del expediente.\n6. El moderador confirma la alerta positiva."],
        ["Postcondición", "Se dispara evento WebSocket 'alerta_confirmada' con prioridad Código Rojo al panel PNC."],
        ["Excepciones", "Similitud menor al umbral: el fotograma se descarta sin almacenar datos personales."]
    ]
    add_table(doc, cu2_headers, cu2_data)

    # UC-03
    add_h2(doc, "CU-03: Despacho Táctico de Patrulla y Ruta de Llegada Rápida")
    cu3_headers = ["Atributo", "Descripción"]
    cu3_data = [
        ["Actor Principal", "Oficial de Mando PNC"],
        ["Precondición", "Recepción de alerta confirmada por moderador o selección en mapa."],
        ["Flujo Principal", "1. El panel de la PNC emite tono de alarma táctica y despliega banner emergente.\n2. El oficial presiona 'Ruta Rápida GPS'.\n3. El sistema calcula la distancia geodésica y el tiempo estimado de llegada con sirena.\n4. Se despliega la ruta sobre el mapa y se habilitan enlaces a Google Maps / Waze.\n5. La patrulla se desplaza al punto, localiza a la persona y verifica su estado.\n6. Se registra la bitácora de novedades y se emite el certificado SHA-256."],
        ["Postcondición", "Persona resguardada, caso actualizado a 'Localizado' y traslado seguro a vivienda."],
        ["Excepciones", "Sin señal de red en patrulla: la ruta se mantiene precargada en caché local del mapa."]
    ]
    add_table(doc, cu3_headers, cu3_data)

    output_path = os.path.join(OUTPUT_DIR, "02_Matriz_Trazabilidad_y_Casos_de_Uso.docx")
    doc.save(output_path)
    print(f"Generado: {output_path}")

if __name__ == "__main__":
    generate_srs()
    generate_use_cases()
