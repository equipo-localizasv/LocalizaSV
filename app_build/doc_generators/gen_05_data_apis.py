import os
import sys
sys.path.append(os.path.dirname(__file__))
from docx_helper import (
    create_document, add_h1, add_h2, add_h3, add_p, add_bullet, 
    add_callout, add_table
)

OUTPUT_DIR = r"C:\Users\ANDERSON ALFARO\Desktop\DOCUMENTACION_MAGISTRAL_LOCALIZASV\05_DICCIONARIO_DE_DATOS_Y_APIS"

def generate_data_dictionary():
    doc = create_document(
        title="DICCIONARIO DE DATOS DE LA BASE DE DATOS RELACIONAL",
        subtitle="Especificación de Tablas, Campos, Tipos, Claves e Índices • LocalizaSV",
        doc_code="DAT-LOCSV-DB-DICT",
        version="2.5.0"
    )

    add_h1(doc, "1. INTRODUCCIÓN AL MODELO DE DATOS")
    add_p(doc, "El esquema relacional de LocalizaSV gestiona las entidades operativas del sistema con integridad referencial, normalización en Tercera Forma Normal (3FN) y restricciones de seguridad.")

    # Tabla: usuarios
    add_h2(doc, "1. Tabla: 'usuarios'")
    add_p(doc, "Almacena las credenciales y perfiles de ciudadanos, moderadores C4I, agentes de autoridad PNC y administradores.")
    u_headers = ["Columna", "Tipo de Dato", "Restricción", "Descripción"]
    u_data = [
        ["id", "SERIAL / INT", "PK, NOT NULL", "Identificador único incremental del usuario."],
        ["nombre", "VARCHAR(150)", "NOT NULL", "Nombre completo y apellidos oficiales."],
        ["dui", "VARCHAR(10)", "UNIQUE, NOT NULL", "Documento Único de Identidad con formato 00000000-0."],
        ["email", "VARCHAR(120)", "UNIQUE, NOT NULL", "Correo electrónico para autenticación y notificaciones."],
        ["telefono", "VARCHAR(20)", "NULLABLE", "Teléfono de contacto (blindado contra extorsión)."],
        ["password_hash", "VARCHAR(255)", "NOT NULL", "Contraseña hasheada mediante algoritmo Bcrypt."],
        ["rol", "VARCHAR(20)", "NOT NULL", "Rol del usuario: 'ciudadano', 'moderador', 'autoridad', 'administrador'."],
        ["placa_pnc", "VARCHAR(30)", "NULLABLE", "Número de placa oficial u ONI del agente policial."],
        ["delegacion_pnc", "VARCHAR(120)", "NULLABLE", "Delegación o puesto policial asignado."],
        ["patrulla_pnc", "VARCHAR(50)", "NULLABLE", "Código de la unidad móvil o radiopatrulla asignada."],
        ["en_servicio", "BOOLEAN", "DEFAULT TRUE", "Estado de disponibilidad operativa del agente."],
        ["lat", "DECIMAL(10, 7)", "NULLABLE", "Última latitud GPS reportada por la patrulla en vivo."],
        ["lng", "DECIMAL(10, 7)", "NULLABLE", "Última longitud GPS reportada por la patrulla en vivo."],
        ["ultima_conexion", "TIMESTAMP", "DEFAULT NOW()", "Sello de tiempo de la última telemetría recibida."]
    ]
    add_table(doc, u_headers, u_data)

    # Tabla: casos
    add_h2(doc, "2. Tabla: 'casos'")
    add_p(doc, "Contiene los expedientes de personas desaparecidas reportadas por familiares o autoridades.")
    c_headers = ["Columna", "Tipo de Dato", "Restricción", "Descripción"]
    c_data = [
        ["id", "SERIAL / INT", "PK, NOT NULL", "Identificador único del expediente de búsqueda."],
        ["usuario_id", "INT", "FK -> usuarios(id)", "ID del usuario familiar o agente que registró el caso."],
        ["nombre_desaparecido", "VARCHAR(150)", "NOT NULL", "Nombre completo de la persona buscada."],
        ["edad", "INT", "NOT NULL", "Edad en años cumplidos al momento de la desaparición."],
        ["genero", "VARCHAR(20)", "NOT NULL", "Género biológico ('Masculino', 'Femenino', 'Otro')."],
        ["fecha_desaparicion", "DATE", "NOT NULL", "Fecha en que fue vista por última vez."],
        ["ubicacion_desaparicion", "TEXT", "NOT NULL", "Dirección y coordenadas del último avistamiento."],
        ["direccion_vivienda", "TEXT", "NULLABLE", "Dirección de residencia para traslado seguro y resguardo PNC."],
        ["parentesco_reportante", "VARCHAR(60)", "NULLABLE", "Parentesco con la víctima (protegido contra extorsión)."],
        ["descripcion", "TEXT", "NULLABLE", "Rasgos físicos, señas particulares y vestimenta."],
        ["foto_url", "VARCHAR(255)", "NOT NULL", "Ruta de la fotografía oficial del expediente para cotejo."],
        ["estado", "VARCHAR(30)", "DEFAULT 'Desaparecido'", "Estado: 'Desaparecido', 'En Proceso de Rescate', 'Encontrado'."],
        ["created_at", "TIMESTAMP", "DEFAULT NOW()", "Fecha y hora de creación del expediente."]
    ]
    add_table(doc, c_headers, c_data)

    # Tabla: alertas
    add_h2(doc, "3. Tabla: 'alertas'")
    add_p(doc, "Registra las pre-alertas de sensores de visión artificial y detecciones confirmadas.")
    a_headers = ["Columna", "Tipo de Dato", "Restricción", "Descripción"]
    a_data = [
        ["id", "SERIAL / INT", "PK, NOT NULL", "Identificador único de la alerta forense."],
        ["caso_id", "INT", "FK -> casos(id)", "Caso de persona desaparecida vinculado a la detección."],
        ["nombre_desaparecido", "VARCHAR(150)", "NOT NULL", "Nombre de la persona identificada."],
        ["foto_evidencia_url", "VARCHAR(255)", "NOT NULL", "Fotografía capturada por la cámara en el momento del avistamiento."],
        ["similitud", "DECIMAL(5, 4)", "NOT NULL", "Nivel de similitud biométrica IA (ej. 0.8800 = 88%)."],
        ["ubicacion_texto", "VARCHAR(150)", "NOT NULL", "Nombre de la cámara o punto de detección C4I."],
        ["ubicacion_lat", "DECIMAL(10, 7)", "NOT NULL", "Latitud geográfica exacta de la cámara."],
        ["ubicacion_lng", "DECIMAL(10, 7)", "NOT NULL", "Longitud geográfica exacta de la cámara."],
        ["id_estado_alerta", "INT", "DEFAULT 1", "1: pendiente, 2: confirmado, 3: falso positivo."],
        ["estado", "VARCHAR(30)", "DEFAULT 'pendiente'", "Nombre textual del estado de atención."],
        ["moderador_id", "INT", "FK -> usuarios(id)", "ID del moderador C4I que validó la alerta."],
        ["comentarios", "TEXT", "NULLABLE", "Bitácora policial y notas de intervención del agente."],
        ["fecha_deteccion", "TIMESTAMP", "DEFAULT NOW()", "Fecha y hora exacta de captura del fotograma."]
    ]
    add_table(doc, a_headers, a_data)

    output_path = os.path.join(OUTPUT_DIR, "01_Diccionario_Base_Datos_Relacional.docx")
    doc.save(output_path)
    print(f"Generado: {output_path}")

def generate_apis_doc():
    doc = create_document(
        title="ESPECIFICACIÓN TÉCNICA DE APIS REST Y WEBSOCKETS",
        subtitle="Contratos de Integración, Payloads, Códigos HTTP y Eventos C4I",
        doc_code="API-LOCSV-REST-WS",
        version="2.5.0"
    )

    add_h1(doc, "1. ESTÁNDARES Y CONVENCIONES DE LA API")
    add_bullet(doc, "Formato JSON (application/json) con codificación UTF-8.", "Formato:")
    add_bullet(doc, "Cabecera 'Authorization: Bearer <JWT_TOKEN>' en todos los endpoints protegidos.", "Autenticación:")
    add_bullet(doc, "200 (OK), 201 (Created), 400 (Bad Request), 401 (Unauthorized), 403 (Forbidden), 404 (Not Found), 500 (Internal Server Error).", "Códigos HTTP:")

    add_h1(doc, "2. CATÁLOGO DE ENDPOINTS REST PRINCIPALES")

    api_headers = ["Método", "Ruta / Endpoint", "Roles Autorizados", "Descripción"]
    api_data = [
        ["POST", "/api/auth/login", "Público", "Autenticación con email/password, retorna token JWT."],
        ["POST", "/api/auth/register", "Público", "Registro de nuevo ciudadano con DUI y selfie."],
        ["GET", "/api/cases", "Público / Todos", "Listado de expedientes con búsqueda y filtros departamentales."],
        ["POST", "/api/cases", "Ciudadano, Admin", "Creación de nuevo expediente de persona desaparecida."],
        ["PUT", "/api/cases/:id/estado", "Autoridad, Admin", "Actualización de estado policial ('Localizado', etc.)."],
        ["GET", "/api/alertas/activas", "Autoridad, Mod, Admin", "Listado de alertas activas y georreferenciadas para el mapa."],
        ["GET", "/api/alertas/pendientes", "Moderador, Admin", "Cola de pre-alertas pendientes de confirmación humana."],
        ["PUT", "/api/alertas/:id", "Autoridad, Mod, Admin", "Actualización de estado de alerta y registro de bitácora policial."],
        ["GET", "/api/patrullas/activas", "Autoridad, Admin", "Listado en tiempo real de patrullas policiales con GPS."],
        ["PUT", "/api/patrullas/ubicacion", "Autoridad", "Transmisión de telemetría GPS periódica de unidad policial."],
        ["POST", "/api/patrullas/asignar", "Autoridad, Admin", "Asignación de unidad móvil a un caso de rescate prioritario."],
        ["POST", "/api/notifications/test-broadcast", "Autoridad, Admin", "Emisión de Alerta Nacional Código Ámbar vía Push y Sockets."]
    ]
    add_table(doc, api_headers, api_data)

    add_h1(doc, "3. PROTOCOLO DE EVENTOS EN TIEMPO REAL (WEBSOCKETS)")
    add_p(doc, "El servidor WebSocket transmite eventos operacionales a los clientes conectados:")
    ws_headers = ["Evento Socket", "Emisor", "Receptores", "Payload y Propósito"]
    ws_data = [
        ["alerta_confirmada", "Moderador C4I", "Paneles PNC (Autoridad)", "Disparo de Código Rojo con coordenadas, foto y caso_id."],
        ["patrulla_ubicacion", "Patrulla Móvil", "Consolas C4I y PNC", "Actualización de lat, lng y timestamp para mapa de calor."],
        ["codigo_ambar_flash", "Mando PNC", "Todos los Clientes", "Notificación push masiva de búsqueda prioritaria en cuadrante."],
        ["radio_mensaje", "Unidad / Base", "Canal Táctico C4I", "Mensaje de texto y enlace radial encriptado entre patrullas."]
    ]
    add_table(doc, ws_headers, ws_data)

    output_path = os.path.join(OUTPUT_DIR, "02_Especificacion_Tecnica_APIs_REST_y_WebSockets.docx")
    doc.save(output_path)
    print(f"Generado: {output_path}")

if __name__ == "__main__":
    generate_data_dictionary()
    generate_apis_doc()
