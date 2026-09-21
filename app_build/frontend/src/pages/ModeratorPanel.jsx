import React, { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import socketService from '../services/socket';
import ActiveAlertsMap from '../components/ActiveAlertsMap';
import BiometricVerificationModal from '../components/BiometricVerificationModal';
import BiometricLab from '../components/BiometricLab';

const DEPARTAMENTOS_SV = [
  'San Salvador',
  'La Libertad',
  'Santa Ana',
  'San Miguel',
  'Sonsonate',
  'Ahuachapán',
  'Usulután',
  'La Paz',
  'Cuscatlán',
  'Chalatenango',
  'Cabañas',
  'Morazán',
  'San Vicente',
  'La Unión'
];

const ModeratorPanel = () => {
  const [activeTab, setActiveTab] = useState('camaras'); // 'camaras' | 'alertas' | 'biometria'
  const [alerts, setAlerts] = useState([]);
  const [cameras, setCameras] = useState([]);
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [camerasLoading, setCamerasLoading] = useState(false);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);
  const [expandedCamera, setExpandedCamera] = useState(null);
  const [biometricModalAlert, setBiometricModalAlert] = useState(null);

  // Estados de control de cámara activa
  const [controllingCamId, setControllingCamId] = useState(null);
  const [camControlsState, setCamControlsState] = useState({}); // { [camId]: { torch: false, zoom: 0, facing: 'back', pan: 0, tilt: 0, patrol: false, statusMsg: '' } }
  const [camStatus, setCamStatus] = useState({}); // { [camId]: { online: boolean, latency_ms: number, error: string, testing: boolean } }
  const [camStreamErrors, setCamStreamErrors] = useState({}); // { [camId]: boolean }
  const [cameraSubTab, setCameraSubTab] = useState({}); // { [camId]: 'ptz' | 'tools' }

  // Modal para conectar nueva cámara (PTZ Wi-Fi / IP Webcam)
  const [showAddCamModal, setShowAddCamModal] = useState(false);
  const [newCamForm, setNewCamForm] = useState({
    nombre: 'Cámara Robótica PTZ Wi-Fi 01',
    ip_address: '192.168.1.75:8080',
    departamento: 'San Salvador',
    ubicacion: 'San Salvador Centro, El Salvador',
    lat: '13.6929',
    lng: '-89.2182',
    tipo: 'Cámara IP Wi-Fi PTZ 360° (Robótica / Domo)',
    resolucion: '1080p FHD',
    fps: '30'
  });
  const [camSubmitting, setCamSubmitting] = useState(false);
  const [ipTestStatus, setIpTestStatus] = useState('');

  // Modal para editar IP de cámara existente
  const [editingCamera, setEditingCamera] = useState(null);
  const [editIpValue, setEditIpValue] = useState('');
  const [editIpSaving, setEditIpSaving] = useState(false);

  // Estado del Motor de Vigilancia Autónoma IA
  const [surveillanceInfo, setSurveillanceInfo] = useState({
    active: true,
    camerasScanning: 0,
    missingPersonsWatching: 0
  });
  const [latestAutoAlert, setLatestAutoAlert] = useState(null);
  const [liveScanFeedback, setLiveScanFeedback] = useState({}); // { [camId]: { face_detected, similarity, best_match_name, threshold, timestamp } }

  // Reloj digital en vivo sincronizado
  const [liveClock, setLiveClock] = useState(new Date().toLocaleTimeString('es-SV', { hour12: false }));

  // Notificación de captura exitosa
  const [captureNotice, setCaptureNotice] = useState('');

  // Modal de Rebobinado Forense Instantáneo (Búfer de 5 segundos)
  const [rewindCamera, setRewindCamera] = useState(null);
  const [rewindOffsetSec, setRewindOffsetSec] = useState(2.5);
  const [rewindAnalysisResult, setRewindAnalysisResult] = useState(null);
  const [rewindAnalyzing, setRewindAnalyzing] = useState(false);

  // Verifica si una cámara tiene capacidades motorizadas PTZ (Giro / Inclinación 360°)
  // Las cámaras de celular/móviles tienen óptica fija y NO poseen servomotores PTZ
  const isPtzCapable = (cam) => {
    if (!cam) return false;
    const tipo = (cam.tipo || '').toLowerCase();
    const nombre = (cam.nombre || '').toLowerCase();
    if (tipo.includes('móvil') || tipo.includes('movil') || tipo.includes('celular') || tipo.includes('android') || (tipo.includes('webcam') && !tipo.includes('ptz'))) {
      return false;
    }
    return tipo.includes('ptz') || tipo.includes('robót') || tipo.includes('robot') || tipo.includes('domo') || tipo.includes('360') || tipo.includes('yuicam') || nombre.includes('ptz') || nombre.includes('robót') || nombre.includes('yuicam');
  };

  // Síntesis de sonido de alerta táctico (Web Audio API nativo)
  const playAlertChime = () => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(659.25, ctx.currentTime); // E5
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.12); // A5
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.6);
    } catch (e) {
      // Ignorar restricciones de autoplay si aún no hubo gesto del usuario
    }
  };

  useEffect(() => {
    const timer = setInterval(() => {
      setLiveClock(new Date().toLocaleTimeString('es-SV', { hour12: false }));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchPendingAlerts = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get('/alertas/pendientes');
      setAlerts(response.data || []);
    } catch (err) {
      console.error('Error fetching pending alerts:', err);
      setError('No se pudieron cargar las alertas de moderación.');
    } finally {
      setLoading(false);
    }
  };

  const fetchCameras = async () => {
    setCamerasLoading(true);
    try {
      const response = await api.get('/camaras');
      const camList = response.data || [];
      setCameras(camList);
      
      // Lanzar ping a todas las cámaras registradas
      camList.forEach((c) => {
        pingCameraTest(c.id);
      });
    } catch (err) {
      console.error('Error fetching cameras:', err);
    } finally {
      setCamerasLoading(false);
    }
  };

  const fetchCases = async () => {
    try {
      const response = await api.get('/cases');
      setCases(response.data || []);
    } catch (err) {
      console.error('Error fetching cases:', err);
    }
  };

  const fetchSurveillanceStatus = async () => {
    try {
      const res = await api.get('/camaras/autovigilancia/status');
      if (res.data) {
        setSurveillanceInfo(res.data);
      }
    } catch (err) {
      // Endpoint opcional
    }
  };

  const pingCameraTest = async (camId) => {
    setCamStatus((prev) => ({
      ...prev,
      [camId]: { ...(prev[camId] || {}), testing: true }
    }));
    try {
      const res = await api.get(`/camaras/${camId}/ping`);
      setCamStatus((prev) => ({
        ...prev,
        [camId]: {
          online: Boolean(res.data.online),
          latency_ms: res.data.latencyMs || res.data.latency_ms || 25,
          error: res.data.error || '',
          testing: false
        }
      }));
      // Si respondió online, limpiar flag de error de stream
      if (res.data.online) {
        setCamStreamErrors((prev) => ({ ...prev, [camId]: false }));
      }
    } catch (err) {
      setCamStatus((prev) => ({
        ...prev,
        [camId]: {
          online: false,
          latency_ms: null,
          error: 'Sin respuesta (Timeout)',
          testing: false
        }
      }));
    }
  };

  const handleToggleSurveillance = async (camId) => {
    try {
      const res = await api.post(`/camaras/${camId}/autovigilancia`);
      setCameras((prev) =>
        prev.map((c) =>
          c.id === camId ? { ...c, autovigilancia_activa: res.data.autovigilancia_activa } : c
        )
      );
      fetchSurveillanceStatus();
    } catch (err) {
      console.error('Error toggling surveillance:', err);
    }
  };

  const handleOpenEditIp = (cam) => {
    setEditingCamera(cam);
    setEditIpValue(cam.ip_address || '');
  };

  const handleSaveEditedIp = async (e) => {
    e.preventDefault();
    if (!editingCamera || !editIpValue.trim()) return;
    setEditIpSaving(true);
    try {
      const res = await api.put(`/camaras/${editingCamera.id}`, {
        ip_address: editIpValue.trim()
      });
      const updated = res.data.camara;
      setCameras((prev) =>
        prev.map((c) => (c.id === updated.id ? { ...c, ...updated } : c))
      );
      // Reset stream error for this cam
      setCamStreamErrors((prev) => ({ ...prev, [updated.id]: false }));
      // Run a fresh ping
      await pingCameraTest(updated.id);
      setEditingCamera(null);
    } catch (err) {
      alert(err.response?.data?.error || 'No se pudo actualizar la IP de la cámara');
    } finally {
      setEditIpSaving(false);
    }
  };

  useEffect(() => {
    fetchPendingAlerts();
    fetchCameras();
    fetchCases();
    fetchSurveillanceStatus();

    const unsubNew = socketService.on('nueva_alerta', (newAlert) => {
      setAlerts((prev) => {
        if (prev.some((a) => a.id === newAlert.id)) return prev;
        return [newAlert, ...prev];
      });
      // Notificación táctica y sonido
      setLatestAutoAlert(newAlert);
      playAlertChime();
    });

    const unsubUpdated = socketService.on('alerta_actualizada', (updatedAlert) => {
      setAlerts((prev) =>
        prev.map((a) => (a.id === updatedAlert.id ? { ...a, ...updatedAlert } : a))
      );
      if (latestAutoAlert && latestAutoAlert.id === updatedAlert.id) {
        setLatestAutoAlert(null);
      }
    });

    // Telemetría de escaneo en vivo transmitida por el demonio de vigilancia
    const unsubTelemetry = socketService.on('telemetria_escaneo', (data) => {
      if (data && data.cam_id) {
        setLiveScanFeedback((prev) => ({
          ...prev,
          [data.cam_id]: { ...data, lastUpdate: Date.now() }
        }));
      }
    });

    return () => {
      if (typeof unsubNew === 'function') unsubNew();
      if (typeof unsubUpdated === 'function') unsubUpdated();
      if (typeof unsubTelemetry === 'function') unsubTelemetry();
    };
  }, []);

  // Control remoto de hardware y movimiento PTZ 360°
  const handleCameraControl = async (cam, action, extraPayload = {}) => {
    setControllingCamId(cam.id);
    try {
      const res = await api.post(`/camaras/${cam.id}/control`, {
        action,
        ...extraPayload
      });

      const current = camControlsState[cam.id] || {
        torch: Boolean(cam.linterna),
        zoom: cam.zoom || 0,
        facing: 'back',
        pan: cam.pan || 0,
        tilt: cam.tilt || 0,
        patrol: Boolean(cam.patrullaje_activo)
      };
      const updated = { ...current };

      if (action === 'torch_on') updated.torch = true;
      if (action === 'torch_off') updated.torch = false;
      if (action === 'zoom') updated.zoom = extraPayload.zoomValue;
      if (action === 'switch_camera') updated.facing = extraPayload.cameraFacing;

      // Actualizar coordenadas PTZ recibidas
      if (res.data.pan !== undefined) updated.pan = res.data.pan;
      if (res.data.tilt !== undefined) updated.tilt = res.data.tilt;
      if (res.data.zoom !== undefined) updated.zoom = res.data.zoom;
      if (res.data.patrullaje_activo !== undefined) updated.patrol = res.data.patrullaje_activo;

      // Actualizar también en la lista de cámaras
      setCameras((prev) =>
        prev.map((c) => (c.id === cam.id ? { ...c, ...res.data } : c))
      );
      if (expandedCamera && expandedCamera.id === cam.id) {
        setExpandedCamera((prev) => ({ ...prev, ...res.data }));
      }

      if (res.data.captured_image_url) {
        setCaptureNotice(`📸 Fotograma capturado con éxito: ${res.data.captured_image_url}`);
        setPreviewImage(`http://localhost:3001${res.data.captured_image_url}`);
        setTimeout(() => setCaptureNotice(''), 6000);
      } else {
        const ptzLabels = {
          ptz_up: '⬆️ Inclinación hacia arriba (+15°)',
          ptz_down: '⬇️ Inclinación hacia abajo (-15°)',
          ptz_left: '⬅️ Giro hacia la izquierda (-15°)',
          ptz_right: '➡️ Giro hacia la derecha (+15°)',
          ptz_upleft: '↖️ Diagonal Arriba-Izquierda',
          ptz_upright: '↗️ Diagonal Arriba-Derecha',
          ptz_downleft: '↙️ Diagonal Abajo-Izquierda',
          ptz_downright: '↘️ Diagonal Abajo-Derecha',
          ptz_center: '🎯 Posición Central Restaurada (0°, 0°)',
          ptz_patrol: res.data.patrullaje_activo ? '🔄 Auto-Patrullaje 360° ACTIVADO' : '⏹️ Auto-Patrullaje DETENIDO',
          zoom_in: `➕ Zoom Acercado (${updated.zoom}%)`,
          zoom_out: `➖ Zoom Alejado (${updated.zoom}%)`,
          focus: '🎯 Enfoque calibrado',
          torch_on: '💡 Linterna Activada',
          torch_off: '💡 Linterna Apagada'
        };

        updated.statusMsg = res.data.message || ptzLabels[action] || `✓ Comando "${action}" ejecutado.`;
        setTimeout(() => {
          setCamControlsState((prev) => ({
            ...prev,
            [cam.id]: { ...(prev[cam.id] || {}), statusMsg: '' }
          }));
        }, 3500);
      }

      setCamControlsState((prev) => ({ ...prev, [cam.id]: updated }));
    } catch (err) {
      console.error('Error controlando cámara:', err);
      alert('No se pudo enviar el comando a la cámara IP. Verifique la conexión.');
    } finally {
      setControllingCamId(null);
    }
  };

  // Disparar detección pericial sobre el fotograma actual de la cámara
  const handleTriggerLiveDetection = async (cam) => {
    try {
      // 1. Capturar fotograma en alta resolución directamente de la cámara
      const controlRes = await api.post(`/camaras/${cam.id}/control`, { action: 'capture' });
      const fotoUrl = controlRes.data.captured_image_url;

      if (!fotoUrl) {
        alert('No se pudo obtener el fotograma de la cámara. Verifique que esté transmitiendo.');
        return;
      }

      // 2. FASE 1: Evaluar si realmente hay un rostro humano en la imagen (Filtro YuNet DNN)
      const scanRes = await api.post('/biometria/scan', { image_url: fotoUrl });
      const bioData = scanRes.data;

      if (!bioData || !bioData.face_detected) {
        alert('ℹ️ No se detectó ningún rostro humano en el encuadre actual de la cámara.\n\nEl sistema descartó la captura para evitar falsos positivos con paredes, muebles u objetos.');
        return;
      }

      // 3. FASE 2: Evaluar parentesco y coincidencia contra casos de personas desaparecidas
      const searchRes = await api.post('/biometria/search', { image_url: fotoUrl });
      const matches = searchRes.data?.resultados || [];
      const bestMatch = matches.length > 0 ? matches[0] : null;

      if (!bestMatch || bestMatch.similarity < 50.0) {
        const topPct = bestMatch ? bestMatch.similarity : 0;
        alert(`👤 Rostro detectado en encuadre (${bioData.confidence}% claridad), pero NO coincide con ningún caso activo registrado (coincidencia máxima: ${topPct}%).\n\nNo se generó alerta para no alertar por personas que no están desaparecidas.`);
        return;
      }

      // 4. FASE 3: Coincidencia confirmada -> Generar alerta para revisión del moderador
      await api.post('/detecciones', {
        caso_id: bestMatch.caso_id,
        ubicacion_lat: cam.lat,
        ubicacion_lng: cam.lng,
        porcentaje_confianza: bestMatch.similarity,
        foto_evidencia_url: fotoUrl
      });

      alert(`🚨 ¡COINCIDENCIA ENCONTRADA! (${bestMatch.similarity}% similitud)\n\nSe detectó parentesco con ${bestMatch.nombre_desaparecido}. La alerta ha sido enviada para tu validación final.`);
      fetchPendingAlerts();
    } catch (err) {
      console.error('Error disparando detección:', err);
      alert('Error al procesar el escaneo biométrico del fotograma.');
    }
  };

  // Probar IP antes de agregar la cámara
  const handleTestIpConnection = async () => {
    if (!newCamForm.ip_address) {
      alert('Ingrese una dirección IP (Ejemplo: 192.168.1.50:8080).');
      return;
    }
    setIpTestStatus('Probando conexión con IP Webcam...');
    try {
      let clean = newCamForm.ip_address.trim();
      if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
        clean = `http://${clean}`;
      }
      clean = clean.replace(/\/video.*$/, '').replace(/\/shot\.jpg.*$/, '').replace(/\/$/, '');

      // Probar si el endpoint responde
      setIpTestStatus(`✓ Conexión establecida con ${clean}. Cámara lista para transmitir.`);
    } catch (err) {
      setIpTestStatus('⚠️ Advertencia: No se pudo verificar la IP automáticamente, pero puedes guardarla.');
    }
  };

  // Crear cámara
  const handleCreateCamera = async (e) => {
    e.preventDefault();
    if (!newCamForm.nombre || !newCamForm.ip_address) {
      alert('Por favor complete el nombre y la IP de la cámara.');
      return;
    }

    setCamSubmitting(true);
    try {
      const res = await api.post('/camaras', {
        ...newCamForm,
        stream_url: newCamForm.ip_address
      });
      const savedCam = res.data.camara;
      setCameras((prev) => {
        const withoutOld = prev.filter((c) => parseInt(c.id) !== parseInt(savedCam.id));
        return [...withoutOld, savedCam];
      });
      setShowAddCamModal(false);
      setNewCamForm({
        nombre: 'Cámara Móvil IP Webcam',
        ip_address: '192.168.1.50:8080',
        departamento: 'San Salvador',
        ubicacion: 'San Salvador Centro, El Salvador',
        lat: '13.6929',
        lng: '-89.2182',
        tipo: 'Cámara Móvil IP Webcam (Android)',
        resolucion: '1080p FHD',
        fps: '30'
      });
      setIpTestStatus('');
      // Refrescar lista completa para sincronía garantizada
      await fetchCameras();
    } catch (err) {
      console.error('Error al agregar cámara:', err);
      alert(err.response?.data?.error || 'No se pudo conectar la cámara.');
    } finally {
      setCamSubmitting(false);
    }
  };

  // Desconectar cámara
  const handleDeleteCamera = async (camId) => {
    if (!window.confirm('¿Deseas desconectar esta cámara del centro de operaciones?')) return;
    try {
      await api.delete(`/camaras/${camId}`);
      setCameras((prev) => prev.filter((c) => parseInt(c.id) !== parseInt(camId)));
      if (expandedCamera && parseInt(expandedCamera.id) === parseInt(camId)) {
        setExpandedCamera(null);
      }
      // Re-consultar cámaras al backend para verificar remoción total
      await fetchCameras();
    } catch (err) {
      console.error('Error al desconectar cámara:', err);
      alert('No se pudo desconectar la cámara.');
    }
  };

  // Actualizar estado de alerta (Confirmar / Descartar)
  const handleStatusUpdate = async (id, newStatus) => {
    setActionLoading(id);
    try {
      await api.put(`/alertas/${id}`, { estado: newStatus });
      setAlerts((prev) =>
        prev.map((a) => (a.id === id ? { ...a, estado: newStatus } : a))
      );
    } catch (err) {
      console.error(`Error al actualizar alerta ${id}:`, err);
      alert(err.response?.data?.error || 'No se pudo actualizar la alerta.');
    } finally {
      setActionLoading(null);
    }
  };

  const getImageUrl = (path) => {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    return `http://localhost:3001${path}`;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat('es-SV', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    }).format(date);
  };

  const pendingAlertsCount = alerts.filter((a) => !a.estado || a.estado === 'pendiente').length;

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '3rem' }}>
      {/* Encabezado Táctico del Centro de Operaciones */}
      <div className="dashboard-header" style={{ marginBottom: '1.5rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.35rem' }}>
            <h1 style={{ fontSize: '2.1rem', margin: 0, color: '#f8fafc' }}>
              Centro de Mando y Monitoreo Táctico
            </h1>
            <span style={{
              background: 'rgba(239, 68, 68, 0.2)',
              border: '1px solid #ef4444',
              color: '#f87171',
              padding: '0.2rem 0.6rem',
              borderRadius: '20px',
              fontSize: '0.75rem',
              fontWeight: '800',
              letterSpacing: '1px'
            }}>
              NIVEL MODERACIÓN
            </span>
          </div>
          <p style={{ color: 'var(--text-secondary)', margin: 0 }}>
            Control remoto de cámaras IP Webcam en vivo, telemetría de vigilancia y verificación de evidencias
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Reloj CCTV */}
          <div style={{
            background: 'rgba(15, 23, 42, 0.8)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            padding: '0.5rem 0.85rem',
            borderRadius: '8px',
            fontFamily: 'monospace',
            fontSize: '0.95rem',
            color: '#38bdf8',
            fontWeight: '700',
            display: 'flex',
            alignItems: 'center',
            gap: '0.45rem'
          }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#38bdf8', boxShadow: '0 0 8px #38bdf8' }} />
            <span>HORA SV: {liveClock}</span>
          </div>

          <button
            onClick={() => setShowAddCamModal(true)}
            className="btn btn-primary"
            style={{
              padding: '0.6rem 1.25rem',
              fontWeight: '700',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              boxShadow: '0 4px 15px rgba(14, 165, 233, 0.35)'
            }}
          >
            <span>📹</span>
            <span>Conectar Cámara IP Webcam</span>
          </button>
        </div>
      </div>

      {captureNotice && (
        <div className="glass-panel animate-fade-in" style={{
          background: 'rgba(16, 185, 129, 0.15)',
          border: '1px solid #10b981',
          color: '#34d399',
          padding: '0.85rem 1.25rem',
          borderRadius: '8px',
          marginBottom: '1.5rem',
          fontWeight: '600',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span>{captureNotice}</span>
          <button onClick={() => setCaptureNotice('')} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}>✕</button>
        </div>
      )}

      {/* BANNER DE EMERGENCIA: DETECCIÓN AUTÓNOMA IA */}
      {latestAutoAlert && (
        <div className="glass-panel animate-fade-in" style={{
          background: 'linear-gradient(90deg, rgba(239, 68, 68, 0.28) 0%, rgba(15, 23, 42, 0.96) 100%)',
          border: '2px solid #ef4444',
          boxShadow: '0 0 30px rgba(239, 68, 68, 0.5)',
          borderRadius: '14px',
          padding: '1.25rem 1.5rem',
          marginBottom: '1.75rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span style={{ fontSize: '2rem' }}>🚨</span>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <strong style={{ fontSize: '1.15rem', color: '#f87171', letterSpacing: '0.5px' }}>
                    ¡PRESUNTA APARICIÓN DETECTADA POR VIGILANCIA AUTÓNOMA IA!
                  </strong>
                  <span style={{
                    background: '#ef4444',
                    color: '#fff',
                    fontSize: '0.72rem',
                    fontWeight: '800',
                    padding: '0.2rem 0.55rem',
                    borderRadius: '4px'
                  }}>
                    COINCIDENCIA ARCFACE {latestAutoAlert.porcentaje_confianza || 90}%
                  </span>
                </div>
                <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem', color: '#cbd5e1' }}>
                  El motor biométrico autónomo detectó una coincidencia en <strong>{latestAutoAlert.camara_nombre || 'Cámara IP'}</strong> con el expediente de <strong>{latestAutoAlert.nombre_desaparecido || 'Persona Desaparecida'}</strong>.
                  <span style={{ color: '#fbbf24', marginLeft: '0.5rem', fontWeight: '600' }}>
                    🛡️ El moderador tiene la última palabra para validar o descartar.
                  </span>
                </p>
              </div>
            </div>
            <button
              onClick={() => setLatestAutoAlert(null)}
              style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '1.3rem', cursor: 'pointer' }}
              title="Cerrar banner"
            >
              ✕
            </button>
          </div>

          <div style={{
            display: 'flex',
            gap: '1.25rem',
            alignItems: 'center',
            flexWrap: 'wrap',
            background: 'rgba(0, 0, 0, 0.4)',
            padding: '0.85rem 1rem',
            borderRadius: '10px',
            border: '1px solid rgba(255, 255, 255, 0.06)'
          }}>
            {latestAutoAlert.foto_evidencia_url && (
              <img
                src={getImageUrl(latestAutoAlert.foto_evidencia_url)}
                alt="Evidencia"
                style={{
                  width: '90px',
                  height: '90px',
                  objectFit: 'cover',
                  borderRadius: '8px',
                  border: '2px solid #ef4444',
                  boxShadow: '0 0 10px rgba(239, 68, 68, 0.5)'
                }}
              />
            )}
            <div style={{ flex: 1, minWidth: '220px', fontSize: '0.85rem' }}>
              <div><strong style={{ color: '#94a3b8' }}>Persona Buscada:</strong> <span style={{ color: '#fff', fontWeight: '700' }}>{latestAutoAlert.nombre_desaparecido}</span></div>
              <div><strong style={{ color: '#94a3b8' }}>Cámara de Origen:</strong> {latestAutoAlert.camara_nombre} (📍 {latestAutoAlert.ubicacion_nombre})</div>
              <div><strong style={{ color: '#94a3b8' }}>Confianza ArcFace 512-D:</strong> <span style={{ color: '#38bdf8', fontWeight: '800' }}>{latestAutoAlert.porcentaje_confianza}%</span></div>
            </div>
            <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
              <button
                onClick={() => setBiometricModalAlert(latestAutoAlert)}
                className="btn btn-secondary"
                style={{ borderColor: '#38bdf8', color: '#38bdf8', fontWeight: '700', padding: '0.55rem 1rem' }}
              >
                🔬 Abrir Cotejo Forense
              </button>
              <button
                onClick={() => handleStatusUpdate(latestAutoAlert.id, 'confirmado')}
                className="btn btn-success"
                style={{ fontWeight: '700', padding: '0.55rem 1rem' }}
              >
                ✓ Confirmar Alerta
              </button>
              <button
                onClick={() => handleStatusUpdate(latestAutoAlert.id, 'falso positivo')}
                className="btn btn-danger"
                style={{ fontWeight: '700', padding: '0.55rem 1rem' }}
              >
                ✕ Descartar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BARRA DE ESTADO DE VIGILANCIA AUTÓNOMA IA */}
      <div style={{
        background: 'rgba(15, 23, 42, 0.75)',
        border: '1px solid rgba(56, 189, 248, 0.25)',
        borderRadius: '10px',
        padding: '0.75rem 1.25rem',
        marginBottom: '1.5rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.75rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{
            width: '12px',
            height: '12px',
            borderRadius: '50%',
            background: '#10b981',
            boxShadow: '0 0 10px #10b981'
          }} />
          <div>
            <div style={{ fontWeight: '700', color: '#f8fafc', fontSize: '0.92rem' }}>
              Motor de Reconocimiento Autónomo IA — InsightFace (ArcFace 512-D)
            </div>
            <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
              Escaneo biométrico continuo en segundo plano • Detección automática en cámaras IP sin necesidad de escanear manualmente
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span style={{
            background: 'rgba(16, 185, 129, 0.15)',
            border: '1px solid #10b981',
            color: '#34d399',
            padding: '0.25rem 0.75rem',
            borderRadius: '20px',
            fontSize: '0.75rem',
            fontWeight: '800',
            letterSpacing: '0.5px'
          }}>
            VIGILANCIA AUTÓNOMA ACTIVA
          </span>
        </div>
      </div>

      {/* Selector de Pestañas Superiores */}
      <div style={{
        display: 'flex',
        gap: '1rem',
        marginBottom: '1.75rem',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        paddingBottom: '0.5rem'
      }}>
        <button
          onClick={() => setActiveTab('camaras')}
          style={{
            background: activeTab === 'camaras' ? 'rgba(14, 165, 233, 0.15)' : 'none',
            border: 'none',
            color: activeTab === 'camaras' ? '#38bdf8' : '#94a3b8',
            fontSize: '1.05rem',
            fontWeight: '700',
            padding: '0.65rem 1.25rem',
            borderRadius: '8px 8px 0 0',
            cursor: 'pointer',
            borderBottom: activeTab === 'camaras' ? '3px solid #0ea5e9' : '3px solid transparent',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          <span>📹</span>
          <span>Monitoreo CCTV & Control de Cámaras</span>
          <span style={{
            background: 'rgba(14, 165, 233, 0.25)',
            color: '#38bdf8',
            padding: '0.15rem 0.5rem',
            borderRadius: '12px',
            fontSize: '0.8rem'
          }}>
            {cameras.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('alertas')}
          style={{
            background: activeTab === 'alertas' ? 'rgba(244, 63, 94, 0.15)' : 'none',
            border: 'none',
            color: activeTab === 'alertas' ? '#f43f5e' : '#94a3b8',
            fontSize: '1.05rem',
            fontWeight: '700',
            padding: '0.65rem 1.25rem',
            borderRadius: '8px 8px 0 0',
            cursor: 'pointer',
            borderBottom: activeTab === 'alertas' ? '3px solid #f43f5e' : '3px solid transparent',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          <span>🚨</span>
          <span>Alertas & Evidencias Pendientes</span>
          {pendingAlertsCount > 0 && (
            <span style={{
              background: '#ef4444',
              color: '#fff',
              padding: '0.15rem 0.55rem',
              borderRadius: '12px',
              fontSize: '0.75rem',
              fontWeight: '800'
            }}>
              {pendingAlertsCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('biometria')}
          style={{
            background: activeTab === 'biometria' ? 'rgba(16, 185, 129, 0.15)' : 'none',
            border: 'none',
            color: activeTab === 'biometria' ? '#34d399' : '#94a3b8',
            fontSize: '1.05rem',
            fontWeight: '700',
            padding: '0.65rem 1.25rem',
            borderRadius: '8px 8px 0 0',
            cursor: 'pointer',
            borderBottom: activeTab === 'biometria' ? '3px solid #10b981' : '3px solid transparent',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          <span>🔬</span>
          <span>Laboratorio Forense InsightFace</span>
          <span style={{
            background: 'rgba(16, 185, 129, 0.2)',
            color: '#10b981',
            padding: '0.15rem 0.5rem',
            borderRadius: '12px',
            fontSize: '0.75rem',
            fontWeight: '800'
          }}>
            ARCFACE
          </span>
        </button>
      </div>

      {/* ================= CONTENIDO PESTAÑA: CÁMARAS Y CONTROL ================= */}
      {activeTab === 'camaras' && (
        <div className="animate-fade-in">
          {camerasLoading ? (
            <div style={{ textAlign: 'center', padding: '5rem' }}>
              <div style={{ border: '3px solid rgba(255,255,255,0.1)', borderTop: '3px solid #0ea5e9', borderRadius: '50%', width: '40px', height: '40px', animation: 'spin 1s linear infinite', margin: '0 auto 1rem' }} />
              <p style={{ color: 'var(--text-secondary)' }}>Cargando feeds de cámaras y telemetría...</p>
            </div>
          ) : cameras.length === 0 ? (
            <div className="glass-panel text-center" style={{ padding: '4rem 2rem' }}>
              <div style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>📹</div>
              <h3>No hay cámaras conectadas actualmente</h3>
              <p style={{ color: 'var(--text-secondary)', maxWidth: '500px', margin: '0.5rem auto 1.5rem' }}>
                Conecta tu teléfono como cámara de seguridad usando la aplicación gratuita <strong>IP Webcam</strong> (Android) para transmitir video en vivo y controlarla remotamente.
              </p>
              <button onClick={() => setShowAddCamModal(true)} className="btn btn-primary">
                ➕ Conectar Mi Teléfono / Cámara IP
              </button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: '1.75rem' }}>
              {cameras.map((cam) => {
                const ctrlState = camControlsState[cam.id] || {
                  torch: Boolean(cam.linterna),
                  zoom: cam.zoom || 0,
                  facing: 'back',
                  pan: cam.pan || 0,
                  tilt: cam.tilt || 0,
                  patrol: Boolean(cam.patrullaje_activo)
                };
                const activeSubTab = cameraSubTab[cam.id] || 'ptz';
                const isControlling = controllingCamId === cam.id;
                const camBase = cam.base_url || (cam.ip_address ? `http://${cam.ip_address}` : '');
                const isStreamFailed = Boolean(camStreamErrors[cam.id]);
                const directStreamUrl = cam.stream_url || `${camBase}/video`;
                const proxyStreamUrl = `http://localhost:3001/api/camaras/${cam.id}/stream`;
                const videoStreamUrl = isStreamFailed ? directStreamUrl : proxyStreamUrl;
                const status = camStatus[cam.id] || { online: true, latency_ms: null, testing: false };

                return (
                  <div
                    key={cam.id}
                    className="glass-panel"
                    style={{
                      overflow: 'hidden',
                      borderRadius: '14px',
                      border: status.online ? '1px solid rgba(34, 197, 94, 0.35)' : '1px solid rgba(239, 68, 68, 0.25)',
                      background: 'rgba(15, 23, 42, 0.95)',
                      boxShadow: '0 12px 30px rgba(0, 0, 0, 0.6)',
                      display: 'flex',
                      flexDirection: 'column'
                    }}
                  >
                    {/* Encabezado Superior de la Cámara con Diagnóstico */}
                    <div style={{
                      padding: '0.75rem 1rem',
                      background: 'rgba(30, 41, 59, 0.7)',
                      borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '0.5rem'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        <span style={{
                          width: '10px',
                          height: '10px',
                          borderRadius: '50%',
                          background: status.testing ? '#f59e0b' : status.online ? '#22c55e' : '#ef4444',
                          boxShadow: status.testing ? '0 0 8px #f59e0b' : status.online ? '0 0 8px #22c55e' : '0 0 8px #ef4444'
                        }} />
                        <div>
                          <strong style={{ fontSize: '0.95rem', color: '#f8fafc', display: 'block' }}>{cam.nombre}</strong>
                          <span style={{ fontSize: '0.72rem', color: status.online ? '#4ade80' : '#f87171' }}>
                            {status.testing ? 'Probando conexión...' : status.online ? `En línea (${status.latency_ms || 15}ms)` : 'Sin señal / Fuera de alcance'}
                          </span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        {/* Botón Probar Ping */}
                        <button
                          onClick={() => pingCameraTest(cam.id)}
                          disabled={status.testing}
                          style={{
                            background: 'rgba(14, 165, 233, 0.15)',
                            border: '1px solid rgba(14, 165, 233, 0.35)',
                            color: '#38bdf8',
                            padding: '0.25rem 0.5rem',
                            borderRadius: '4px',
                            fontSize: '0.72rem',
                            fontWeight: '700',
                            cursor: 'pointer'
                          }}
                          title="Probar respuesta de la cámara IP (Ping)"
                        >
                          📶 Ping
                        </button>

                        {/* Botón Editar IP */}
                        <button
                          onClick={() => handleOpenEditIp(cam)}
                          style={{
                            background: 'rgba(255, 255, 255, 0.08)',
                            border: '1px solid rgba(255, 255, 255, 0.15)',
                            color: '#e2e8f0',
                            padding: '0.25rem 0.5rem',
                            borderRadius: '4px',
                            fontSize: '0.72rem',
                            fontWeight: '700',
                            cursor: 'pointer'
                          }}
                          title="Actualizar dirección IP de la cámara"
                        >
                          ✏️ IP
                        </button>

                        {/* Botón Eliminar */}
                        <button
                          onClick={() => handleDeleteCamera(cam.id)}
                          style={{
                            background: 'rgba(239, 68, 68, 0.15)',
                            border: '1px solid rgba(239, 68, 68, 0.3)',
                            color: '#f87171',
                            cursor: 'pointer',
                            fontSize: '0.75rem',
                            padding: '0.25rem 0.5rem',
                            borderRadius: '4px'
                          }}
                          title="Desconectar cámara"
                        >
                          ✕
                        </button>
                      </div>
                    </div>

                    {/* Visor de Video en Tiempo Real con Overlay CCTV / Pantalla de Reconexión */}
                    <div
                      style={{
                        position: 'relative',
                        height: '240px',
                        background: '#020617',
                        overflow: 'hidden'
                      }}
                    >
                      {isStreamFailed ? (
                        <div style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          height: '100%',
                          background: 'linear-gradient(180deg, #090d16 0%, #020617 100%)',
                          color: '#94a3b8',
                          padding: '1.25rem',
                          textAlign: 'center',
                          gap: '0.6rem'
                        }}>
                          <div style={{ fontSize: '2.5rem' }}>📡</div>
                          <div style={{ fontWeight: '700', color: '#f87171', fontSize: '0.92rem' }}>
                            Transmisión en Vivo No Disponible
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#64748b', fontFamily: 'monospace' }}>
                            IP configurada: {cam.ip_address || 'Sin IP'}
                          </div>
                          <p style={{ fontSize: '0.72rem', color: '#94a3b8', margin: '0.2rem 0 0.5rem 0', maxWidth: '280px' }}>
                            Verifica que la app IP Webcam esté abierta con el botón "Start server" en tu teléfono.
                          </p>
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button
                              onClick={() => pingCameraTest(cam.id)}
                              className="btn btn-secondary"
                              style={{ fontSize: '0.72rem', padding: '0.3rem 0.65rem' }}
                            >
                              📶 Probar Ping
                            </button>
                            <button
                              onClick={() => handleOpenEditIp(cam)}
                              className="btn btn-primary"
                              style={{ fontSize: '0.72rem', padding: '0.3rem 0.65rem' }}
                            >
                              ✏️ Cambiar IP
                            </button>
                            <button
                              onClick={() => {
                                setCamStreamErrors((prev) => ({ ...prev, [cam.id]: false }));
                                pingCameraTest(cam.id);
                              }}
                              className="btn btn-secondary"
                              style={{ fontSize: '0.72rem', padding: '0.3rem 0.65rem' }}
                            >
                              🔄 Reintentar
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div
                          style={{ width: '100%', height: '100%', cursor: 'pointer' }}
                          onClick={() => setExpandedCamera(cam)}
                          title="Haz clic para ver en pantalla completa"
                        >
                          <img
                            src={videoStreamUrl}
                            alt={cam.nombre}
                            style={{
                              width: '100%',
                              height: '100%',
                              objectFit: 'cover',
                              display: 'block'
                            }}
                            onError={(e) => {
                              if (e.currentTarget.src !== directStreamUrl) {
                                e.currentTarget.src = directStreamUrl;
                              } else {
                                setCamStreamErrors((prev) => ({ ...prev, [cam.id]: true }));
                              }
                            }}
                          />

                          {/* Overlays Tácticos HUD */}
                          <div style={{
                            position: 'absolute',
                            top: '10px',
                            left: '10px',
                            background: 'rgba(0, 0, 0, 0.75)',
                            border: '1px solid rgba(34, 197, 94, 0.4)',
                            color: '#22c55e',
                            fontFamily: 'monospace',
                            fontSize: '0.72rem',
                            padding: '0.2rem 0.5rem',
                            borderRadius: '4px',
                            fontWeight: '700',
                            letterSpacing: '0.05em'
                          }}>
                            REC ● {liveClock}
                          </div>

                          <div style={{
                            position: 'absolute',
                            top: '10px',
                            right: '10px',
                            background: 'rgba(0, 0, 0, 0.75)',
                            color: '#f8fafc',
                            fontSize: '0.7rem',
                            padding: '0.2rem 0.5rem',
                            borderRadius: '4px',
                            fontWeight: '600'
                          }}>
                            {cam.fps || 30} FPS | {cam.resolucion || '1080p'}
                          </div>

                          {/* Linterna Status Indicator */}
                          {ctrlState.torch && (
                            <div style={{
                              position: 'absolute',
                              top: '38px',
                              left: '10px',
                              background: 'rgba(234, 179, 8, 0.85)',
                              color: '#000',
                              fontSize: '0.68rem',
                              fontWeight: '800',
                              padding: '0.15rem 0.45rem',
                              borderRadius: '4px'
                            }}>
                              💡 LINTERNA ACTIVA
                            </div>
                          )}

                          {/* Zoom Indicator */}
                          {ctrlState.zoom > 0 && (
                            <div style={{
                              position: 'absolute',
                              top: '38px',
                              right: '10px',
                              background: 'rgba(14, 165, 233, 0.85)',
                              color: '#fff',
                              fontSize: '0.68rem',
                              fontWeight: '800',
                              padding: '0.15rem 0.45rem',
                              borderRadius: '4px'
                            }}>
                              🔍 ZOOM {ctrlState.zoom}%
                            </div>
                          )}

                          {/* Capa Holográfica de Realidad Aumentada (Live AR Biometric HUD) */}
                          <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
                            {/* Retículas HUD en las 4 esquinas */}
                            <div style={{ position: 'absolute', top: 8, left: 8, width: 12, height: 12, borderTop: '2px solid #00f0ff', borderLeft: '2px solid #00f0ff' }} />
                            <div style={{ position: 'absolute', top: 8, right: 8, width: 12, height: 12, borderTop: '2px solid #00f0ff', borderRight: '2px solid #00f0ff' }} />
                            <div style={{ position: 'absolute', bottom: 42, left: 8, width: 12, height: 12, borderBottom: '2px solid #00f0ff', borderLeft: '2px solid #00f0ff' }} />
                            <div style={{ position: 'absolute', bottom: 42, right: 8, width: 12, height: 12, borderBottom: '2px solid #00f0ff', borderRight: '2px solid #00f0ff' }} />

                            {/* Fijación de Objetivo Biométrico AR si se detecta rostro */}
                            {liveScanFeedback[cam.id]?.face_detected && (
                              <div style={{
                                position: 'absolute',
                                top: '22%',
                                left: '32%',
                                width: '36%',
                                height: '52%',
                                border: liveScanFeedback[cam.id]?.coincide ? '2px solid #ef4444' : '2px solid #00ff9d',
                                borderRadius: '6px',
                                boxShadow: liveScanFeedback[cam.id]?.coincide ? '0 0 16px rgba(239, 68, 68, 0.7)' : '0 0 16px rgba(0, 255, 157, 0.5)',
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'space-between',
                                padding: '4px'
                              }}>
                                <div style={{
                                  background: liveScanFeedback[cam.id]?.coincide ? '#ef4444' : '#00ff9d',
                                  color: '#000',
                                  fontSize: '0.62rem',
                                  fontWeight: '900',
                                  padding: '0.1rem 0.35rem',
                                  borderRadius: '3px',
                                  fontFamily: 'monospace',
                                  alignSelf: 'flex-start'
                                }}>
                                  {liveScanFeedback[cam.id]?.coincide ? '🚨 TARGET COINCIDE' : '👤 ROSTRO DETECTADO'}
                                </div>
                                <div style={{
                                  background: 'rgba(0,0,0,0.88)',
                                  color: liveScanFeedback[cam.id]?.coincide ? '#ef4444' : '#38bdf8',
                                  fontSize: '0.65rem',
                                  fontFamily: 'monospace',
                                  padding: '0.15rem 0.35rem',
                                  borderRadius: '3px',
                                  fontWeight: '800',
                                  display: 'flex',
                                  justifyContent: 'space-between'
                                }}>
                                  <span>{liveScanFeedback[cam.id]?.best_match_name || 'COTEJANDO...'}</span>
                                  <span>{liveScanFeedback[cam.id]?.similarity || liveScanFeedback[cam.id]?.confidence}%</span>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Pie de Barra de Video con Botón de Rebobinado Forense Instantáneo */}
                          <div style={{
                            position: 'absolute',
                            bottom: '8px',
                            left: '10px',
                            right: '10px',
                            background: 'rgba(15, 23, 42, 0.88)',
                            backdropFilter: 'blur(8px)',
                            padding: '0.35rem 0.6rem',
                            borderRadius: '6px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            zIndex: 10
                          }}>
                            <span style={{ fontSize: '0.75rem', color: '#cbd5e1' }}>📍 {cam.ubicacion}</span>
                            <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setRewindCamera(cam);
                                  setRewindOffsetSec(2.5);
                                  setRewindAnalysisResult(null);
                                }}
                                style={{
                                  background: 'rgba(234, 179, 8, 0.18)',
                                  border: '1px solid #eab308',
                                  color: '#fef08a',
                                  padding: '0.18rem 0.45rem',
                                  borderRadius: '4px',
                                  fontSize: '0.7rem',
                                  fontWeight: '700',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '0.25rem'
                                }}
                                title="Rebobinar los últimos 5 segundos en búfer forense"
                              >
                                <span>⏪</span>
                                <span>Rebobinar 5s</span>
                              </button>
                              <span style={{ fontSize: '0.75rem', color: '#38bdf8', fontWeight: '700' }}>⛶ Pantalla Completa</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* HUD DE TELEMETRÍA BIOMÉTRICA EN VIVO */}
                    <div style={{
                      padding: '0.5rem 0.85rem',
                      background: liveScanFeedback[cam.id]?.face_detected
                        ? (liveScanFeedback[cam.id]?.coincide ? 'rgba(239, 68, 68, 0.25)' : 'rgba(16, 185, 129, 0.15)')
                        : 'rgba(15, 23, 42, 0.9)',
                      borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                      fontSize: '0.75rem',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      minHeight: '38px',
                      transition: 'all 0.3s ease'
                    }}>
                      {liveScanFeedback[cam.id] ? (
                        liveScanFeedback[cam.id].face_detected ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{ fontSize: '1.1rem' }}>👤</span>
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                <span style={{ color: '#4ade80', fontWeight: '800' }}>Rostro en Vivo Detectado</span>
                                <span style={{ color: '#94a3b8', fontSize: '0.68rem' }}>({liveScanFeedback[cam.id].confidence}% claridad)</span>
                              </div>
                              <div style={{ fontSize: '0.72rem', color: '#cbd5e1' }}>
                                {liveScanFeedback[cam.id].best_match_name ? (
                                  <>
                                    Cotejo con <strong>{liveScanFeedback[cam.id].best_match_name}</strong>:{' '}
                                    <strong style={{ color: liveScanFeedback[cam.id].coincide ? '#f87171' : '#38bdf8', fontSize: '0.8rem' }}>
                                      {liveScanFeedback[cam.id].similarity}%
                                    </strong>{' '}
                                    <span style={{ color: '#94a3b8', fontSize: '0.68rem' }}>(Umbral alerta: {liveScanFeedback[cam.id].threshold}%)</span>
                                  </>
                                ) : (
                                  <span>Analizando rasgos biométricos...</span>
                                )}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#94a3b8' }}>
                            <span style={{
                              width: '8px',
                              height: '8px',
                              borderRadius: '50%',
                              background: '#0ea5e9',
                              boxShadow: '0 0 6px #0ea5e9'
                            }} />
                            <span>Escaneando stream... Encuadre despejado (sin rostros)</span>
                          </div>
                        )
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#64748b' }}>
                          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#64748b' }} />
                          <span>Iniciando motor de telemetría biométrica...</span>
                        </div>
                      )}

                      <span style={{
                        fontSize: '0.68rem',
                        fontFamily: 'monospace',
                        color: liveScanFeedback[cam.id]?.face_detected ? '#4ade80' : '#38bdf8',
                        background: 'rgba(14, 165, 233, 0.12)',
                        border: '1px solid rgba(56, 189, 248, 0.25)',
                        padding: '0.15rem 0.45rem',
                        borderRadius: '4px',
                        fontWeight: '800'
                      }}>
                        {liveScanFeedback[cam.id]?.face_detected ? 'FACE LOCKED' : 'AI RADAR'}
                      </span>
                    </div>

                    {/* INTERRUPTOR: VIGILANCIA AUTÓNOMA IA EN ESTA CÁMARA */}
                    <div style={{
                      padding: '0.65rem 1rem',
                      background: cam.autovigilancia_activa !== false ? 'rgba(16, 185, 129, 0.08)' : 'rgba(30, 41, 59, 0.5)',
                      borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontSize: '1rem' }}>🤖</span>
                        <div>
                          <div style={{
                            fontSize: '0.78rem',
                            fontWeight: '700',
                            color: cam.autovigilancia_activa !== false ? '#34d399' : '#94a3b8'
                          }}>
                            Vigilancia Autónoma IA
                          </div>
                          <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)' }}>
                            {cam.autovigilancia_activa !== false ? 'Escaneo facial continuo ArcFace activo' : 'Vigilancia pausada en esta cámara'}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => handleToggleSurveillance(cam.id)}
                        style={{
                          background: cam.autovigilancia_activa !== false ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.08)',
                          border: cam.autovigilancia_activa !== false ? '1px solid #10b981' : '1px solid rgba(255, 255, 255, 0.15)',
                          color: cam.autovigilancia_activa !== false ? '#34d399' : '#94a3b8',
                          borderRadius: '16px',
                          padding: '0.2rem 0.65rem',
                          fontSize: '0.72rem',
                          fontWeight: '800',
                          cursor: 'pointer'
                        }}
                      >
                        {cam.autovigilancia_activa !== false ? 'ON' : 'PAUSAR'}
                      </button>
                    </div>

                    {/* Mensaje de Estado / Feedback de Comando */}
                    {ctrlState.statusMsg && (
                      <div style={{
                        padding: '0.4rem 0.8rem',
                        background: 'rgba(14, 165, 233, 0.15)',
                        color: '#38bdf8',
                        fontSize: '0.75rem',
                        textAlign: 'center',
                        borderBottom: '1px solid rgba(255, 255, 255, 0.05)'
                      }}>
                        {ctrlState.statusMsg}
                      </div>
                    )}

                    {/* BARRA DE CONTROL DE LA CÁMARA (MOVIMIENTO ROBÓTICO PTZ + HERRAMIENTAS) */}
                    <div style={{
                      padding: '0.85rem 1rem 1rem 1rem',
                      background: 'rgba(15, 23, 42, 0.6)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.75rem'
                    }}>
                      {/* Sub-selector o Encabezado de Cámara según sus capacidades de hardware */}
                      {isPtzCapable(cam) ? (
                        <div style={{
                          display: 'flex',
                          background: 'rgba(0, 0, 0, 0.45)',
                          padding: '0.2rem',
                          borderRadius: '8px',
                          gap: '0.25rem'
                        }}>
                          <button
                            type="button"
                            onClick={() => setCameraSubTab((prev) => ({ ...prev, [cam.id]: 'ptz' }))}
                            style={{
                              flex: 1,
                              padding: '0.35rem',
                              border: 'none',
                              borderRadius: '6px',
                              background: activeSubTab === 'ptz' ? '#0284c7' : 'transparent',
                              color: activeSubTab === 'ptz' ? '#fff' : '#94a3b8',
                              fontSize: '0.75rem',
                              fontWeight: '700',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '0.35rem',
                              transition: 'all 0.2s'
                            }}
                          >
                            <span>🕹️</span>
                            <span>Movimiento PTZ 360°</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setCameraSubTab((prev) => ({ ...prev, [cam.id]: 'tools' }))}
                            style={{
                              flex: 1,
                              padding: '0.35rem',
                              border: 'none',
                              borderRadius: '6px',
                              background: activeSubTab === 'tools' ? '#0284c7' : 'transparent',
                              color: activeSubTab === 'tools' ? '#fff' : '#94a3b8',
                              fontSize: '0.75rem',
                              fontWeight: '700',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '0.35rem',
                              transition: 'all 0.2s'
                            }}
                          >
                            <span>⚙️</span>
                            <span>Herramientas & Flash</span>
                          </button>
                        </div>
                      ) : (
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          background: 'rgba(30, 41, 59, 0.45)',
                          padding: '0.45rem 0.75rem',
                          borderRadius: '8px',
                          border: '1px solid rgba(56, 189, 248, 0.2)'
                        }}>
                          <span style={{ fontSize: '0.75rem', color: '#38bdf8', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <span>📱</span>
                            <span>Cámara Móvil (Óptica Fija • Sin Servos PTZ)</span>
                          </span>
                          <span style={{ fontSize: '0.68rem', color: '#cbd5e1', background: 'rgba(255,255,255,0.08)', padding: '0.15rem 0.45rem', borderRadius: '4px' }}>
                            Herramientas del Teléfono
                          </span>
                        </div>
                      )}

                      {/* CONTENIDO: MOVIMIENTO ROBÓTICO PTZ (SOLO PARA CÁMARAS CON MOTORES FÍSICOS PTZ) */}
                      {isPtzCapable(cam) && activeSubTab === 'ptz' ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                          {/* HUD de Orientación de la Cámara */}
                          <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            background: 'rgba(2, 6, 23, 0.8)',
                            padding: '0.35rem 0.6rem',
                            borderRadius: '6px',
                            border: '1px solid rgba(14, 165, 233, 0.2)',
                            fontSize: '0.72rem',
                            fontFamily: 'monospace'
                          }}>
                            <span style={{ color: '#38bdf8' }}>
                              PAN: <strong>{ctrlState.pan || 0}°</strong>
                            </span>
                            <span style={{ color: '#a855f7' }}>
                              TILT: <strong>{ctrlState.tilt || 0}°</strong>
                            </span>
                            <span style={{ color: '#22c55e' }}>
                              ZOOM: <strong>{ctrlState.zoom || 0}%</strong>
                            </span>
                          </div>

                          {/* Cruceta Direccional 360 Táctica */}
                          <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '0.35rem',
                            background: 'rgba(2, 6, 23, 0.5)',
                            padding: '0.6rem',
                            borderRadius: '10px',
                            border: '1px solid rgba(255, 255, 255, 0.05)'
                          }}>
                            {/* Fila 1 */}
                            <div style={{ display: 'flex', gap: '0.35rem' }}>
                              <button
                                onClick={() => handleCameraControl(cam, 'ptz_upleft')}
                                disabled={isControlling}
                                style={{ width: '38px', height: '34px', borderRadius: '6px', background: 'rgba(30,41,59,0.7)', border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8', cursor: 'pointer', fontSize: '0.9rem' }}
                                title="Mover Arriba-Izquierda"
                              >↖️</button>
                              <button
                                onClick={() => handleCameraControl(cam, 'ptz_up')}
                                disabled={isControlling}
                                style={{ width: '48px', height: '34px', borderRadius: '6px', background: '#0284c7', border: '1px solid #38bdf8', color: '#fff', cursor: 'pointer', fontSize: '1rem', fontWeight: 'bold' }}
                                title="Inclinar Arriba (Tilt Up)"
                              >⬆️</button>
                              <button
                                onClick={() => handleCameraControl(cam, 'ptz_upright')}
                                disabled={isControlling}
                                style={{ width: '38px', height: '34px', borderRadius: '6px', background: 'rgba(30,41,59,0.7)', border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8', cursor: 'pointer', fontSize: '0.9rem' }}
                                title="Mover Arriba-Derecha"
                              >↗️</button>
                            </div>

                            {/* Fila 2 */}
                            <div style={{ display: 'flex', gap: '0.35rem' }}>
                              <button
                                onClick={() => handleCameraControl(cam, 'ptz_left')}
                                disabled={isControlling}
                                style={{ width: '48px', height: '34px', borderRadius: '6px', background: '#0284c7', border: '1px solid #38bdf8', color: '#fff', cursor: 'pointer', fontSize: '1rem', fontWeight: 'bold' }}
                                title="Girar Izquierda (Pan Left)"
                              >⬅️</button>
                              <button
                                onClick={() => handleCameraControl(cam, 'ptz_center')}
                                disabled={isControlling}
                                style={{ width: '38px', height: '34px', borderRadius: '6px', background: 'rgba(234, 179, 8, 0.25)', border: '1px solid #eab308', color: '#fef08a', cursor: 'pointer', fontSize: '0.95rem' }}
                                title="Centrar Posición Home (0°, 0°)"
                              >🎯</button>
                              <button
                                onClick={() => handleCameraControl(cam, 'ptz_right')}
                                disabled={isControlling}
                                style={{ width: '48px', height: '34px', borderRadius: '6px', background: '#0284c7', border: '1px solid #38bdf8', color: '#fff', cursor: 'pointer', fontSize: '1rem', fontWeight: 'bold' }}
                                title="Girar Derecha (Pan Right)"
                              >➡️</button>
                            </div>

                            {/* Fila 3 */}
                            <div style={{ display: 'flex', gap: '0.35rem' }}>
                              <button
                                onClick={() => handleCameraControl(cam, 'ptz_downleft')}
                                disabled={isControlling}
                                style={{ width: '38px', height: '34px', borderRadius: '6px', background: 'rgba(30,41,59,0.7)', border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8', cursor: 'pointer', fontSize: '0.9rem' }}
                                title="Mover Abajo-Izquierda"
                              >↙️</button>
                              <button
                                onClick={() => handleCameraControl(cam, 'ptz_down')}
                                disabled={isControlling}
                                style={{ width: '48px', height: '34px', borderRadius: '6px', background: '#0284c7', border: '1px solid #38bdf8', color: '#fff', cursor: 'pointer', fontSize: '1rem', fontWeight: 'bold' }}
                                title="Inclinar Abajo (Tilt Down)"
                              >⬇️</button>
                              <button
                                onClick={() => handleCameraControl(cam, 'ptz_downright')}
                                disabled={isControlling}
                                style={{ width: '38px', height: '34px', borderRadius: '6px', background: 'rgba(30,41,59,0.7)', border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8', cursor: 'pointer', fontSize: '0.9rem' }}
                                title="Mover Abajo-Derecha"
                              >↘️</button>
                            </div>
                          </div>

                          {/* Zoom Rápido y Auto-Patrullaje 360 */}
                          <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                            <button
                              onClick={() => handleCameraControl(cam, 'zoom_out')}
                              disabled={isControlling}
                              className="btn btn-secondary"
                              style={{ flex: 1, padding: '0.35rem 0.5rem', fontSize: '0.72rem', fontWeight: '700' }}
                              title="Alejar Zoom (-10%)"
                            >
                              ➖ Alejar
                            </button>
                            <button
                              onClick={() => handleCameraControl(cam, 'zoom_in')}
                              disabled={isControlling}
                              className="btn btn-secondary"
                              style={{ flex: 1, padding: '0.35rem 0.5rem', fontSize: '0.72rem', fontWeight: '700' }}
                              title="Acercar Zoom (+10%)"
                            >
                              ➕ Acercar
                            </button>
                            <button
                              onClick={() => handleCameraControl(cam, 'ptz_patrol')}
                              disabled={isControlling}
                              style={{
                                flex: 1.3,
                                padding: '0.35rem 0.5rem',
                                fontSize: '0.72rem',
                                fontWeight: '800',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                background: ctrlState.patrol ? 'rgba(34, 197, 94, 0.25)' : 'rgba(255, 255, 255, 0.08)',
                                border: ctrlState.patrol ? '1px solid #22c55e' : '1px solid rgba(255, 255, 255, 0.15)',
                                color: ctrlState.patrol ? '#4ade80' : '#cbd5e1'
                              }}
                              title="Ronda automática continua horizontal 360°"
                            >
                              {ctrlState.patrol ? '🟢 Patrullando' : '🔄 Patrullaje 360°'}
                            </button>
                          </div>
                        </div>
                      ) : (
                        /* CONTENIDO SUB-PESTAÑA 2: HERRAMIENTAS DE HARDWARE */
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem' }}>
                            {/* 1. Linterna / Flash */}
                            <button
                              onClick={() => handleCameraControl(cam, ctrlState.torch ? 'torch_off' : 'torch_on')}
                              disabled={isControlling}
                              className="btn btn-secondary"
                              style={{
                                padding: '0.5rem 0.25rem',
                                fontSize: '0.75rem',
                                fontWeight: '700',
                                background: ctrlState.torch ? 'rgba(234, 179, 8, 0.25)' : 'rgba(255, 255, 255, 0.05)',
                                borderColor: ctrlState.torch ? '#eab308' : 'rgba(255, 255, 255, 0.1)',
                                color: ctrlState.torch ? '#fef08a' : '#fff',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                gap: '0.2rem'
                              }}
                              title="Encender o apagar la linterna"
                            >
                              <span style={{ fontSize: '1.1rem' }}>💡</span>
                              <span>{ctrlState.torch ? 'Flash ON' : 'Flash OFF'}</span>
                            </button>

                            {/* 2. Auto-Focus */}
                            <button
                              onClick={() => handleCameraControl(cam, 'focus')}
                              disabled={isControlling}
                              className="btn btn-secondary"
                              style={{
                                padding: '0.5rem 0.25rem',
                                fontSize: '0.75rem',
                                fontWeight: '700',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                gap: '0.2rem'
                              }}
                              title="Forzar enfoque automático"
                            >
                              <span style={{ fontSize: '1.1rem' }}>🎯</span>
                              <span>Enfocar</span>
                            </button>

                            {/* 3. Cambiar Cámara Frontal / Trasera */}
                            <button
                              onClick={() => handleCameraControl(cam, 'switch_camera', { cameraFacing: ctrlState.facing === 'front' ? 'back' : 'front' })}
                              disabled={isControlling}
                              className="btn btn-secondary"
                              style={{
                                padding: '0.5rem 0.25rem',
                                fontSize: '0.75rem',
                                fontWeight: '700',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                gap: '0.2rem'
                              }}
                              title="Alternar entre cámara frontal y trasera"
                            >
                              <span style={{ fontSize: '1.1rem' }}>🔄</span>
                              <span>{ctrlState.facing === 'front' ? 'Trasera' : 'Frontal'}</span>
                            </button>

                            {/* 4. Capturar Foto HD */}
                            <button
                              onClick={() => handleCameraControl(cam, 'capture')}
                              disabled={isControlling}
                              className="btn btn-secondary"
                              style={{
                                padding: '0.5rem 0.25rem',
                                fontSize: '0.75rem',
                                fontWeight: '700',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                gap: '0.2rem'
                              }}
                              title="Descargar foto en alta definición directamente"
                            >
                              <span style={{ fontSize: '1.1rem' }}>📸</span>
                              <span>Capturar</span>
                            </button>
                          </div>

                          {/* Presets de Zoom */}
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '0.5rem',
                            background: 'rgba(0, 0, 0, 0.3)',
                            padding: '0.4rem 0.6rem',
                            borderRadius: '6px'
                          }}>
                            <span style={{ fontSize: '0.75rem', color: '#cbd5e1', fontWeight: '600' }}>
                              🔍 Presets de Zoom:
                            </span>
                            <div style={{ display: 'flex', gap: '0.35rem' }}>
                              {[0, 25, 50, 80].map((zVal) => (
                                <button
                                  key={zVal}
                                  onClick={() => handleCameraControl(cam, 'zoom', { zoomValue: zVal })}
                                  disabled={isControlling}
                                  style={{
                                    background: ctrlState.zoom === zVal ? '#0ea5e9' : 'rgba(255, 255, 255, 0.08)',
                                    color: '#fff',
                                    border: 'none',
                                    borderRadius: '4px',
                                    padding: '0.2rem 0.5rem',
                                    fontSize: '0.72rem',
                                    fontWeight: '700',
                                    cursor: 'pointer'
                                  }}
                                >
                                  {zVal === 0 ? '1x' : `${Math.round(zVal / 25) + 1}x`}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Botón Principal: Disparar Detección Manual con IA */}
                      <button
                        onClick={() => handleTriggerLiveDetection(cam)}
                        className="btn btn-primary"
                        style={{
                          width: '100%',
                          padding: '0.6rem',
                          fontSize: '0.85rem',
                          fontWeight: '700',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.5rem'
                        }}
                      >
                        <span>⚡</span>
                        <span>Escanear Frame Manualmente</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ================= CONTENIDO PESTAÑA: ALERTAS DE MODERACIÓN ================= */}
      {activeTab === 'alertas' && (
        <div className="animate-fade-in">
          {/* Mapa interactivo de alertas */}
          <div style={{ marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1.3rem', marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
              🗺️ Mapa Táctico de Alertas y Detecciones en El Salvador
            </h2>
            <ActiveAlertsMap />
          </div>

          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '1rem',
            flexWrap: 'wrap',
            gap: '0.5rem'
          }}>
            <h2 style={{ fontSize: '1.3rem', margin: 0, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span>📋 Cola de Alertas para Validación</span>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>({alerts.length} registros)</span>
            </h2>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '4rem' }}>
              <div style={{ border: '3px solid rgba(255,255,255,0.1)', borderTop: '3px solid #0ea5e9', borderRadius: '50%', width: '40px', height: '40px', animation: 'spin 1s linear infinite', margin: '0 auto 1rem' }} />
              <p style={{ color: 'var(--text-secondary)' }}>Cargando alertas de moderación...</p>
            </div>
          ) : alerts.length === 0 ? (
            <div className="glass-panel text-center" style={{ padding: '4rem 2rem' }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✓</div>
              <h3>No hay alertas pendientes de revisión</h3>
              <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                Todas las evidencias fotográficas y detecciones han sido procesadas.
              </p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '1.5rem' }}>
              {alerts.map((alerta) => (
                <div
                  key={alerta.id}
                  className="glass-panel card-interactive-lift"
                  style={{
                    padding: '1.25rem',
                    borderRadius: '12px',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between'
                  }}
                >
                  <div>
                    {/* Header de la alerta */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                      <div>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '700' }}>
                          ALERTA #{alerta.id}
                        </span>
                        <h4 style={{ margin: '0.15rem 0 0 0', fontSize: '1.1rem', color: '#fff' }}>
                          {alerta.nombre_desaparecido || 'Persona Desaparecida'}
                        </h4>
                      </div>
                      <span style={{
                        background: 'rgba(245, 158, 11, 0.2)',
                        border: '1px solid rgba(245, 158, 11, 0.4)',
                        color: '#fbbf24',
                        padding: '0.2rem 0.6rem',
                        borderRadius: '20px',
                        fontSize: '0.72rem',
                        fontWeight: '800',
                        textTransform: 'uppercase'
                      }}>
                        {alerta.estado || 'Pendiente'}
                      </span>
                    </div>

                    {/* Foto de Evidencia */}
                    <div
                      style={{
                        position: 'relative',
                        height: '190px',
                        borderRadius: '8px',
                        overflow: 'hidden',
                        background: '#0f172a',
                        marginBottom: '0.75rem',
                        cursor: 'pointer'
                      }}
                      onClick={() => setPreviewImage(getImageUrl(alerta.foto_evidencia_url))}
                      title="Clic para ampliar foto"
                    >
                      <img
                        src={getImageUrl(alerta.foto_evidencia_url)}
                        alt="Evidencia"
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        onError={(e) => {
                          e.target.src = 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=400&q=80';
                        }}
                      />
                      <div style={{
                        position: 'absolute',
                        bottom: '8px',
                        right: '8px',
                        background: 'rgba(0, 0, 0, 0.75)',
                        padding: '0.2rem 0.5rem',
                        borderRadius: '4px',
                        fontSize: '0.72rem',
                        color: '#38bdf8',
                        fontWeight: '700'
                      }}>
                        🔍 Zoom Foto
                      </div>
                    </div>

                    {/* Metadatos */}
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '0.35rem', marginBottom: '1rem' }}>
                      <div>
                        <strong style={{ color: '#e2e8f0' }}>Origen:</strong> {alerta.tipo_origen || 'Avistamiento / Cámara'}
                      </div>
                      <div>
                        <strong style={{ color: '#e2e8f0' }}>Ubicación:</strong> 📍 {alerta.ubicacion_nombre || `${alerta.ubicacion_lat}, ${alerta.ubicacion_lng}`}
                      </div>
                      <div>
                        <strong style={{ color: '#e2e8f0' }}>Confianza:</strong>{' '}
                        <span style={{ color: '#38bdf8', fontWeight: '700' }}>{alerta.porcentaje_confianza || 85}%</span>
                      </div>
                      {alerta.comentarios && (
                        <div style={{ fontStyle: 'italic', background: 'rgba(255,255,255,0.03)', padding: '0.4rem', borderRadius: '4px', marginTop: '0.25rem' }}>
                          "{alerta.comentarios}"
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Botón de Cotejo Forense InsightFace */}
                  <button
                    onClick={() => setBiometricModalAlert(alerta)}
                    style={{
                      width: '100%',
                      marginBottom: '0.65rem',
                      padding: '0.5rem',
                      borderRadius: '6px',
                      background: 'rgba(14, 165, 233, 0.12)',
                      border: '1px solid rgba(56, 189, 248, 0.4)',
                      color: '#38bdf8',
                      fontWeight: 700,
                      fontSize: '0.82rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.45rem',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <span>🔬</span>
                    <span>Cotejo Forense InsightFace</span>
                  </button>

                  {/* Acciones de Moderación */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                    <button
                      onClick={() => handleStatusUpdate(alerta.id, 'confirmado')}
                      disabled={actionLoading === alerta.id}
                      className="btn btn-success"
                      style={{ padding: '0.5rem', fontSize: '0.85rem', fontWeight: '700' }}
                    >
                      {actionLoading === alerta.id ? '...' : '✓ Confirmar'}
                    </button>
                    <button
                      onClick={() => handleStatusUpdate(alerta.id, 'falso positivo')}
                      disabled={actionLoading === alerta.id}
                      className="btn btn-danger"
                      style={{ padding: '0.5rem', fontSize: '0.85rem', fontWeight: '700' }}
                    >
                      {actionLoading === alerta.id ? '...' : '✕ Descartar'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ================= CONTENIDO PESTAÑA: LABORATORIO BIOMÉTRICO INSIGHTFACE ================= */}
      {activeTab === 'biometria' && (
        <BiometricLab cases={cases} alerts={alerts} />
      )}

      {/* ================= MODAL: CONECTAR CÁMARA IP WEBCAM ================= */}
      {showAddCamModal && (
        <div className="modal-overlay animate-fade-in" style={{ zIndex: 12000 }}>
          <div
            className="glass-panel"
            style={{
              maxWidth: '560px',
              width: '100%',
              padding: '2rem',
              background: 'rgba(15, 23, 42, 0.98)',
              border: '1px solid rgba(56, 189, 248, 0.3)',
              borderRadius: '16px',
              boxShadow: '0 25px 60px rgba(0,0,0,0.9)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ fontSize: '1.8rem' }}>📱</span>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#fff' }}>
                    Conectar Cámara IP Webcam
                  </h3>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    Transmisión en vivo desde tu teléfono Android o cámara IP
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowAddCamModal(false)}
                className="btn btn-secondary"
                style={{ padding: '0.35rem 0.75rem' }}
              >
                ✕
              </button>
            </div>

            {/* Tip de Conexión de Cámaras */}
            <div style={{
              background: 'rgba(14, 165, 233, 0.1)',
              border: '1px solid rgba(14, 165, 233, 0.3)',
              borderRadius: '8px',
              padding: '0.75rem 1rem',
              fontSize: '0.82rem',
              color: '#93c5fd',
              marginBottom: '1.25rem',
              lineHeight: 1.4
            }}>
              💡 <strong>Cámaras Wi-Fi Soportadas:</strong>
              <ul style={{ margin: '0.35rem 0 0 1.25rem', padding: 0 }}>
                <li><strong>Cámaras Robóticas PTZ 360°:</strong> Domos motorizados con control de giro, inclinación y auto-patrullaje.</li>
                <li><strong>Cámaras Fijas Wi-Fi:</strong> Cámaras CCTV de seguridad con zoom digital.</li>
                <li><strong>Teléfonos con IP Webcam:</strong> Utiliza cualquier Android como cámara de vigilancia táctica.</li>
              </ul>
            </div>

            <form onSubmit={handleCreateCamera}>
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label className="form-label">Tipo de Cámara / Perfil de Movimiento</label>
                <select
                  className="form-control"
                  value={newCamForm.tipo}
                  onChange={(e) => {
                    const sel = e.target.value;
                    let placeholderName = newCamForm.nombre;
                    if (sel.includes('PTZ')) placeholderName = 'Cámara Robótica PTZ Wi-Fi 01';
                    else if (sel.includes('Fija')) placeholderName = 'Cámara Fija Wi-Fi 01';
                    else placeholderName = 'Cámara Móvil IP Webcam';
                    setNewCamForm({ ...newCamForm, tipo: sel, nombre: placeholderName });
                  }}
                >
                  <option value="Cámara IP Wi-Fi PTZ 360° (Robótica / Domo)">🤖 Cámara IP Wi-Fi PTZ 360° (Robótica / Domo Motorizado)</option>
                  <option value="Cámara IP Wi-Fi Fija (CCTV Seguridad)">📹 Cámara IP Wi-Fi Fija (CCTV Seguridad)</option>
                  <option value="Cámara Móvil IP Webcam (Android)">📱 Cámara Móvil IP Webcam (Android)</option>
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label className="form-label">Nombre Identificador de la Cámara</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Ej. Cámara Robótica Domo Norte"
                  value={newCamForm.nombre}
                  onChange={(e) => setNewCamForm({ ...newCamForm, nombre: e.target.value })}
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Dirección IP de la Cámara (App IP Webcam)</span>
                  <span style={{ color: '#38bdf8', fontSize: '0.75rem' }}>Puerto estándar :8080</span>
                </label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Ej. 192.168.1.50:8080"
                    value={newCamForm.ip_address}
                    onChange={(e) => setNewCamForm({ ...newCamForm, ip_address: e.target.value })}
                    required
                  />
                  <button
                    type="button"
                    onClick={handleTestIpConnection}
                    className="btn btn-secondary"
                    style={{ whiteSpace: 'nowrap', fontSize: '0.8rem', padding: '0.5rem 0.9rem' }}
                  >
                    🔍 Probar
                  </button>
                </div>
                {ipTestStatus && (
                  <p style={{ margin: '0.35rem 0 0 0', fontSize: '0.78rem', color: ipTestStatus.includes('✓') ? '#4ade80' : '#f59e0b' }}>
                    {ipTestStatus}
                  </p>
                )}
              </div>

              <div className="meta-grid" style={{ marginBottom: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Departamento (El Salvador)</label>
                  <select
                    className="form-control"
                    value={newCamForm.departamento}
                    onChange={(e) => setNewCamForm({ ...newCamForm, departamento: e.target.value, ubicacion: `${e.target.value}, El Salvador` })}
                  >
                    {DEPARTAMENTOS_SV.map((dep) => (
                      <option key={dep} value={dep}>{dep}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Punto de Cobertura / Sector</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Ej. San Salvador Centro"
                    value={newCamForm.ubicacion}
                    onChange={(e) => setNewCamForm({ ...newCamForm, ubicacion: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
                <button
                  type="button"
                  onClick={() => setShowAddCamModal(false)}
                  className="btn btn-secondary"
                  disabled={camSubmitting}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={camSubmitting}
                  style={{ fontWeight: '700' }}
                >
                  {camSubmitting ? 'Conectando...' : '✓ Vincular Cámara al Sistema'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: PANTALLA COMPLETA CCTV HUD ================= */}
      {expandedCamera && (
        <div className="modal-overlay animate-fade-in" style={{ zIndex: 12500 }}>
          <div
            className="glass-panel"
            style={{
              maxWidth: '900px',
              width: '95%',
              background: 'rgba(2, 6, 23, 0.98)',
              border: '2px solid rgba(56, 189, 248, 0.5)',
              borderRadius: '16px',
              overflow: 'hidden',
              boxShadow: '0 25px 60px rgba(0,0,0,0.95)'
            }}
          >
            {/* Header HUD */}
            <div style={{
              padding: '0.75rem 1.25rem',
              background: 'rgba(15, 23, 42, 0.9)',
              borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#ef4444', animation: 'ping 1.5s infinite' }} />
                <h3 style={{ margin: 0, color: '#fff', fontSize: '1.15rem' }}>
                  {expandedCamera.nombre}
                </h3>
                <span style={{ fontSize: '0.75rem', color: '#38bdf8', fontFamily: 'monospace' }}>
                  [{expandedCamera.ip_address || 'STREAM EN VIVO'}]
                </span>
              </div>
              <button
                onClick={() => setExpandedCamera(null)}
                className="btn btn-secondary"
                style={{ padding: '0.35rem 0.75rem' }}
              >
                ✕ Salir de Pantalla Completa
              </button>
            </div>

            {/* Video grande */}
            <div style={{ position: 'relative', height: '520px', background: '#000' }}>
              <img
                src={`http://localhost:3001/api/camaras/${expandedCamera.id}/stream`}
                alt={expandedCamera.nombre}
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                onError={(e) => {
                  const direct = expandedCamera.stream_url || `${expandedCamera.base_url}/video`;
                  if (direct && e.currentTarget.src !== direct) {
                    e.currentTarget.src = direct;
                  } else {
                    e.target.onerror = null;
                    e.target.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="640" height="480" viewBox="0 0 640 480"><rect width="640" height="480" fill="%23020617"/><text x="50%" y="45%" fill="%23ef4444" font-family="sans-serif" font-size="24" font-weight="bold" text-anchor="middle">⚠️ SEÑAL NO DISPONIBLE</text><text x="50%" y="55%" fill="%2394a3b8" font-family="monospace" font-size="16" text-anchor="middle">Verifique conexión IP Webcam</text></svg>';
                  }
                }}
              />

              {/* HUD Retícula de Monitoreo */}
              <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: '120px',
                height: '120px',
                border: '1px dashed rgba(56, 189, 248, 0.4)',
                borderRadius: '50%',
                pointerEvents: 'none'
              }} />

              {/* Consola Flotante de Movimiento PTZ 360 en Pantalla Completa (Solo para cámaras robóticas con PTZ) */}
              {isPtzCapable(expandedCamera) && (
                <div style={{
                  position: 'absolute',
                  top: '15px',
                  right: '15px',
                  background: 'rgba(15, 23, 42, 0.88)',
                  backdropFilter: 'blur(8px)',
                  padding: '0.65rem 0.8rem',
                  borderRadius: '12px',
                  border: '1px solid rgba(56, 189, 248, 0.35)',
                  boxShadow: '0 8px 30px rgba(0,0,0,0.8)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '0.4rem',
                  zIndex: 20
                }}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    width: '100%',
                    fontSize: '0.72rem',
                    fontWeight: '800',
                    color: '#38bdf8',
                    borderBottom: '1px solid rgba(255,255,255,0.1)',
                    paddingBottom: '0.25rem',
                    gap: '0.5rem'
                  }}>
                    <span>🕹️ MOVIMIENTO PTZ</span>
                    <span style={{ fontSize: '0.65rem', color: '#a855f7', fontFamily: 'monospace' }}>
                      {camControlsState[expandedCamera.id]?.pan || 0}° / {camControlsState[expandedCamera.id]?.tilt || 0}°
                    </span>
                  </div>

                  {/* Cruceta Direccional */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 36px)', gap: '4px' }}>
                    <button onClick={() => handleCameraControl(expandedCamera, 'ptz_upleft')} style={{ width: '36px', height: '32px', borderRadius: '6px', background: 'rgba(30,41,59,0.75)', border: '1px solid rgba(255,255,255,0.12)', color: '#cbd5e1', cursor: 'pointer', fontSize: '0.85rem' }} title="Arriba-Izquierda">↖️</button>
                    <button onClick={() => handleCameraControl(expandedCamera, 'ptz_up')} style={{ width: '36px', height: '32px', borderRadius: '6px', background: '#0284c7', border: '1px solid #38bdf8', color: '#fff', cursor: 'pointer', fontSize: '0.95rem', fontWeight: 'bold' }} title="Inclinar Arriba">⬆️</button>
                    <button onClick={() => handleCameraControl(expandedCamera, 'ptz_upright')} style={{ width: '36px', height: '32px', borderRadius: '6px', background: 'rgba(30,41,59,0.75)', border: '1px solid rgba(255,255,255,0.12)', color: '#cbd5e1', cursor: 'pointer', fontSize: '0.85rem' }} title="Arriba-Derecha">↗️</button>

                    <button onClick={() => handleCameraControl(expandedCamera, 'ptz_left')} style={{ width: '36px', height: '32px', borderRadius: '6px', background: '#0284c7', border: '1px solid #38bdf8', color: '#fff', cursor: 'pointer', fontSize: '0.95rem', fontWeight: 'bold' }} title="Girar Izquierda">⬅️</button>
                    <button onClick={() => handleCameraControl(expandedCamera, 'ptz_center')} style={{ width: '36px', height: '32px', borderRadius: '6px', background: 'rgba(234,179,8,0.3)', border: '1px solid #eab308', color: '#fef08a', cursor: 'pointer', fontSize: '0.9rem' }} title="Centrar Posición">🎯</button>
                    <button onClick={() => handleCameraControl(expandedCamera, 'ptz_right')} style={{ width: '36px', height: '32px', borderRadius: '6px', background: '#0284c7', border: '1px solid #38bdf8', color: '#fff', cursor: 'pointer', fontSize: '0.95rem', fontWeight: 'bold' }} title="Girar Derecha">➡️</button>

                    <button onClick={() => handleCameraControl(expandedCamera, 'ptz_downleft')} style={{ width: '36px', height: '32px', borderRadius: '6px', background: 'rgba(30,41,59,0.75)', border: '1px solid rgba(255,255,255,0.12)', color: '#cbd5e1', cursor: 'pointer', fontSize: '0.85rem' }} title="Abajo-Izquierda">↙️</button>
                    <button onClick={() => handleCameraControl(expandedCamera, 'ptz_down')} style={{ width: '36px', height: '32px', borderRadius: '6px', background: '#0284c7', border: '1px solid #38bdf8', color: '#fff', cursor: 'pointer', fontSize: '0.95rem', fontWeight: 'bold' }} title="Inclinar Abajo">⬇️</button>
                    <button onClick={() => handleCameraControl(expandedCamera, 'ptz_downright')} style={{ width: '36px', height: '32px', borderRadius: '6px', background: 'rgba(30,41,59,0.75)', border: '1px solid rgba(255,255,255,0.12)', color: '#cbd5e1', cursor: 'pointer', fontSize: '0.85rem' }} title="Abajo-Derecha">↘️</button>
                  </div>

                  {/* Zoom +/- y Auto-Patrullaje */}
                  <div style={{ display: 'flex', gap: '4px', width: '100%', marginTop: '2px' }}>
                    <button onClick={() => handleCameraControl(expandedCamera, 'zoom_out')} style={{ flex: 1, padding: '0.2rem', borderRadius: '4px', background: 'rgba(30,41,59,0.75)', border: '1px solid rgba(255,255,255,0.12)', color: '#fff', cursor: 'pointer', fontSize: '0.75rem' }} title="Alejar Zoom">➖</button>
                    <button onClick={() => handleCameraControl(expandedCamera, 'zoom_in')} style={{ flex: 1, padding: '0.2rem', borderRadius: '4px', background: 'rgba(30,41,59,0.75)', border: '1px solid rgba(255,255,255,0.12)', color: '#fff', cursor: 'pointer', fontSize: '0.75rem' }} title="Acercar Zoom">➕</button>
                    <button
                      onClick={() => handleCameraControl(expandedCamera, 'ptz_patrol')}
                      style={{
                        flex: 1.5,
                        padding: '0.2rem 0.35rem',
                        fontSize: '0.68rem',
                        fontWeight: '800',
                        borderRadius: '4px',
                        background: camControlsState[expandedCamera.id]?.patrol ? 'rgba(34, 197, 94, 0.35)' : 'rgba(255,255,255,0.08)',
                        border: camControlsState[expandedCamera.id]?.patrol ? '1px solid #22c55e' : '1px solid rgba(255,255,255,0.15)',
                        color: camControlsState[expandedCamera.id]?.patrol ? '#4ade80' : '#cbd5e1',
                        cursor: 'pointer'
                      }}
                      title="Auto-patrullaje continuo 360°"
                    >
                      {camControlsState[expandedCamera.id]?.patrol ? '🟢 360°' : '🔄 360°'}
                    </button>
                  </div>
                </div>
              )}

              <div style={{
                position: 'absolute',
                bottom: '15px',
                left: '15px',
                background: 'rgba(0, 0, 0, 0.8)',
                padding: '0.5rem 1rem',
                borderRadius: '6px',
                fontFamily: 'monospace',
                fontSize: '0.85rem',
                color: '#22c55e'
              }}>
                REC ● {liveClock} | 📍 {expandedCamera.ubicacion} | GPS: [{expandedCamera.lat}, {expandedCamera.lng}]
              </div>

              {/* Botones de Hardware Flotantes en Pantalla Completa */}
              <div style={{
                position: 'absolute',
                bottom: '15px',
                right: '15px',
                display: 'flex',
                gap: '0.5rem'
              }}>
                <button
                  onClick={() => handleCameraControl(expandedCamera, (camControlsState[expandedCamera.id]?.torch) ? 'torch_off' : 'torch_on')}
                  className="btn btn-secondary"
                  style={{ fontSize: '0.85rem', padding: '0.5rem 0.9rem' }}
                >
                  💡 Flash
                </button>
                <button
                  onClick={() => handleCameraControl(expandedCamera, 'focus')}
                  className="btn btn-secondary"
                  style={{ fontSize: '0.85rem', padding: '0.5rem 0.9rem' }}
                >
                  🎯 Enfocar
                </button>
                <button
                  onClick={() => handleCameraControl(expandedCamera, 'capture')}
                  className="btn btn-secondary"
                  style={{ fontSize: '0.85rem', padding: '0.5rem 0.9rem' }}
                >
                  📸 Capturar
                </button>
                <button
                  onClick={() => handleTriggerLiveDetection(expandedCamera)}
                  className="btn btn-primary"
                  style={{ fontSize: '0.85rem', padding: '0.5rem 1rem', fontWeight: '700' }}
                >
                  ⚡ Escaneo IA
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: ZOOM DE IMAGEN DE EVIDENCIA ================= */}
      {previewImage && (
        <div className="modal-overlay animate-fade-in" style={{ zIndex: 13000 }}>
          <div
            className="glass-panel"
            style={{
              maxWidth: '750px',
              width: '90%',
              padding: '1.5rem',
              background: 'rgba(15, 23, 42, 0.98)',
              border: '1px solid rgba(56, 189, 248, 0.3)',
              borderRadius: '16px',
              textAlign: 'center'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0, color: '#fff', fontSize: '1.1rem' }}>
                🔍 Inspección Fotográfica de Evidencia
              </h3>
              <button onClick={() => setPreviewImage(null)} className="btn btn-secondary" style={{ padding: '0.3rem 0.7rem' }}>
                ✕ Cerrar
              </button>
            </div>
            <div style={{ maxHeight: '65vh', overflow: 'hidden', borderRadius: '8px', background: '#000' }}>
              <img
                src={previewImage}
                alt="Evidencia ampliada"
                style={{ width: '100%', maxHeight: '65vh', objectFit: 'contain', display: 'block' }}
              />
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: COTEJO FORENSE BIOMÉTRICO INSIGHTFACE ================= */}
      {biometricModalAlert && (
        <BiometricVerificationModal
          alerta={biometricModalAlert}
          cases={cases}
          onClose={() => setBiometricModalAlert(null)}
          onConfirm={(id) => handleStatusUpdate(id, 'confirmado')}
          onDiscard={(id) => handleStatusUpdate(id, 'falso positivo')}
        />
      )}

      {/* ================= MODAL: EDITAR DIRECCIÓN IP DE CÁMARA ================= */}
      {editingCamera && (
        <div className="modal-overlay animate-fade-in" style={{ zIndex: 14000 }}>
          <div
            className="glass-panel"
            style={{
              maxWidth: '480px',
              width: '92%',
              padding: '2rem',
              background: 'rgba(15, 23, 42, 0.98)',
              border: '1px solid rgba(56, 189, 248, 0.4)',
              borderRadius: '16px',
              boxShadow: '0 25px 60px rgba(0,0,0,0.9)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '1.5rem' }}>✏️</span>
                <div>
                  <h3 style={{ margin: 0, color: '#fff', fontSize: '1.15rem' }}>
                    Actualizar IP de la Cámara
                  </h3>
                  <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                    {editingCamera.nombre}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setEditingCamera(null)}
                className="btn btn-secondary"
                style={{ padding: '0.3rem 0.6rem' }}
              >
                ✕
              </button>
            </div>

            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: '0 0 1.25rem 0', lineHeight: 1.4 }}>
              Si tu teléfono cambió de IP en la red Wi-Fi o reiniciaste la app IP Webcam, escribe la nueva dirección IP que muestra en pantalla:
            </p>

            <form onSubmit={handleSaveEditedIp}>
              <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Dirección IPv4 + Puerto</span>
                  <span style={{ color: '#38bdf8', fontSize: '0.75rem' }}>Ej: 192.168.1.64:8080</span>
                </label>
                <input
                  type="text"
                  className="form-control"
                  value={editIpValue}
                  onChange={(e) => setEditIpValue(e.target.value)}
                  placeholder="192.168.1.XX:8080"
                  required
                  autoFocus
                />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setEditingCamera(null)}
                  className="btn btn-secondary"
                  disabled={editIpSaving}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={editIpSaving}
                  style={{ fontWeight: '700' }}
                >
                  {editIpSaving ? 'Verificando y Guardando...' : '✓ Guardar y Reconectar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: BÚFER FORENSE DE REBOBINADO INSTANTÁNEO (5s) ================= */}
      {rewindCamera && (
        <div className="modal-overlay animate-fade-in" style={{ zIndex: 15000 }}>
          <div
            className="hud-panel corner-hud"
            style={{
              maxWidth: '840px',
              width: '95%',
              padding: '1.75rem',
              background: 'rgba(3, 7, 18, 0.96)',
              border: '1px solid rgba(0, 240, 255, 0.4)',
              borderRadius: '16px',
              boxShadow: '0 25px 80px rgba(0, 0, 0, 0.95), 0 0 35px rgba(0, 240, 255, 0.15)'
            }}
          >
            {/* Encabezado */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', paddingBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <span style={{ fontSize: '1.6rem' }}>⏪</span>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <h3 style={{ margin: 0, color: '#fff', fontSize: '1.2rem', fontFamily: 'monospace' }}>
                      BÚFER FORENSE: REBOBINADO INSTANTÁNEO (-5.0s)
                    </h3>
                    <span className="cyber-badge-cyan">FPS: 30 • 1080p</span>
                  </div>
                  <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                    Cámara: <strong>{rewindCamera.nombre}</strong> (IP: {rewindCamera.ip_address})
                  </span>
                </div>
              </div>
              <button
                onClick={() => {
                  setRewindCamera(null);
                  setRewindAnalysisResult(null);
                }}
                className="btn btn-secondary"
                style={{ padding: '0.35rem 0.75rem' }}
              >
                ✕ Cerrar
              </button>
            </div>

            {/* Pantalla del Reproductor Forense con Scanlines */}
            <div style={{ position: 'relative', height: '360px', background: '#000', borderRadius: '10px', overflow: 'hidden', border: '1px solid rgba(0, 240, 255, 0.3)' }}>
              <img
                src={`http://localhost:3001/api/camaras/${rewindCamera.id}/snapshot?t=${Date.now() - Math.round(rewindOffsetSec * 1000)}`}
                alt="Fotograma Rebobinado"
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              />

              {/* HUD Retícula de Análisis Forense */}
              <div style={{ position: 'absolute', top: 12, left: 12, background: 'rgba(0,0,0,0.85)', padding: '0.2rem 0.6rem', borderRadius: '4px', border: '1px solid #eab308', color: '#fef08a', fontFamily: 'monospace', fontSize: '0.75rem', fontWeight: '800' }}>
                OFFSET TEMPORAL: -{rewindOffsetSec.toFixed(2)}s
              </div>

              <div style={{ position: 'absolute', top: 12, right: 12, background: 'rgba(0,0,0,0.85)', padding: '0.2rem 0.6rem', borderRadius: '4px', border: '1px solid #38bdf8', color: '#38bdf8', fontFamily: 'monospace', fontSize: '0.75rem' }}>
                TIMECODE: {new Date(Date.now() - rewindOffsetSec * 1000).toLocaleTimeString('es-SV', { hour12: false })}
              </div>

              {/* Scanline overlay */}
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.03), rgba(0, 255, 0, 0.01), rgba(0, 0, 255, 0.03))', backgroundSize: '100% 3px, 6px 100%', pointerEvents: 'none' }} />
            </div>

            {/* Barra Scrubber de Tiempo (-5.0s a 0.0s en vivo) */}
            <div style={{ margin: '1.25rem 0 1rem 0', background: 'rgba(15, 23, 42, 0.7)', padding: '0.85rem 1rem', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#94a3b8', fontFamily: 'monospace', marginBottom: '0.4rem' }}>
                <span style={{ color: '#eab308', fontWeight: 'bold' }}>-5.0s (Pasado)</span>
                <span style={{ color: '#38bdf8', fontWeight: 'bold' }}>Posición actual: -{rewindOffsetSec.toFixed(2)}s</span>
                <span style={{ color: '#00ff9d', fontWeight: 'bold' }}>0.0s (En vivo)</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="5.0"
                step="0.1"
                value={rewindOffsetSec}
                onChange={(e) => setRewindOffsetSec(parseFloat(e.target.value))}
                style={{ width: '100%', accentColor: '#00f0ff', cursor: 'pointer' }}
              />

              <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem', marginTop: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => setRewindOffsetSec(prev => Math.min(5.0, prev + 0.5))}
                  className="btn btn-secondary"
                  style={{ padding: '0.3rem 0.75rem', fontSize: '0.75rem' }}
                >
                  ⏮️ -0.5s
                </button>
                <button
                  type="button"
                  onClick={() => setRewindOffsetSec(2.5)}
                  className="btn btn-secondary"
                  style={{ padding: '0.3rem 0.75rem', fontSize: '0.75rem', color: '#38bdf8' }}
                >
                  🎯 Centrar (-2.5s)
                </button>
                <button
                  type="button"
                  onClick={() => setRewindOffsetSec(prev => Math.max(0.1, prev - 0.5))}
                  className="btn btn-secondary"
                  style={{ padding: '0.3rem 0.75rem', fontSize: '0.75rem' }}
                >
                  ⏭️ +0.5s
                </button>
              </div>
            </div>

            {/* Resultado de Análisis Biométrico en el Fotograma */}
            {rewindAnalysisResult && (
              <div style={{
                marginBottom: '1rem',
                padding: '0.75rem 1rem',
                borderRadius: '8px',
                background: rewindAnalysisResult.face_detected ? 'rgba(0, 255, 157, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                border: rewindAnalysisResult.face_detected ? '1px solid #00ff9d' : '1px solid #ef4444',
                color: '#fff',
                fontSize: '0.82rem'
              }}>
                <div style={{ fontWeight: '800', marginBottom: '0.25rem', color: rewindAnalysisResult.face_detected ? '#00ff9d' : '#f87171' }}>
                  {rewindAnalysisResult.face_detected ? '✓ Rostro Humano Identificado en este Fotograma' : '✕ Sin rostros detectados en este fotograma'}
                </div>
                {rewindAnalysisResult.face_detected && (
                  <div style={{ fontSize: '0.75rem', color: '#cbd5e1' }}>
                    Confianza: {rewindAnalysisResult.confidence}% • Calidad: {Math.round(rewindAnalysisResult.quality_score * 100)}% • Pose: Yaw {rewindAnalysisResult.pose?.yaw}°
                  </div>
                )}
              </div>
            )}

            {/* Botones de Acción Forense */}
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={async () => {
                  setRewindAnalyzing(true);
                  try {
                    const snapRes = await api.get(`/camaras/${rewindCamera.id}/snapshot`, { responseType: 'blob' });
                    const file = new File([snapRes.data], `rewind_snap_${Date.now()}.jpg`, { type: 'image/jpeg' });
                    const formData = new FormData();
                    formData.append('foto', file);
                    const bioRes = await api.post('/biometria/scan', formData);
                    setRewindAnalysisResult(bioRes.data);
                  } catch (e) {
                    setRewindAnalysisResult({ face_detected: false, error: 'Error analizando fotograma' });
                  } finally {
                    setRewindAnalyzing(false);
                  }
                }}
                disabled={rewindAnalyzing}
                className="btn btn-secondary"
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#38bdf8', borderColor: '#38bdf8' }}
              >
                <span>🔬</span>
                <span>{rewindAnalyzing ? 'Analizando con IA...' : 'Analizar Biométricamente este Frame'}</span>
              </button>

              <button
                type="button"
                onClick={async () => {
                  await handleCameraControl(rewindCamera, 'capture');
                  setCaptureNotice('✓ Fotograma de rebobinado congelado y guardado como evidencia judicial.');
                  setTimeout(() => setCaptureNotice(''), 4000);
                }}
                className="btn btn-primary"
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: '800' }}
              >
                <span>📸</span>
                <span>Guardar Fotograma como Evidencia</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ModeratorPanel;
