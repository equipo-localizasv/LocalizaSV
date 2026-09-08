/**
 * LocalizaSV - Servicio WebSocket nativo (API del navegador)
 * Requisitos 21, 22, 23, 24
 */

class SocketService {
  constructor() {
    this.ws = null;
    this.listeners = new Map(); // Mapa de evento -> Set(callbacks)
    this.token = null;
    this.reconnectTimer = null;
    this.url = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_WS_URL) || 'ws://localhost:3001/ws';
  }

  /**
   * Conecta al servidor WebSocket pasando el token de autenticación si existe.
   * @param {string} token Token JWT del usuario
   */
  connect(token = null) {
    if (token) {
      this.token = token;
    }

    // Evitar múltiples conexiones activas
    if (this.ws && (this.ws.readyState === WebSocket.CONNECTING || this.ws.readyState === WebSocket.OPEN)) {
      console.log('🔌 [WebSocket] La conexión ya está activa o en proceso.');
      return;
    }

    const connectUrl = this.token
      ? `${this.url}?token=${encodeURIComponent(this.token)}`
      : this.url;

    console.log(`🔌 [WebSocket] Conectando a ${this.url}...`);

    try {
      this.ws = new WebSocket(connectUrl);

      this.ws.onopen = () => {
        console.log('✅ [WebSocket] Conexión establecida con éxito.');
        if (this.reconnectTimer) {
          clearTimeout(this.reconnectTimer);
          this.reconnectTimer = null;
        }

        // Si se requiere autenticación post-conexión
        if (this.token) {
          this.send({ type: 'auth', token: this.token });
        }
      };

      this.ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          // Soporte para esquemas: { event: 'name', data: {} } o { type: 'name', payload: {} }
          const eventName = payload.event || payload.type || payload.action;
          const eventData = payload.data || payload.payload || payload.alerta || payload;

          if (eventName) {
            this._notifyListeners(eventName, eventData);
          }
          // También notificar a los oyentes globales de cualquier mensaje
          this._notifyListeners('*', payload);
        } catch (err) {
          console.warn('⚠️ [WebSocket] Error parseando mensaje recibido:', err, event.data);
        }
      };

      this.ws.onerror = (error) => {
        console.error('❌ [WebSocket] Error en la conexión:', error);
      };

      this.ws.onclose = (event) => {
        console.log(`🛑 [WebSocket] Conexión cerrada. Código: ${event.code}`);
        this.ws = null;

        // Reconexión automática si el usuario sigue autenticado y no fue un cierre intencional
        if (this.token && !event.wasClean) {
          console.log('🔄 [WebSocket] Reintentando conexión en 3 segundos...');
          this.reconnectTimer = setTimeout(() => {
            this.connect();
          }, 3000);
        }
      };
    } catch (err) {
      console.error('❌ [WebSocket] No se pudo inicializar WebSocket:', err);
    }
  }

  /**
   * Desconecta limpia y completamente la conexión WebSocket.
   */
  disconnect() {
    console.log('🔌 [WebSocket] Desconectando...');
    this.token = null;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.close(1000, 'Logout de usuario');
      this.ws = null;
    }
  }

  /**
   * Registra un callback para un evento específico ('nueva_alerta', 'alerta_actualizada', etc.)
   * @param {string} event Nombre del evento
   * @param {function} callback Función a ejecutar al recibir el evento
   * @returns {function} Función para desuscribirse fácilmente
   */
  on(event, callback) {
    if (typeof callback !== 'function') return () => {};

    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(callback);

    // Retorna función de desuscripción
    return () => this.off(event, callback);
  }

  /**
   * Desregistra un callback de un evento
   * @param {string} event Nombre del evento
   * @param {function} callback Función a remover
   */
  off(event, callback) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).delete(callback);
    }
  }

  /**
   * Envía un mensaje al servidor WebSocket si la conexión está abierta.
   * @param {object|string} data Datos a enviar
   */
  send(data) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      const message = typeof data === 'string' ? data : JSON.stringify(data);
      this.ws.send(message);
    } else {
      console.warn('⚠️ [WebSocket] Intento de envío en socket no abierto.');
    }
  }

  /**
   * Indica si la conexión está activa.
   */
  isConnected() {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  /**
   * Método interno para notificar a los oyentes registrados.
   */
  _notifyListeners(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach((callback) => {
        try {
          callback(data);
        } catch (err) {
          console.error(`❌ [WebSocket] Error en callback de evento "${event}":`, err);
        }
      });
    }
  }
}

// Instancia singleton exportada por defecto
const socketService = new SocketService();
export default socketService;
export { SocketService };
