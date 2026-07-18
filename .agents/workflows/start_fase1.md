---
description: # Workflow: start_fase1  ## Descripción Este comando inicia el pipeline autónomo para construir la Fase 1 de LocalizaSV.  
---



## Secuencia de Acciones
1. Product Manager (@pm): Utiliza la habilidad write_specs para crear la especificación técnica basada en el prompt del usuario.
2. Aprobación: Espera la confirmación del usuario en el archivo production_artifacts/Technical_Specification.md.
3. Ingeniero Full-Stack (@engineer): Utiliza la habilidad generate_code para construir el backend y frontend en app_build/.
4. Ingeniero de QA (@qa): Utiliza la habilidad verify_code para probar y corregir el código.
5. Maestro DevOps (@devops): Ejecuta el código en un servidor local y proporciona la URL para su revisión.