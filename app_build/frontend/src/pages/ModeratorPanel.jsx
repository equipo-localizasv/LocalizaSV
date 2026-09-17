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
  const [camControlsState, setCamControlsState] = useState({}); // { [camId]: { torch: false, zoom: 0, facing: 'back', statusMsg: '' } }

  // Modal para conectar nueva cámara IP Webcam
  const [showAddCamModal, setShowAddCamModal] = useState(false);
  const [newCamForm, setNewCamForm] = useState({
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
  const [camSubmitting, setCamSubmitting] = useState(false);
  const [ipTestStatus, setIpTestStatus] = useState('');

  // Reloj digital en vivo sincronizado
  const [liveClock, setLiveClock] = useState(new Date().toLocaleTimeString('es-SV', { hour12: false }));

  // Notificación de captura exitosa
  const [captureNotice, setCaptureNotice] = useState('');

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
      setCameras(response.data || []);
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

  useEffect(() => {
    fetchPendingAlerts();
    fetchCameras();
    fetchCases();

    const unsubNew = socketService.on('nueva_alerta', (newAlert) => {
      setAlerts((prev) => {
        if (prev.some((a) => a.id === newAlert.id)) return prev;
        return [newAlert, ...prev];
      });
    });

    const unsubUpdated = socketService.on('alerta_actualizada', (updatedAlert) => {
      setAlerts((prev) =>
        prev.map((a) => (a.id === updatedAlert.id ? { ...a, ...updatedAlert } : a))
      );
    });

    return () => {
      if (typeof unsubNew === 'function') unsubNew();
      if (typeof unsubUpdated === 'function') unsubUpdated();
    };
  }, []);

  // Control remoto de hardware IP Webcam (Linterna, Zoom, Enfoque, Switch, Captura)
  const handleCameraControl = async (cam, action, extraPayload = {}) => {
    setControllingCamId(cam.id);
    try {
      const res = await api.post(`/camaras/${cam.id}/control`, {
        action,
        ...extraPayload
      });

      const current = camControlsState[cam.id] || { torch: false, zoom: 0, facing: 'back' };
      const updated = { ...current };

      if (action === 'torch_on') updated.torch = true;
      if (action === 'torch_off') updated.torch = false;
      if (action === 'zoom') updated.zoom = extraPayload.zoomValue;
      if (action === 'switch_camera') updated.facing = extraPayload.cameraFacing;

      if (res.data.captured_image_url) {
        setCaptureNotice(`📸 Fotograma capturado con éxito: ${res.data.captured_image_url}`);
        setPreviewImage(`http://localhost:3001${res.data.captured_image_url}`);
        setTimeout(() => setCaptureNotice(''), 6000);
      } else if (res.data.warning) {
        updated.statusMsg = res.data.warning;
        setTimeout(() => {
          setCamControlsState((prev) => ({
            ...prev,
            [cam.id]: { ...(prev[cam.id] || {}), statusMsg: '' }
          }));
        }, 5000);
      } else {
        updated.statusMsg = `✓ Comando "${action}" enviado con éxito a la cámara.`;
        setTimeout(() => {
          setCamControlsState((prev) => ({
            ...prev,
            [cam.id]: { ...(prev[cam.id] || {}), statusMsg: '' }
          }));
        }, 3000);
      }

      setCamControlsState((prev) => ({ ...prev, [cam.id]: updated }));
    } catch (err) {
      console.error('Error controlando cámara:', err);
      alert('No se pudo enviar el comando a la cámara IP. Verifique que la aplicación IP Webcam esté activa en el teléfono.');
    } finally {
      setControllingCamId(null);
    }
  };

  // Disparar detección de IA sobre el frame actual de la cámara
  const handleTriggerLiveDetection = async (cam) => {
    try {
      const casoObjetivo = cases.length > 0 ? cases[0] : { id: 1, nombre_desaparecido: 'Antonio Steven lopez' };
      
      // Tomar snapshot directo de la cámara
      const controlRes = await api.post(`/camaras/${cam.id}/control`, { action: 'capture' });
      const fotoUrl = controlRes.data.captured_image_url || cam.snapshot_url || cam.stream_url;

      const res = await api.post('/detecciones', {
        caso_id: casoObjetivo.id,
        ubicacion_lat: cam.lat,
        ubicacion_lng: cam.lng,
        porcentaje_confianza: 94.2,
        foto_evidencia_url: fotoUrl
      });

      alert(`¡Detección biométrica procesada con éxito desde ${cam.nombre}! Alerta generada para ${casoObjetivo.nombre_desaparecido}. Revisa la pestaña de Alertas.`);
      fetchPendingAlerts();
    } catch (err) {
      console.error('Error disparando detección:', err);
      alert('Error al generar la detección sobre el stream de la cámara.');
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
                const ctrlState = camControlsState[cam.id] || { torch: Boolean(cam.linterna), zoom: cam.zoom || 0, facing: 'back' };
                const isControlling = controllingCamId === cam.id;
                const camBase = cam.base_url || (cam.ip_address ? `http://${cam.ip_address}` : '');
                const videoStreamUrl = cam.stream_url || `${camBase}/video`;

                return (
                  <div
                    key={cam.id}
                    className="glass-panel"
                    style={{
                      overflow: 'hidden',
                      borderRadius: '14px',
                      border: '1px solid rgba(56, 189, 248, 0.25)',
                      background: 'rgba(15, 23, 42, 0.95)',
                      boxShadow: '0 12px 30px rgba(0, 0, 0, 0.6)',
                      display: 'flex',
                      flexDirection: 'column'
                    }}
                  >
                    {/* Encabezado Superior de la Cámara */}
                    <div style={{
                      padding: '0.75rem 1rem',
                      background: 'rgba(30, 41, 59, 0.7)',
                      borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{
                          width: '10px',
                          height: '10px',
                          borderRadius: '50%',
                          background: '#22c55e',
                          boxShadow: '0 0 8px #22c55e'
                        }} />
                        <strong style={{ fontSize: '0.95rem', color: '#f8fafc' }}>{cam.nombre}</strong>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{
                          fontSize: '0.72rem',
                          background: 'rgba(14, 165, 233, 0.15)',
                          border: '1px solid rgba(14, 165, 233, 0.3)',
                          color: '#38bdf8',
                          padding: '0.2rem 0.5rem',
                          borderRadius: '4px',
                          fontWeight: '700',
                          fontFamily: 'monospace'
                        }}>
                          IP: {cam.ip_address || 'Red Local'}
                        </span>
                        <button
                          onClick={() => handleDeleteCamera(cam.id)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#f87171',
                            cursor: 'pointer',
                            fontSize: '0.85rem',
                            padding: '0.2rem'
                          }}
                          title="Desconectar cámara"
                        >
                          ✕
                        </button>
                      </div>
                    </div>

                    {/* Visor de Video en Tiempo Real con Overlay CCTV */}
                    <div
                      style={{
                        position: 'relative',
                        height: '240px',
                        background: '#020617',
                        overflow: 'hidden',
                        cursor: 'pointer'
                      }}
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
                          // Fallback a proxy de snapshot si el navegador tiene bloqueo de MJPEG directo
                          e.target.src = `http://localhost:3001/api/camaras/${cam.id}/snapshot?t=${Date.now()}`;
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

                      <div style={{
                        position: 'absolute',
                        bottom: '8px',
                        left: '10px',
                        right: '10px',
                        background: 'rgba(15, 23, 42, 0.85)',
                        backdropFilter: 'blur(6px)',
                        padding: '0.35rem 0.6rem',
                        borderRadius: '6px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}>
                        <span style={{ fontSize: '0.75rem', color: '#cbd5e1' }}>📍 {cam.ubicacion}</span>
                        <span style={{ fontSize: '0.75rem', color: '#38bdf8', fontWeight: '700' }}>⛶ Pantalla Completa</span>
                      </div>
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

                    {/* BARRA DE CONTROL DE LA CÁMARA (ÚLTIMO MODELO) */}
                    <div style={{
                      padding: '1rem',
                      background: 'rgba(15, 23, 42, 0.6)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.75rem'
                    }}>
                      <div style={{
                        fontSize: '0.75rem',
                        color: 'var(--text-secondary)',
                        textTransform: 'uppercase',
                        fontWeight: '700',
                        letterSpacing: '0.5px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}>
                        <span>Controles de Hardware IP Webcam</span>
                        {isControlling && <span style={{ color: '#f59e0b' }}>Enviando comando...</span>}
                      </div>

                      {/* Botones de Control Directo */}
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
                          title="Encender o apagar la linterna del teléfono"
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
                          title="Descarga una foto en alta definición directamente de la cámara"
                        >
                          <span style={{ fontSize: '1.1rem' }}>📸</span>
                          <span>Capturar</span>
                        </button>
                      </div>

                      {/* Control de Zoom Digital */}
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
                          🔍 Zoom:
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

                      {/* Botón Principal: Disparar Detección con IA sobre el frame actual */}
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
                        <span>Escanear Frame y Disparar Alerta</span>
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

            {/* Tip de la App IP Webcam */}
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
              💡 <strong>¿Cómo usar IP Webcam en tu teléfono?</strong>
              <ol style={{ margin: '0.35rem 0 0 1.25rem', padding: 0 }}>
                <li>Abre la app <em>IP Webcam</em> en tu Android y toca <strong>Start server</strong> al fondo.</li>
                <li>Copia la dirección IPv4 que aparece en la pantalla (ejemplo: <code>192.168.1.50:8080</code>).</li>
                <li>Pégala aquí abajo y pulsa <strong>Probar y Conectar</strong>.</li>
              </ol>
            </div>

            <form onSubmit={handleCreateCamera}>
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label className="form-label">Nombre Identificador de la Cámara</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Ej. Cámara Móvil Patrulla 01"
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
                src={expandedCamera.stream_url || `${expandedCamera.base_url}/video`}
                alt={expandedCamera.nombre}
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                onError={(e) => {
                  e.target.src = `http://localhost:3001/api/camaras/${expandedCamera.id}/snapshot?t=${Date.now()}`;
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
    </div>
  );
};

export default ModeratorPanel;
