import os
import sys
sys.path.append(os.path.dirname(__file__))
from docx_helper import (
    create_document, add_h1, add_h2, add_h3, add_p, add_bullet, 
    add_callout, add_table
)

OUTPUT_DIR = r"C:\Users\ANDERSON ALFARO\Desktop\DOCUMENTACION_MAGISTRAL_LOCALIZASV\04_SEGURIDAD_BIOMETRIA_Y_CRIPTOGRAFIA"

def generate_biometrics_doc():
    doc = create_document(
        title="PROTOCOLO DE BIOMETRÍA FACIAL Y VISIÓN COMPUTACIONAL",
        subtitle="Especificación de Modelos YuNet & ArcFace • Tubería Zero-Copy Stream",
        doc_code="BIO-LOCSV-ARCFACE-2026",
        version="2.5.0"
    )

    add_h1(doc, "1. INTRODUCCIÓN A LA ARQUITECTURA BIOMÉTRICA FORENSE")
    add_p(doc, "La plataforma LocalizaSV implementa una canalización de visión computacional en dos fases acopladas: detección ultrarrápida de rostros (YuNet) y reconocimiento facial por aprendizaje profundo (ArcFace). Esta combinación garantiza tiempos de respuesta inferiores a 45 milisegundos por fotograma en transmisiones CCTV de alta definición (1080p a 30 FPS).")

    add_h1(doc, "2. MODELO DE DETECCIÓN FACIAL: YUNET")
    add_bullet(doc, "Red convolucional ligera basada en puntos clave, optimizada para ejecución perimetral (Edge Computing).", "Arquitectura:")
    add_bullet(doc, "Localiza rostros en escala multiresolución y extrae 5 puntos de referencia canónicos (ambos ojos, punta de la nariz y comisuras labiales).", "Extracción de Puntos:")
    add_bullet(doc, "Permite normalizar y alinear afínmente el rostro, compensando inclinaciones de cabeza de hasta 45 grados en las cámaras de calle.", "Alineación Geométrica:")

    add_h1(doc, "3. MODELO DE RECONOCIMIENTO PROFUNDO: ARCFACE")
    add_bullet(doc, "Función de pérdida de margen angular aditivo (Additive Angular Margin Loss), que maximiza la separabilidad inter-clase en una esfera de hiperdimensión.", "Fundamento Matemático:")
    add_bullet(doc, "Vector embedding normalizado de L2 en 512 dimensiones flotantes de 32 bits.", "Representación Vectorial:")
    add_bullet(doc, "La afinidad entre dos rostros A y B se calcula mediante la similitud coseno: S = (A · B) / (||A|| * ||B||).", "Métrica de Similitud:")

    add_h2(doc, "3.1 Calibración de Umbrales de Confianza y Falsos Positivos")
    umbral_headers = ["Rango de Similitud", "Clasificación", "Acción del Sistema C4I", "Tasa de Falsos Positivos (FPR)"]
    umbral_data = [
        ["0.00 - 0.69", "No Coincidente", "Descarte automático inmediato en memoria RAM.", "< 0.0001%"],
        ["0.70 - 0.74", "Indicio Leve", "Almacenamiento en log temporal para análisis de trayectoria.", "< 0.01%"],
        ["0.75 - 0.84", "Pre-Alerta Positiva", "Alarma sonora en consola y pase a bandeja de moderación humana.", "< 0.001%"],
        ["0.85 - 1.00", "Alta Coincidencia", "Alerta prioritaria Código Rojo con pre-cálculo de ruta policial.", "< 0.00001%"]
    ]
    add_table(doc, umbral_headers, umbral_data)

    add_callout(
        doc,
        "El sistema NUNCA toma decisiones de detención o privación de libertad de forma autónoma. Todo resultado biométrico constituye un elemento indiciario que requiere confirmación humana del moderador y verificación física presencial por agentes de la PNC.",
        title="PRINCIPIO ÉTICO DE INTERVENCIÓN HUMANA (HUMAN-IN-THE-LOOP)",
        alert_type="warning"
    )

    output_path = os.path.join(OUTPUT_DIR, "01_Protocolo_Biometria_IA_y_Vision_Computacional.docx")
    doc.save(output_path)
    print(f"Generado: {output_path}")

def generate_crypto_security_doc():
    doc = create_document(
        title="SEGURIDAD CRIPTOGRÁFICA Y CADENA DE CUSTODIA FORENSE",
        subtitle="Sellado Inmutable SHA-256 • Protección de Datos contra Extorsión",
        doc_code="SEC-LOCSV-CRYPTO-SHA256",
        version="2.5.0"
    )

    add_h1(doc, "1. ARQUITECTURA DE SEGURIDAD DEFENSIVA")
    add_p(doc, "La plataforma LocalizaSV implementa los más rigurosos estándares de seguridad de la información, alineados con ISO/IEC 27001 y las normativas de protección de datos personales:")

    add_h2(doc, "1.1 Protección de Datos del Reportante (Blindaje Anti-Extorsión)")
    add_p(doc, "Históricamente en El Salvador, las familias de personas desaparecidas han sido víctimas de llamadas extorsivas por parte de estructuras criminales que exigen dinero a cambio de supuesta información falsa. LocalizaSV elimina esta vulnerabilidad:")
    add_bullet(doc, "El teléfono y correo del familiar NUNCA se exponen en las fichas públicas ni en las APIs accesibles por ciudadanos.", "Principio de Ocultamiento:")
    add_bullet(doc, "Los datos se cifran con AES-256 en base de datos y solo se desencriptan en el panel autenticado de la PNC cuando se confirma un avistamiento positivo.", "Acceso Reivindicado:")

    add_h2(doc, "1.2 Cadena de Custodia Digital con Sellado SHA-256")
    add_p(doc, "Toda evidencia fotográfica y acta de intervención policial es procesada criptográficamente mediante el algoritmo de hash seguro SHA-256 (FIPS PUB 180-4):")
    add_bullet(doc, "Al recibir una pre-alerta de cámara o generar un acta de localización, el sistema calcula el digest SHA-256 del archivo binario y metadatos asociados.", "1. Cálculo de Huella Digital:")
    add_bullet(doc, "El hash resultante (64 caracteres hexadecimales) se almacena en el registro inmutable junto al sello de tiempo UTC y las credenciales del oficial interviniente.", "2. Sellado Temporal:")
    add_bullet(doc, "El acta puede ser impresa o exportada como Certificado Oficial de Custodia Digital, el cual cuenta con un código QR que permite a jueces y fiscales verificar que el archivo no fue manipulado ni alterado.", "3. Verificación Forense:")

    output_path = os.path.join(OUTPUT_DIR, "02_Seguridad_Criptografica_Cadena_Custodia_SHA256.docx")
    doc.save(output_path)
    print(f"Generado: {output_path}")

if __name__ == "__main__":
    generate_biometrics_doc()
    generate_crypto_security_doc()
