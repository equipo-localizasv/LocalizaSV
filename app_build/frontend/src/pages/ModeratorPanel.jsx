import React, { useState, useEffect } from 'react';
import api from '../services/api';
import socketService from '../services/socket';

const ModeratorPanel = () => {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(null); // ID de alerta procesando actualización
  const [selectedMarker, setSelectedMarker] = useState(null); // Alerta seleccionada en mapa

  const fetchPendingAlerts = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get('/alertas/pendientes');
      setAlerts(response.data);
    } catch (err) {
      console.error('Error fetching pending alerts:', err);
      setError('No se pudieron cargar las alertas de moderación. Intente de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingAlerts();

    // Requisito 24 & 25: Escuchar 'nueva_alerta' y agregarla a la lista en tiempo real
    const unsubNew = socketService.on('nueva_alerta', (newAlert) => {
      console.log('🚨 [ModeratorPanel] "nueva_alerta" recibida:', newAlert);
      setAlerts((prevAlerts) => {
        const exists = prevAlerts.some((a) => a.id === newAlert.id);
        if (exists) return prevAlerts;
        return [newAlert, ...prevAlerts];
      });
    });

    // Requisito 24 & 26: Escuchar 'alerta_actualizada' y actualizar su estado en la lista y mapa
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
      // Actualizar estado localmente para reflejar de inmediato en la lista y en el mapa
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

  // Cálculo de coordenadas relativas en mapa sintético de El Salvador
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
        return '#10b981'; // Verde
      case 'falso positivo':
      case 'descartado':
        return '#f43f5e'; // Rojo
      default:
        return '#0ea5e9'; // Azul Cyan (Pendiente)
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="dashboard-header">
        <div>
          <h1 style={{ fontSize: '2.25rem', marginBottom: '0.25rem' }}>Panel de Moderación</h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            Supervisión, mapa interactivo y confirmación en tiempo real de alertas de cámaras
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <span 
            className="status-badge" 
            style={{ 
              backgroundColor: socketService.isConnected() ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
              color: socketService.isConnected() ? '#10b981' : '#ef4444',
              border: `1px solid ${socketService.isConnected() ? '#10b981' : '#ef4444'}`
            }}
          >
            {socketService.isConnected() ? '🟢 WebSocket Vivo' : '🔴 WebSocket Desconectado'}
          </span>
          <button onClick={fetchPendingAlerts} className="btn btn-secondary" disabled={loading}>
            🔄 Actualizar
          </button>
        </div>
      </div>

      {error && <div className="auth-error text-center mb-4">{error}</div>}

      {/* Mapa interactivo de alertas (Requisito 26) */}
      <div className="map-container glass-panel">
        <div className="map-grid-bg">
          <div className="map-badge">
            🗺️ Mapa en Tiempo Real - Coordenadas El Salvador
          </div>

          {alerts.map((alert) => {
            const pos = getMarkerPosition(alert.ubicacion_lat, alert.ubicacion_lng);
            const color = getMarkerColor(alert.estado);
            const isPending = !alert.estado || alert.estado === 'pendiente';

            return (
              <div
                key={`map-marker-${alert.id}`}
                className="map-marker"
                style={{ left: pos.left, top: pos.top }}
                onClick={() => setSelectedMarker(selectedMarker?.id === alert.id ? null : alert)}
                title={`Alerta #${alert.id} - ${alert.nombre_desaparecido || 'Caso'}`}
              >
                {isPending && (
                  <div className="map-marker-ping" style={{ backgroundColor: color }} />
                )}
                <div className="map-marker-dot" style={{ backgroundColor: color }} />
              </div>
            );
          })}

          {/* Popup flotante de marcador seleccionado */}
          {selectedMarker && (
            <div 
              style={{
                position: 'absolute',
                bottom: '1rem',
                right: '1rem',
                background: 'rgba(15, 23, 42, 0.95)',
                border: '1px solid var(--primary)',
                padding: '0.85rem 1.1rem',
                borderRadius: '8px',
                zIndex: 100,
                fontSize: '0.85rem',
                maxWidth: '280px',
                backdropFilter: 'blur(10px)',
                boxShadow: '0 8px 24px rgba(0,0,0,0.6)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem', fontWeight: 'bold' }}>
                <span style={{ color: 'var(--primary)' }}>Alerta #{selectedMarker.id}</span>
                <button 
                  onClick={() => setSelectedMarker(null)} 
                  style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', fontSize: '1rem' }}
                >
                  ✕
                </button>
              </div>
              <div><strong>Caso:</strong> {selectedMarker.nombre_desaparecido || `ID ${selectedMarker.caso_id}`}</div>
              <div><strong>Estado:</strong> <span style={{ color: getMarkerColor(selectedMarker.estado), fontWeight: 'bold' }}>{selectedMarker.estado || 'pendiente'}</span></div>
              <div><strong>Confianza:</strong> {selectedMarker.porcentaje_confianza}%</div>
              <div style={{ fontFamily: 'monospace', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                Lat: {Number(selectedMarker.ubicacion_lat).toFixed(4)}, Lng: {Number(selectedMarker.ubicacion_lng).toFixed(4)}
              </div>
            </div>
          )}
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '6rem', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
          <div style={{ border: '3px solid rgba(255,255,255,0.1)', borderTop: '3px solid #0ea5e9', borderRadius: '50%', width: '40px', height: '40px', animation: 'spin 1s linear infinite' }} />
          <span style={{ color: 'var(--text-secondary)' }}>Cargando alertas de cámaras...</span>
        </div>
      ) : alerts.length === 0 ? (
        <div className="glass-panel text-center" style={{ padding: '4rem 2rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🛡️</div>
          <h3>Sin alertas registradas</h3>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
            No hay alertas de detecciones registradas por el momento.
          </p>
        </div>
      ) : (
        <div className="glass-panel" style={{ overflowX: 'auto', padding: '1rem' }}>
          <table className="moderator-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Fecha y Hora</th>
                <th>Caso</th>
                <th>Coordenadas (Lat, Lng)</th>
                <th>Confianza</th>
                <th>Estado actual</th>
                <th>Evidencias</th>
                <th style={{ textAlign: 'center' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {alerts.map((alert) => (
                <tr key={alert.id} className={actionLoading === alert.id ? 'row-updating' : ''}>
                  <td style={{ fontWeight: 'bold', color: 'var(--primary)' }}>#{alert.id}</td>
                  <td>{formatDate(alert.created_at || new Date())}</td>
                  <td>
                    <span style={{ fontWeight: '600', color: 'var(--text-primary)' }}>
                      {alert.nombre_desaparecido || `Caso #${alert.caso_id}`}
                    </span>
                    <span style={{ fontSize: '0.75rem', display: 'block', color: 'var(--text-muted)' }}>
                      Caso ID: {alert.caso_id}
                    </span>
                  </td>
                  <td style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>
                    {Number(alert.ubicacion_lat).toFixed(6)}, {Number(alert.ubicacion_lng).toFixed(6)}
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <div className="confidence-bar-bg">
                        <div 
                          className="confidence-bar-fill" 
                          style={{ 
                            width: `${alert.porcentaje_confianza}%`,
                            background: alert.porcentaje_confianza > 80 ? 'var(--accent-green)' : 'var(--primary)'
                          }} 
                        />
                      </div>
                      <span style={{ fontWeight: 'bold' }}>{alert.porcentaje_confianza}%</span>
                    </div>
                  </td>
                  <td>
                    <span 
                      style={{ 
                        fontWeight: 'bold',
                        textTransform: 'capitalize',
                        color: getMarkerColor(alert.estado)
                      }}
                    >
                      {alert.estado || 'pendiente'}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      {alert.foto_evidencia_url && (
                        <a 
                          href={alert.foto_evidencia_url} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="btn btn-secondary" 
                          style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                        >
                          🖼️ Foto
                        </a>
                      )}
                      {alert.video_url && (
                        <a 
                          href={alert.video_url} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="btn btn-secondary" 
                          style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                        >
                          🎥 Video
                        </a>
                      )}
                      {!alert.foto_evidencia_url && !alert.video_url && (
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Sin archivos</span>
                      )}
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'center' }}>
                      <button
                        onClick={() => handleStatusUpdate(alert.id, 'confirmado')}
                        className="btn btn-success"
                        style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem' }}
                        disabled={actionLoading !== null}
                      >
                        Confirmar
                      </button>
                      <button
                        onClick={() => handleStatusUpdate(alert.id, 'falso positivo')}
                        className="btn btn-danger"
                        style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem' }}
                        disabled={actionLoading !== null}
                      >
                        Descartar
                      </button>
                      <button
                        onClick={() => handleStatusUpdate(alert.id, 'pendiente')}
                        className="btn btn-secondary"
                        style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem', opacity: 0.6 }}
                        disabled={actionLoading !== null}
                      >
                        Pendiente
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
  );
};

export default ModeratorPanel;

