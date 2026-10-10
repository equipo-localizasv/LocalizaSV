import os
import sys
sys.path.append(os.path.dirname(__file__))
from docx_helper import (
    create_document, add_h1, add_h2, add_h3, add_p, add_bullet, 
    add_callout, add_table, add_image_if_exists
)

OUTPUT_DIR = r"C:\Users\ANDERSON ALFARO\Desktop\DOCUMENTACION_MAGISTRAL_LOCALIZASV\03_MANUALES_OPERATIVOS_Y_USUARIO"
IMG_DASH = r"C:\Users\ANDERSON ALFARO\.gemini\antigravity-ide\brain\c99c2690-1033-4c0b-b5e7-96ff5842af4e\dashboard_mockup_1786979334604.jpg"
IMG_PNC = r"C:\Users\ANDERSON ALFARO\.gemini\antigravity-ide\brain\c99c2690-1033-4c0b-b5e7-96ff5842af4e\figma_authority_panel_1790611617452.jpg"
IMG_MOD = r"C:\Users\ANDERSON ALFARO\.gemini\antigravity-ide\brain\c99c2690-1033-4c0b-b5e7-96ff5842af4e\figma_moderator_surveillance_1790611584184.jpg"

def generate_citizen_manual():
    doc = create_document(
        title="MANUAL DE USUARIO: PORTAL CIUDADANO",
        subtitle="Guía Paso a Paso para el Reporte y Seguimiento de Personas Desaparecidas",
        doc_code="MAN-LOCSV-CIUDADANO",
        version="2.5.0"
    )

    add_h1(doc, "1. BIENVENIDA Y ACCESO AL PORTAL")
    add_p(doc, "El Portal Ciudadano de LocalizaSV es un servicio público y gratuito diseñado para que las familias salvadoreñas puedan reportar de inmediato la desaparición de un ser querido, sin esperar plazos burocráticos de 24 o 48 horas.")
    add_image_if_exists(doc, IMG_DASH, caption="Figura 1: Vista Principal del Portal Ciudadano de LocalizaSV", width_inches=6.0)

    add_h2(doc, "1.1 Registro e Inicio de Sesión")
    add_bullet(doc, "Ingrese a la plataforma y seleccione 'Crear Cuenta'.", "Paso 1:")
    add_bullet(doc, "Proporcione su nombre completo, Documento Único de Identidad (DUI), correo electrónico y contraseña.", "Paso 2:")
    add_bullet(doc, "El sistema valida la autenticidad del formato del DUI para evitar registros fraudulentos.", "Paso 3:")

    add_h1(doc, "2. CÓMO REPORTAR UNA DESAPARICIÓN")
    add_bullet(doc, "Presione el botón 'Reportar Desaparición' en la barra superior o en el panel de inicio.", "Paso 1:")
    add_bullet(doc, "Llene los datos de la persona: Nombre completo, edad, género, descripción física y vestimenta.", "Paso 2:")
    add_bullet(doc, "Indique el último lugar y fecha/hora donde fue vista la persona (se puede seleccionar en el mapa).", "Paso 3:")
    add_bullet(doc, "Indique la dirección de vivienda habitual: Este dato es fundamental para que la PNC pueda trasladar a la persona de forma segura al ser localizada.", "Paso 4:")
    add_bullet(doc, "Suba una fotografía frontal, reciente y nítida. Esto permite al algoritmo de Inteligencia Artificial indexar su biometría facial.", "Paso 5:")

    add_callout(
        doc,
        "Sus datos de contacto telefónico y correo NUNCA se mostrarán de forma pública. Quedan blindados bajo la protección anti-extorsión y solo son accesibles por las autoridades de la PNC en caso de confirmación de avistamiento.",
        title="PROTECCIÓN TOTAL CONTRA EXTORSIONES",
        alert_type="security"
    )

    add_h1(doc, "3. HERRAMIENTAS ADICIONALES PARA EL CIUDADANO")
    add_h2(doc, "3.1 Generación de Afiche Oficial en PDF")
    add_p(doc, "Desde la ficha de cualquier caso activo, el familiar o ciudadano puede hacer clic en 'Imprimir Afiche Oficial'. El sistema generará una hoja en PDF de alta resolución con la fotografía, características distintivas, teléfonos de emergencia de la PNC (911) y un código QR que enlaza directamente a la ficha digital actualizada.")

    add_h2(doc, "3.2 Búsqueda Inversa por Fotografía")
    add_p(doc, "Si usted ve a una persona desorientada en la calle o en un centro asistencial y sospecha que puede estar reportada como desaparecida, puede tomarle una fotografía y subirla en 'Búsqueda Inversa'. El sistema cotejará biométricamente la imagen contra la base de datos nacional en menos de 3 segundos.")

    output_path = os.path.join(OUTPUT_DIR, "01_Manual_Usuario_Portal_Ciudadano.docx")
    doc.save(output_path)
    print(f"Generado: {output_path}")

def generate_moderator_manual():
    doc = create_document(
        title="MANUAL OPERATIVO: MODERADOR CCTV & IA",
        subtitle="Protocolo de Monitoreo de Videovigilancia y Validación Biométrica C4I",
        doc_code="MAN-LOCSV-MODERADOR",
        version="2.5.0"
    )

    add_h1(doc, "1. ROL Y RESPONSABILIDADES DEL MODERADOR C4I")
    add_p(doc, "El Moderador es el eslabón humano indispensable en el ciclo de detección. Su función principal es auditar las detecciones generadas automáticamente por los modelos de Inteligencia Artificial YuNet y ArcFace sobre las cámaras de videovigilancia ciudadanas y comunitarias.")
    add_image_if_exists(doc, IMG_MOD, caption="Figura 1: Consola de Videovigilancia y Validación Forense del Moderador", width_inches=6.0)

    add_h1(doc, "2. PROTOCOLO DE VALIDACIÓN DE PRE-ALERTAS")
    add_h2(doc, "2.1 Recepción de Pre-Alerta")
    add_bullet(doc, "Cuando una cámara detecta un rostro con similitud mayor o igual al 75%, el panel emite una notificación visual y sonora de prioridad media.", "Evento:")
    add_bullet(doc, "La pre-alerta se posiciona en la bandeja 'Alertas Pendientes de Validación'.", "Ubicación:")

    add_h2(doc, "2.2 Cotejo Forense en Pantalla")
    add_p(doc, "El operador debe realizar un análisis comparativo visual observando:")
    add_bullet(doc, "Forma de la nariz, mandíbula, pómulos y separación ocular.", "Facciones Faciales:")
    add_bullet(doc, "Existencia de tatuajes, lunares, cicatrices o marcas particulares.", "Señas Particulares:")
    add_bullet(doc, "Coincidencia de vestimenta o accesorios descritos en el expediente.", "Contexto:")

    add_h2(doc, "2.3 Decisión Operativa")
    add_bullet(doc, "Al presionar 'Confirmar Objetivo', el sistema eleva inmediatamente el estado a Código Rojo y despacha la alerta en tiempo real a todas las patrullas policiales activas en el cuadrante.", "Confirmación Positiva (Botón Verde):")
    add_bullet(doc, "Si se trata de un parecido casual o un error de perspectiva, se presiona 'Descartar Falso Positivo', registrando el motivo para retroalimentar el umbral del modelo.", "Falso Positivo (Botón Rojo):")

    add_callout(
        doc,
        "Toda confirmación realizada por un moderador queda registrada con sello de tiempo, ID del operador y hash de la evidencia para efectos de responsabilidad legal y cadena de custodia.",
        title="AUDITORÍA Y RESPONSABILIDAD FORENSE",
        alert_type="warning"
    )

    output_path = os.path.join(OUTPUT_DIR, "02_Manual_Operativo_Moderador_CCTV_IA.docx")
    doc.save(output_path)
    print(f"Generado: {output_path}")

def generate_pnc_manual():
    doc = create_document(
        title="MANUAL TÁCTICO: OFICIAL DE MANDO PNC",
        subtitle="Procedimientos de Despacho de Emergencia, Ruteo GPS y Monitoreo de Patrullas",
        doc_code="MAN-LOCSV-PNC-TACTICO",
        version="2.5.0"
    )

    add_h1(doc, "1. CENTRO DE MANDO Y DESPACHO POLICIAL PNC")
    add_p(doc, "El Centro de Mando Policial PNC de LocalizaSV es la herramienta táctica de respuesta inmediata. Diseñado bajo la técnica CUA (Claro, Único y Atractivo), permite supervisar el territorio nacional, coordinar patrullas y ejecutar rescates en minutos.")
    add_image_if_exists(doc, IMG_PNC, caption="Figura 1: Centro de Mando Táctico PNC con Mapa de Calor y Ruteo de Emergencia", width_inches=6.0)

    add_h1(doc, "2. PESTAÑAS OPERATIVAS DEL CENTRO DE MANDO")
    add_h2(doc, "2.1 Despliegue Táctico & GIS (Pestaña 1)")
    add_p(doc, "Muestra el mapa táctico general de El Salvador con georreferenciación de todas las alertas activas, anillos de isócronas de desplazamiento predictivo (15, 30 y 60 minutos) y cálculo de ruteo de llegada.")

    add_h2(doc, "2.2 Expedientes Policiales & Casos (Pestaña 2)")
    add_p(doc, "Permite consultar y gestionar el estado policial de cada persona desaparecida: 'Desaparecido', 'En Proceso de Rescate' o 'Localizado'. Cuenta con filtros avanzados por departamento y barra de búsqueda rápida.")

    add_h2(doc, "2.3 Alertas y Atenciones Policiales CUA (Pestaña 3)")
    add_p(doc, "Ofrece la ficha enriquecida de cada avistamiento detectado:")
    add_bullet(doc, "Foto de cámara C4I comparada lado a lado con la foto del expediente original.", "Comparativa Biométrica:")
    add_bullet(doc, "Porcentaje de similitud facial con barra visual de confianza.", "Porcentaje IA:")
    add_bullet(doc, "Dirección de vivienda habitual para retorno seguro y resguardo policial de la víctima.", "Traslado Seguro:")
    add_bullet(doc, "Parentesco del reportante con datos protegidos contra extorsión.", "Reportante:")
    add_bullet(doc, "Abre modal interactivo para registrar notas de la patrulla y actualizar el estado operativo.", "Atención PNC:")

    add_h2(doc, "2.4 Personal Activo & Mapa en Tiempo Real (Pestaña 4)")
    add_p(doc, "Monitorea la ubicación geográfica en tiempo real de todas las patrullas policiales en servicio:")
    add_bullet(doc, "Gradiente táctico cian-azul que representa la densidad y presencia policial en el territorio nacional.", "Capa de Calor de Cobertura PNC:")
    add_bullet(doc, "Marcadores con pulso radar que muestran nombre del agente, ONI/placa, delegación y móvil asignado.", "Patrullas en Vivo:")
    add_bullet(doc, "Permite filtrar por delegación policial y centrar la vista en cualquier agente de inmediato.", "Directorio Lateral:")

    add_h2(doc, "2.5 Centro Código Ámbar Flash (Pestaña 5)")
    add_p(doc, "Sala de transmisión para emitir alertas masivas geocercadas (5 km, 15 km o nacional) a través de notificaciones push a la ciudadanía.")

    output_path = os.path.join(OUTPUT_DIR, "03_Manual_Tactico_Oficial_Mando_PNC.docx")
    doc.save(output_path)
    print(f"Generado: {output_path}")

def generate_admin_manual():
    doc = create_document(
        title="MANUAL DE ADMINISTRACIÓN Y DESPLIEGUE TÉCNICO",
        subtitle="Configuración de Servidores, Base de Datos, Redes y Mantenimiento",
        doc_code="MAN-LOCSV-ADMIN-DEV",
        version="2.5.0"
    )

    add_h1(doc, "1. REQUISITOS DEL SISTEMA Y ENTORNO")
    add_bullet(doc, "Node.js v18 LTS o superior (recomendado v20.x).", "Backend Runtime:")
    add_bullet(doc, "PostgreSQL 14+ con extensiones PostGIS (o motor de persistencia JSON de alta concurrencia).", "Base de Datos:")
    add_bullet(doc, "NPM 9+ con soporte para Vite v5.", "Frontend Bundler:")
    add_bullet(doc, "Python 3.10+ con bibliotecas OpenCV, NumPy, ONNXRuntime y docx.", "Motor IA:")

    add_h1(doc, "2. PUESTA EN MARCHA DE SERVICIOS")
    add_p(doc, "Comandos para inicialización de servicios en servidores de producción:")
    add_bullet(doc, "npm run build (genera artefactos minificados en carpeta dist/).", "Frontend:")
    add_bullet(doc, "node src/app.js (puerto predeterminado 3001, soporta variables de entorno PORT y DB_URL).", "Backend API:")
    add_bullet(doc, "node camera_stream_sim.js (gestiona tubería Zero-Copy para cámaras perimetrales).", "Stream Pipe:")

    add_h1(doc, "3. COPIAS DE SEGURIDAD Y MANTENIMIENTO")
    add_p(doc, "Se debe programar una tarea cron diaria para el respaldo de la base de datos y la carpeta de uploads de fotografías:")
    add_bullet(doc, "pg_dump -U postgres -d localizasv_db | gzip > backup_$(date +%Y%m%d).sql.gz", "Respaldo DB:")
    add_bullet(doc, "tar -czf uploads_backup_$(date +%Y%m%d).tar.gz uploads/", "Respaldo Evidencias:")

    output_path = os.path.join(OUTPUT_DIR, "04_Manual_Administrador_y_Despliegue.docx")
    doc.save(output_path)
    print(f"Generado: {output_path}")

if __name__ == "__main__":
    generate_citizen_manual()
    generate_moderator_manual()
    generate_pnc_manual()
    generate_admin_manual()
