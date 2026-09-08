 # LocalizaSV - Prototipos Figma y Diagramas del Sistema

Este documento recopila el diseño de la interfaz de usuario de alta fidelidad (tipo exportación de Figma) y los diagramas estructurales/funcionales que definen la arquitectura y la interacción del sistema de LocalizaSV.

---

## 🎨 Galería de Prototipos (Figma UI Mockups)

Las siguientes interfaces han sido recreadas en alta resolución respetando la estética del modo oscuro, glassmorphism y la paleta de colores del proyecto original de LocalizaSV.

````carousel
![1. Dashboard - Panel Público de Búsqueda](C:/Users/ANDERSON ALFARO/.gemini/antigravity-ide/brain/c99c2690-1033-4c0b-b5e7-96ff5842af4e/dashboard_mockup_1786979334604.jpg)
<!-- slide -->
![2. Panel de Moderación - Resolución de Alertas de Cámara](C:/Users/ANDERSON ALFARO/.gemini/antigravity-ide/brain/c99c2690-1033-4c0b-b5e7-96ff5842af4e/moderator_panel_mockup_1786979355790.jpg)
<!-- slide -->
![3. Panel de Autoridades - Monitoreo en Tiempo Real y Feed de Cámaras](C:/Users/ANDERSON ALFARO/.gemini/antigravity-ide/brain/c99c2690-1033-4c0b-b5e7-96ff5842af4e/authority_panel_mockup_1786979376974.jpg)
<!-- slide -->
![4. Registro de Ciudadanos - Onboarding y Selfie de Validación](C:/Users/ANDERSON ALFARO/.gemini/antigravity-ide/brain/c99c2690-1033-4c0b-b5e7-96ff5842af4e/register_page_mockup_1786979397380.jpg)
````

> [!NOTE]
> Los archivos de imágenes fuente también se encuentran copiados localmente en el repositorio bajo la ruta: [`production_artifacts/mockups/`](file:///c:/Users/ANDERSON%20ALFARO/Desktop/Modulo/proyectos/profe_fredy/localiza_SV/LocalizaSV_Fase1/production_artifacts/mockups/)

---

## 📊 Diagrama de Casos de Uso

A continuación se detallan las interacciones de los distintos **Actores** (Ciudadano, Moderador, Autoridad y el propio Sistema Inteligente) con los **Casos de Uso** principales de la plataforma LocalizaSV.

```mermaid
graph TD
    %% Actors
    subgraph Actores
        Ciudadano[👤 Ciudadano]
        Moderador[👨‍✈️ Moderador]
        Autoridad[👮 Autoridad]
        Sistema[🤖 Sistema LocalizaSV]
    end

    %% Use Cases
    subgraph "Casos de Uso de LocalizaSV"
        UC_Reg[Registrarse]
        UC_Log[Iniciar Sesión]
        UC_Rep[Reportar Caso de Desaparición]
        UC_List[Ver Tablero Público de Casos]
        UC_Det[Ver Detalle de Caso]
        UC_RegTok[Registrar Dispositivo Push]
        UC_Mod[Resolver Alertas Pendientes]
        UC_Conf[Confirmar/Descartar Alerta de Cámara]
        UC_Map[Monitorear Mapa de Avistamientos]
        UC_Detect[Procesar Stream y Detectar Rostros]
        UC_Push[Enviar Notificaciones Push]
    end

    %% Relations
    Ciudadano --> UC_Reg
    Ciudadano --> UC_Log
    Ciudadano --> UC_Rep
    Ciudadano --> UC_List
    Ciudadano --> UC_Det
    Ciudadano --> UC_RegTok

    Moderador --> UC_Log
    Moderador --> UC_Mod
    Moderador --> UC_Conf

    Autoridad --> UC_Log
    Autoridad --> UC_Map

    Sistema --> UC_Detect
    Sistema --> UC_Push
    UC_Detect -.-> |"genera"| UC_Mod
    UC_Conf -.-> |"dispara"| UC_Push
```

---

## 🗄️ Diagrama Entidad-Relación (ERD)

Este diagrama representa la estructura de tablas de la base de datos PostgreSQL de LocalizaSV, sus tipos de datos, llaves primarias/foráneas y las relaciones de cardinalidad.

```mermaid
erDiagram
    usuarios ||--o{ casos : "crea"
    usuarios ||--o{ alertas : "valida (moderador)"
    usuarios ||--o{ tokens_fcm : "registra"
    casos ||--o{ alertas : "posee"
    estados_alerta ||--o{ alertas : "clasifica"

    usuarios {
        int id PK
        string nombre
        string dui
        string email
        string telefono
        string password_hash
        string selfie_url
        timestamp created_at
    }

    casos {
        int id PK
        int usuario_id FK
        string nombre_desaparecido
        int edad
        string genero
        date fecha_desaparicion
        string ubicacion_desaparicion
        text descripcion
        string telefono_contacto
        string estado
        string foto_url
        timestamp created_at
    }

    estados_alerta {
        int id PK
        string nombre
    }

    alertas {
        int id PK
        int caso_id FK
        decimal ubicacion_lat
        decimal ubicacion_lng
        decimal porcentaje_confianza
        string video_url
        string foto_evidencia_url
        string estado
        int id_estado_alerta FK
        int moderador_id FK
        timestamp fecha_validacion
        text comentarios
        timestamp fecha_deteccion
        timestamp created_at
    }

    tokens_fcm {
        int id PK
        int usuario_id FK
        string token
        timestamp created_at
    }
```
