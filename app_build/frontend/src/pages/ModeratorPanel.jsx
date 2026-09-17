import React, { useState, useEffect } from 'react';
import api from '../services/api';
import socketService from '../services/socket';
import ActiveAlertsMap from '../components/ActiveAlertsMap';

const ModeratorPanel = () => {
  const [activeTab, setActiveTab] = useState('alertas'); // 'alertas' | 'camaras'
  const [alerts, setAlerts] = useState([]);
  const [cameras, setCameras] = useState([]);
  const [loading, setLoading] = useState(true);
  const [camerasLoading, setCamerasLoading] = useState(false);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(null);
  const [selectedMarker, setSelectedMarker] = useState(null);
  const [previewImage, setPreviewImage] = useState(null); // Modal de imagen ampliada
  const [expandedCamera, setExpandedCamera] = useState(null); // Modal de cámara en vivo ampliada

  // Modal para agregar nueva cámara
  const [showAddCamModal, setShowAddCamModal] = useState(false);
  const [newCamForm, setNewCamForm] = useState({
    nombre: '',
    ubicacion: '',
    lat: '13.6929',
    lng: '-89.2182',
    stream_url: '',
    tipo: 'Cámara de Seguridad Urbana',
    resolucion: '1080p FHD',
    fps: '30'
  });
  const [camSubmitting, setCamSubmitting] = useState(false);

  // Reloj en tiempo real para simular monitoreo CCTV
  const [liveClock, setLiveClock] = useState(new Date().toLocaleTimeString('es-SV'));

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
      setAlerts(response.data);
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
      setCameras(response.data);
    } catch (err) {
      console.error('Error fetching cameras:', err);
    } finally {
      setCamerasLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingAlerts();
    fetchCameras();

    // Escuchar 'nueva_alerta' en tiempo real
    const unsubNew = socketService.on('nueva_alerta', (newAlert) => {
      console.log('🚨 [ModeratorPanel] "nueva_alerta" recibida:', newAlert);
      setAlerts((prevAlerts) => {
        const exists = prevAlerts.some((a) => a.id === newAlert.id);
        if (exists) return prevAlerts;
        return [newAlert, ...prevAlerts];
      });
    });

    // Escuchar 'alerta_actualizada'
    const unsubUpdated = socketService.on('alerta_actualizada', (updatedAlert) => {
      console.log('🔄 [ModeratorPanel] "alerta_actualizada" recibida:', updatedAlert);
      setAlerts((prevAlerts) => {
        const exists = prevAlerts.some((a) => a.id === updatedAlert.id);
        if (exists) {
          return prevAlerts.map((alert) =>
            alert.id === updatedAlert.id ? { ...alert, ...updatedAlert } : alert
          );
        } else {
          return [updatedAlert, ...prevAlerts];
        }
      });
    });

    return () => {
      unsubNew();
      unsubUpdated();
    };
  }, []);

  const handleStatusUpdate = async (id, newStatus) => {
    setError('');
    setActionLoading(id);
    try {
      await api.put(`/alertas/${id}`, { estado: newStatus });
      setAlerts((prevAlerts) =>
        prevAlerts.map((alert) => (alert.id === id ? { ...alert, estado: newStatus } : alert))
      );
    } catch (err) {
      console.error(`Error updating alert ${id} to ${newStatus}:`, err);
      setError(err.response?.data?.error || 'No se pudo actualizar el estado de la alerta.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleCreateCamera = async (e) => {
    e.preventDefault();
    if (!newCamForm.nombre || !newCamForm.stream_url) return;

    setCamSubmitting(true);
    try {
      const res = await api.post('/camaras', newCamForm);
      setCameras((prev) => [...prev, res.data.camara]);
      setShowAddCamModal(false);
      setNewCamForm({
        nombre: '',
        ubicacion: '',
        lat: '13.6929',
        lng: '-89.2182',
        stream_url: '',
        tipo: 'Cámara de Seguridad Urbana',
        resolucion: '1080p FHD',
        fps: '30'
      });
    } catch (err) {
      console.error('Error al agregar cámara:', err);
      alert(err.response?.data?.error || 'No se pudo conectar la cámara.');
    } finally {
      setCamSubmitting(false);
    }
  };

  const handleDeleteCamera = async (camId) => {
    if (!window.confirm('¿Deseas desconectar esta cámara del centro de monitoreo?')) return;
    try {
      await api.delete(`/camaras/${camId}`);
      setCameras((prev) => prev.filter((c) => c.id !== camId));
    } catch (err) {
      console.error('Error al desconectar cámara:', err);
      alert('No se pudo desconectar la cámara.');
    }
  };

  const handleTriggerTestDetection = async (cam) => {
    try {
      const res = await api.post('/detecciones', {
        caso_id: 1,
        ubicacion_lat: cam.lat,
        ubicacion_lng: cam.lng,
        porcentaje_confianza: 93.5,
        foto_evidencia_url: cam.stream_url
      });
      alert(`¡Alerta generada con éxito desde ${cam.nombre}! Revisa la pestaña de Alertas.`);
    } catch (err) {
      console.error('Error disparando alerta:', err);
      alert('Error al generar detección de prueba.');
    }
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

  const getMarkerPosition = (lat, lng) => {
    const minLat = 13.15;
    const maxLat = 14.45;
    const minLng = -90.15;
    const maxLng = -87.70;

    const x = Math.max(8, Math.min(92, ((lng - minLng) / (maxLng - minLng)) * 84 + 8));
    const y = Math.max(8, Math.min(92, ((maxLat - lat) / (maxLat - minLat)) * 84 + 8));
    return { left: `${x.toFixed(2)}%`, top: `${y.toFixed(2)}%` };
  };

  const getMarkerColor = (estado) => {
    switch (estado?.toLowerCase()) {
      case 'confirmado':
        return '#10b981';
      case 'falso positivo':
      case 'descartado':
        return '#f43f5e';
      default:
        return '#0ea5e9';
    }
  };

  const pendingAlertsCount = alerts.filter(a => !a.estado || a.estado === 'pendiente').length;

  return (
    <div className="animate-fade-in">
      {/* Encabezado Principal */}
      <div className="dashboard-header">
        <div>
          <h1 style={{ fontSize: '2.25rem', marginBottom: '0.25rem' }}>Centro de Operaciones y Moderación</h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            Supervisión táctica, validación de avistamientos ciudadanos y monitoreo en vivo de cámaras IP y drones
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <span
            className="status-badge"
            style={{
              backgroundColor: socketService.isConnected() ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
              color: socketService.isConnected() ? '#10b981' : '#ef4444',
              border: `1px solid ${socketService.isConnected() ? '#10b981' : '#ef4444'}`
            }}
          >
            {socketService.isConnected() ? '🟢 Servidor WebSocket En Vivo' : '🔴 WebSocket Desconectado'}
          </span>
          <button
            onClick={() => {
              fetchPendingAlerts();
              fetchCameras();
            }}
            className="btn btn-secondary"
            disabled={loading || camerasLoading}
          >
            🔄 Actualizar
          </button>
        </div>
      </div>

      {error && <div className="auth-error text-center mb-4">{error}</div>}

      {/* Selector de Pestañas Principales */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.75rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.75rem' }}>
        <button
          onClick={() => setActiveTab('alertas')}
          style={{
            background: 'none',
            border: 'none',
            color: activeTab === 'alertas' ? '#0ea5e9' : '#94a3b8',
            fontSize: '1.05rem',
            fontWeight: 700,
            padding: '0.5rem 1rem',
            cursor: 'pointer',
            borderBottom: activeTab === 'alertas' ? '2px solid #0ea5e9' : '2px solid transparent',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            transition: 'all 0.2s'
          }}
        >
          <span>🚨 Alertas de Moderación</span>
          {pendingAlertsCount > 0 && (
            <span style={{
              background: '#ef4444',
              color: '#fff',
              fontSize: '0.75rem',
              padding: '0.15rem 0.5rem',
              borderRadius: '20px',
              fontWeight: 800
            }}>
              {pendingAlertsCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('camaras')}
          style={{
            background: 'none',
            border: 'none',
            color: activeTab === 'camaras' ? '#0ea5e9' : '#94a3b8',
            fontSize: '1.05rem',
            fontWeight: 700,
            padding: '0.5rem 1rem',
            cursor: 'pointer',
            borderBottom: activeTab === 'camaras' ? '2px solid #0ea5e9' : '2px solid transparent',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            transition: 'all 0.2s'
          }}
        >
          <span>📹 Monitoreo de Cámaras en Vivo</span>
          <span style={{
            background: 'rgba(16, 185, 129, 0.2)',
            color: '#10b981',
            fontSize: '0.75rem',
            padding: '0.15rem 0.5rem',
            borderRadius: '20px',
            fontWeight: 800,
            border: '1px solid rgba(16, 185, 129, 0.4)'
          }}>
            {cameras.length} Activas
          </span>
        </button>
      </div>

      {/* ================= CONTENIDO DE PESTAÑA: CÁMARAS EN VIVO ================= */}
      {activeTab === 'camaras' && (
        <div className="animate-fade-in">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h2 style={{ fontSize: '1.4rem', margin: 0, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span>📹 Streams de Vigilancia en Vivo</span>
                <span style={{ fontSize: '0.85rem', color: '#10b981', fontWeight: 600 }}>● CCTV ONLINE [{liveClock}]</span>
              </h2>
              <p style={{ margin: '0.25rem 0 0 0', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                Transmisiones de cámaras urbanas, drones de rescate y puntos de control en territorio salvadoreño
              </p>
            </div>
            <button
              onClick={() => setShowAddCamModal(true)}
              className="btn btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.6rem 1.2rem', fontWeight: 600 }}
            >
              <span>➕</span>
              <span>Conectar Nueva Cámara IP / Dron</span>
            </button>
          </div>

          {camerasLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
              <div style={{ border: '3px solid rgba(255,255,255,0.1)', borderTop: '3px solid #0ea5e9', borderRadius: '50%', width: '36px', height: '36px', animation: 'spin 1s linear infinite' }} />
              <span style={{ color: 'var(--text-secondary)' }}>Sincronizando feeds de cámaras...</span>
            </div>
          ) : cameras.length === 0 ? (
            <div className="glass-panel text-center" style={{ padding: '4rem 2rem' }}>
              <span style={{ fontSize: '3rem', display: 'block', marginBottom: '1rem' }}>📷</span>
              <h3>No hay cámaras conectadas</h3>
              <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem', marginBottom: '1.5rem' }}>
                Conecta cámaras IP, feeds RTSP o celulares con IP Webcam para iniciar la vigilancia.
              </p>
              <button onClick={() => setShowAddCamModal(true)} className="btn btn-primary">
                ➕ Conectar Primera Cámara
              </button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '1.5rem' }}>
              {cameras.map((cam) => (
                <div
                  key={cam.id}
                  className="glass-panel"
                  style={{
                    overflow: 'hidden',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '12px',
                    display: 'flex',
                    flexDirection: 'column',
                    transition: 'transform 0.2s, box-shadow 0.2s'
                  }}
                >
                  {/* Encabezado de la Tarjeta de Cámara */}
                  <div style={{ padding: '0.75rem 1rem', background: 'rgba(15, 23, 42, 0.85)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ef4444', display: 'inline-block', boxShadow: '0 0 8px #ef4444', animation: 'ping 2s infinite' }} />
                      <strong style={{ fontSize: '0.9rem', color: '#f8fafc' }}>{cam.nombre}</strong>
                    </div>
                    <span style={{ fontSize: '0.75rem', color: '#94a3b8', background: 'rgba(255,255,255,0.05)', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>
                      {cam.tipo}
                    </span>
                  </div>

                  {/* Visor de Video / Stream */}
                  <div style={{ position: 'relative', height: '210px', background: '#090d16', overflow: 'hidden', cursor: 'pointer' }} onClick={() => setExpandedCamera(cam)}>
                    <img
                      src={cam.stream_url}
                      alt={cam.nombre}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      onError={(e) => {
                        e.target.src = 'https://images.unsplash.com/photo-1557597774-9d273605dfa9?auto=format&fit=crop&w=600&q=80';
                      }}
                    />

                    {/* Overlay CCTV: Timestamp y Telemetría */}
                    <div style={{ position: 'absolute', top: '8px', left: '10px', background: 'rgba(0,0,0,0.65)', color: '#22c55e', fontFamily: 'monospace', fontSize: '0.75rem', padding: '0.15rem 0.5rem', borderRadius: '4px', letterSpacing: '0.05em' }}>
                      REC ● {liveClock}
                    </div>

                    <div style={{ position: 'absolute', top: '8px', right: '10px', background: 'rgba(0,0,0,0.65)', color: '#f8fafc', fontSize: '0.7rem', padding: '0.15rem 0.45rem', borderRadius: '4px', fontWeight: 600 }}>
                      {cam.fps || 30} FPS | {cam.resolucion || '1080p'}
                    </div>

                    <div style={{ position: 'absolute', bottom: '8px', left: '10px', right: '10px', background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)', padding: '0.35rem 0.6rem', borderRadius: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.75rem', color: '#cbd5e1' }}>📍 {cam.ubicacion}</span>
                      <span style={{ fontSize: '0.7rem', color: 'var(--primary)', fontWeight: 600 }}>🔍 Ver Grande</span>
                    </div>
                  </div>

                  {/* Acciones de la Cámara */}
                  <div style={{ padding: '0.85rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(15, 23, 42, 0.4)', gap: '0.5rem' }}>
                    <button
                      onClick={() => handleTriggerTestDetection(cam)}
                      className="btn btn-secondary"
                      style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                      title="Genera una alerta de prueba desde esta cámara"
                    >
                      <span>⚡</span>
                      <span>Disparar Detección</span>
                    </button>
                    <button
                      onClick={() => handleDeleteCamera(cam.id)}
                      style={{ background: 'none', border: 'none', color: '#f43f5e', cursor: 'pointer', fontSize: '0.8rem', padding: '0.4rem' }}
                      title="Desconectar cámara"
                    >
                      🗑️ Desconectar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ================= CONTENIDO DE PESTAÑA: ALERTAS DE MODERACIÓN ================= */}
      {activeTab === 'alertas' && (
        <div className="animate-fade-in">
          {/* Mapa interactivo de alertas activas */}
          <div style={{ marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1.4rem', marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
              🗺️ Mapa de Alertas Activas en El Salvador
            </h2>
            <ActiveAlertsMap />
          </div>

          {/* Tabla de Alertas de Moderación */}
          <h2 style={{ fontSize: '1.4rem', marginBottom: '0.75rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span>📋 Cola de Alertas para Validación</span>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>({alerts.length} registros)</span>
          </h2>

          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '6rem', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
              <div style={{ border: '3px solid rgba(255,255,255,0.1)', borderTop: '3px solid #0ea5e9', borderRadius: '50%', width: '40px', height: '40px', animation: 'spin 1s linear infinite' }} />
              <span style={{ color: 'var(--text-secondary)' }}>Cargando alertas de moderación...</span>
            </div>
          ) : alerts.length === 0 ? (
            <div className="glass-panel text-center" style={{ padding: '4rem 2rem' }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🛡️</div>
              <h3>Sin alertas pendientes de validación</h3>
              <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                Todas las alertas de cámaras y avistamientos ciudadanos han sido revisadas.
              </p>
            </div>
          ) : (
            <div className="glass-panel" style={{ overflowX: 'auto', padding: '1rem' }}>
              <table className="moderator-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Fecha y Hora</th>
                    <th>Caso Asociado</th>
                    <th>Origen / Fuente</th>
                    <th>Ubicación</th>
                    <th>Confianza</th>
                    <th>Evidencia</th>
                    <th>Estado</th>
                    <th style={{ textAlign: 'center' }}>Acciones de Moderador</th>
                  </tr>
                </thead>
                <tbody>
                  {alerts.map((alert) => (
                    <tr key={alert.id} className={actionLoading === alert.id ? 'row-updating' : ''}>
                      <td style={{ fontWeight: 'bold', color: 'var(--primary)' }}>#{alert.id}</td>
                      <td style={{ fontSize: '0.85rem' }}>{formatDate(alert.created_at || alert.fecha_deteccion || new Date())}</td>
                      <td>
                        <strong style={{ color: '#f8fafc', display: 'block' }}>
                          {alert.nombre_desaparecido || `Caso #${alert.caso_id}`}
                        </strong>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          ID Caso: {alert.caso_id}
                        </span>
                      </td>
                      <td>
                        <span
                          style={{
                            fontSize: '0.75rem',
                            padding: '0.2rem 0.5rem',
                            borderRadius: '20px',
                            background: alert.tipo_origen?.includes('Ciudadano') ? 'rgba(16, 185, 129, 0.15)' : 'rgba(14, 165, 233, 0.15)',
                            color: alert.tipo_origen?.includes('Ciudadano') ? '#34d399' : '#38bdf8',
                            border: `1px solid ${alert.tipo_origen?.includes('Ciudadano') ? 'rgba(16, 185, 129, 0.3)' : 'rgba(14, 165, 233, 0.3)'}`,
                            fontWeight: 600
                          }}
                        >
                          {alert.tipo_origen || 'Cámara de Seguridad'}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.85rem' }}>
                        <div>{alert.ubicacion_nombre || 'Zona metropolitana'}</div>
                        <div style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {Number(alert.ubicacion_lat).toFixed(4)}, {Number(alert.ubicacion_lng).toFixed(4)}
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <div className="confidence-bar-bg" style={{ width: '50px' }}>
                            <div
                              className="confidence-bar-fill"
                              style={{
                                width: `${alert.porcentaje_confianza}%`,
                                background: alert.porcentaje_confianza > 85 ? '#10b981' : '#0ea5e9'
                              }}
                            />
                          </div>
                          <span style={{ fontWeight: 'bold', fontSize: '0.85rem' }}>{alert.porcentaje_confianza}%</span>
                        </div>
                      </td>
                      <td>
                        {alert.foto_evidencia_url ? (
                          <div
                            onClick={() => setPreviewImage(alert.foto_evidencia_url.startsWith('http') ? alert.foto_evidencia_url : `http://localhost:3001${alert.foto_evidencia_url}`)}
                            style={{
                              width: '45px',
                              height: '45px',
                              borderRadius: '6px',
                              overflow: 'hidden',
                              cursor: 'pointer',
                              border: '1.5px solid var(--primary)'
                            }}
                            title="Haz clic para ampliar la foto de evidencia"
                          >
                            <img
                              src={alert.foto_evidencia_url.startsWith('http') ? alert.foto_evidencia_url : `http://localhost:3001${alert.foto_evidencia_url}`}
                              alt="Evidencia"
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                          </div>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Sin foto</span>
                        )}
                      </td>
                      <td>
                        <span
                          style={{
                            fontWeight: 'bold',
                            textTransform: 'capitalize',
                            color: getMarkerColor(alert.estado),
                            fontSize: '0.85rem'
                          }}
                        >
                          {alert.estado || 'pendiente'}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'center' }}>
                          <button
                            onClick={() => handleStatusUpdate(alert.id, 'confirmado')}
                            className="btn btn-success"
                            style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', fontWeight: 600 }}
                            disabled={actionLoading !== null}
                          >
                            ✓ Confirmar
                          </button>
                          <button
                            onClick={() => handleStatusUpdate(alert.id, 'falso positivo')}
                            className="btn btn-danger"
                            style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', fontWeight: 600 }}
                            disabled={actionLoading !== null}
                          >
                            ✕ Descartar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ================= MODAL: AMPLIAR IMAGEN DE EVIDENCIA ================= */}
      {previewImage && (
        <div
          onClick={() => setPreviewImage(null)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(3, 7, 18, 0.9)',
            zIndex: 99999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2rem'
          }}
        >
          <div style={{ position: 'relative', maxWidth: '800px', maxHeight: '85vh' }} onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setPreviewImage(null)}
              style={{
                position: 'absolute',
                top: '-15px',
                right: '-15px',
                background: '#ef4444',
                color: '#fff',
                border: 'none',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                fontSize: '1.1rem',
                cursor: 'pointer',
                fontWeight: 'bold'
              }}
            >
              ✕
            </button>
            <img
              src={previewImage}
              alt="Evidencia Ampliada"
              style={{
                maxWidth: '100%',
                maxHeight: '80vh',
                borderRadius: '8px',
                border: '2px solid var(--primary)',
                boxShadow: '0 10px 30px rgba(0,0,0,0.8)'
              }}
            />
          </div>
        </div>
      )}

      {/* ================= MODAL: CÁMARA EN PANTALLA COMPLETA ================= */}
      {expandedCamera && (
        <div
          onClick={() => setExpandedCamera(null)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(3, 7, 18, 0.92)',
            zIndex: 99999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2rem'
          }}
        >
          <div
            className="glass-panel"
            style={{
              width: '100%',
              maxWidth: '850px',
              overflow: 'hidden',
              borderRadius: '12px',
              border: '1px solid var(--primary)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ padding: '0.75rem 1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(15, 23, 42, 0.9)' }}>
              <div>
                <strong style={{ color: '#f8fafc', fontSize: '1.1rem' }}>{expandedCamera.nombre}</strong>
                <span style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8' }}>📍 {expandedCamera.ubicacion}</span>
              </div>
              <button onClick={() => setExpandedCamera(null)} style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '1.5rem', cursor: 'pointer' }}>
                ✕
              </button>
            </div>
            <div style={{ position: 'relative', height: '420px', background: '#000' }}>
              <img
                src={expandedCamera.stream_url}
                alt={expandedCamera.nombre}
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              />
              <div style={{ position: 'absolute', bottom: '10px', left: '15px', background: 'rgba(0,0,0,0.7)', color: '#22c55e', fontFamily: 'monospace', padding: '0.2rem 0.6rem', borderRadius: '4px' }}>
                LIVE ● {liveClock} | {expandedCamera.fps || 30} FPS
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: CONECTAR NUEVA CÁMARA ================= */}
      {showAddCamModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(3, 7, 18, 0.85)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem'
          }}
        >
          <div
            className="glass-panel animate-fade-in"
            style={{ width: '100%', maxWidth: '520px', padding: '2rem', border: '1px solid rgba(14, 165, 233, 0.4)' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#f8fafc' }}>
                📹 Conectar Nueva Cámara IP / Dron
              </h3>
              <button onClick={() => setShowAddCamModal(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '1.5rem', cursor: 'pointer' }}>
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateCamera}>
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label className="form-label">Nombre del Dispositivo</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Ej. Cámara 03 - Redondel Masferrer"
                  value={newCamForm.nombre}
                  onChange={(e) => setNewCamForm({ ...newCamForm, nombre: e.target.value })}
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label className="form-label">URL del Stream (RTSP / HTTP / Snapshot)</label>
                <input
                  type="url"
                  className="form-control"
                  placeholder="http://192.168.1.50:8080/shot.jpg"
                  value={newCamForm.stream_url}
                  onChange={(e) => setNewCamForm({ ...newCamForm, stream_url: e.target.value })}
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label className="form-label">Ubicación Descriptiva</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Ej. San Salvador, Colonia Escalón"
                  value={newCamForm.ubicacion}
                  onChange={(e) => setNewCamForm({ ...newCamForm, ubicacion: e.target.value })}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
                <div>
                  <label className="form-label" style={{ fontSize: '0.85rem' }}>Latitud GPS</label>
                  <input
                    type="number"
                    step="0.0001"
                    className="form-control"
                    value={newCamForm.lat}
                    onChange={(e) => setNewCamForm({ ...newCamForm, lat: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: '0.85rem' }}>Longitud GPS</label>
                  <input
                    type="number"
                    step="0.0001"
                    className="form-control"
                    value={newCamForm.lng}
                    onChange={(e) => setNewCamForm({ ...newCamForm, lng: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                <label className="form-label">Tipo de Dispositivo</label>
                <select
                  className="form-control"
                  value={newCamForm.tipo}
                  onChange={(e) => setNewCamForm({ ...newCamForm, tipo: e.target.value })}
                >
                  <option value="Cámara de Seguridad Urbana">Cámara de Seguridad Urbana</option>
                  <option value="Tránsito Peatonal / Transporte">Tránsito Peatonal / Transporte</option>
                  <option value="Dron de Búsqueda Aérea">Dron de Búsqueda Aérea</option>
                  <option value="Cámara Móvil Policial">Cámara Móvil Policial</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setShowAddCamModal(false)} className="btn btn-secondary">
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" disabled={camSubmitting}>
                  {camSubmitting ? 'Conectando...' : '✓ Guardar y Conectar Cámara'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ModeratorPanel;
