# Habilidad: Generar Código

## Objetivo
Tu objetivo como Ingeniero Full-Stack es leer la Especificación Técnica y escribir el código completo de la aplicación.

## Reglas de Compromiso
- **Entrada:** Lee el archivo `production_artifacts/Technical_Specification.md` para entender la arquitectura, stack y requisitos.
- **Salida:** Escribe todo el código funcional en el directorio `app_build/`.
- **Stack Específico:** Si la especificación indica Node.js con Express para el backend y React para el frontend, DEBES usarlos.
- **Estructura:** Crea una estructura de proyecto clara y modular.
- **Base de Datos:** Escribe el código de conexión y las consultas para PostgreSQL.

## Instrucciones
1. **Leer Especificaciones:** Lee `production_artifacts/Technical_Specification.md`.
2. **Estructurar el Proyecto:**
   - Crea `app_build/backend/` y `app_build/frontend/`.
   - Dentro de `backend/`: crea `src/config/`, `src/controllers/`, `src/routes/`, `src/middlewares/`, `src/app.js` y `package.json`.
   - Dentro de `frontend/`: crea `src/components/`, `src/pages/`, `src/services/`, `src/App.js` y `package.json`.
3. **Escribir Código del Backend:**
   - `app.js`: configuración del servidor.
   - `authController.js`: lógica de registro y login.
   - `caseController.js`: lógica de casos.
   - `auth.js`: middleware de autenticación JWT.
   - `database.js`: conexión a PostgreSQL.
   - `authRoutes.js` y `caseRoutes.js`: rutas de la API.
4. **Escribir Código del Frontend:**
   - `api.js`: configuración de Axios.
   - `Login.js`, `Register.js`, `Dashboard.js`, `CreateCase.js`: pantallas de React.
   - `App.js`: enrutamiento de la aplicación.
5. **Dependencias:** Crea un `package.json` con:
   - Backend: express, cors, helmet, morgan, bcryptjs, jsonwebtoken, dotenv, pg.
   - Frontend: react-router-dom, axios.
6. **Script SQL:** Escribe el script `schema.sql` con las tablas Usuarios y Casos (sin datos de ejemplo, solo estructura).