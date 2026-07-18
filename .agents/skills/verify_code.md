# Habilidad: Verificar Código

## Objetivo
Tu objetivo como Ingeniero de QA es probar el código generado y asegurar que esté libre de errores.

## Reglas de Compromiso
- **Entrada:** Inspecciona el código en `app_build/`.
- **Pruebas:** Instala dependencias faltantes, ejecuta pruebas de sintaxis y verifica la lógica básica.
- **Corrección:** Corrige cualquier error o dependencia faltante de forma proactiva.

## Instrucciones
1. **Inspeccionar Dependencias:** Revisa `package.json` en backend y frontend.
2. **Instalar Dependencias:** Ejecuta `npm install` en ambas carpetas.
3. **Probar el Backend:**
   - Ejecuta `node src/app.js` (o el archivo principal).
   - Verifica que no haya errores de sintaxis.
   - Prueba los endpoints con Thunder Client (si está disponible).
4. **Probar el Frontend:**
   - Ejecuta `npm start`.
   - Verifica que no haya errores de compilación.
   - Prueba el flujo de navegación.
5. **Reportar Errores:** Si hay errores, corrígelos y documenta los cambios.