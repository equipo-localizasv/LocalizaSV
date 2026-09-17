# Módulo de Cámaras IP y Captura de Detecciones - LocalizaSV

Este módulo permite conectar cámaras IP (cámaras de seguridad Wi-Fi, teléfonos móviles configurados como cámara IP o streams RTSP/HTTP) al sistema central de **LocalizaSV** para transmitir detecciones automáticas en tiempo real hacia los paneles de Moderadores y Autoridades.

---

## 1. Conexión de una Cámara IP (Teléfono Móvil o Cámara Wi-Fi)

### Opción A: Usar un teléfono Android como Cámara IP (Recomendado para pruebas)
1. Instala la app gratuita **IP Webcam** (desarrollada por Pavel Khlebovich) desde Google Play Store.
2. Conecta tu teléfono y tu computadora a la **misma red Wi-Fi**.
3. Abre la app, desplázate hasta el final y toca en **"Iniciar servidor"** (*Start server*).
4. La app te mostrará una dirección IP y puerto en pantalla, por ejemplo:
   ```text
   http://192.168.1.50:8080
   ```
5. La URL directa para obtener capturas continuas (snapshots) es:
   ```text
   http://192.168.1.50:8080/shot.jpg
   ```

### Opción B: Probar la transmisión con VLC Media Player
1. Abre **VLC Media Player**.
2. Ve al menú **Medio ➔ Abrir emisión de red...** (o pulsa `Ctrl + N`).
3. Pega la URL del stream (ejemplo: `http://192.168.1.50:8080/video` o `rtsp://...`).
4. Haz clic en **Reproducir** para comprobar que el video en vivo se ve fluido.

---

## 2. Ejecución del Script de Captura (`capturar.js`)

El script `capturar.js` toma una imagen de la cámara cada **5 segundos**, analiza si hay **movimiento perceptual** y, de ser así, envía la evidencia con geolocalización al endpoint `POST /api/detecciones` mediante `multipart/form-data`.

### Ejecutar con una Cámara Real:
Abre una terminal en la raíz del proyecto y define las variables de entorno:

**En Windows (PowerShell):**
```powershell
$env:CAMERA_URL="http://192.168.1.50:8080/shot.jpg"
$env:CASO_ID="1"
$env:CAMERA_LAT="13.69294"
$env:CAMERA_LNG="-89.21819"
node camaras/capturar.js
```

**En Linux / Mac / Bash:**
```bash
CAMERA_URL="http://192.168.1.50:8080/shot.jpg" CASO_ID=1 node camaras/capturar.js
```

---

## 3. Modo Simulación (Sin necesidad de cámara física)

Si estás desarrollando en local y no tienes una cámara Wi-Fi disponible en este momento, el script detecta automáticamente el valor `MOCK` y genera frames sintéticos con variaciones periódicas:

```powershell
node camaras/capturar.js
```

Salida esperada en terminal:
```text
====================================================
🎥 LOCALIZASV - AGENTE DE CAPTURA DE CÁMARAS IP
====================================================
Endpoint destino : http://localhost:3001/api/detecciones
Caso asignado    : Caso #1
Ubicación GPS    : [13.69294, -89.21819]
Frecuencia       : Cada 5s
Fuente cámara    : MOCK
====================================================

📸 [Frame #1] Variación de movimiento: 100.00% (Umbral: 12%)
🚨 ¡Movimiento detectado! Superó el umbral. Transmitiendo alerta...
✅ [Detección Enviada] Alerta creada ID #5 | Confianza: 88.5% | Caso #1
```

---

## 4. Algoritmo de Detección de Movimiento

- **Umbral (`MOTION_THRESHOLD`)**: Establecido en `12.0%`.
- **Mecanismo**: Compara las muestras de bytes entre el frame actual y el anterior. Si el porcentaje de variación supera el 12%, se determina que hubo movimiento de personas o vehículos en el encuadre y se activa el despacho inmediato de la alerta hacia el servidor WebSocket.
