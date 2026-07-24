import React, { useState, useEffect } from 'react';
import api from '../services/api';
import ActiveAlertsMap from '../components/ActiveAlertsMap';

const ModeratorPanel = () => {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(null); // stores the alert ID being updated

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
  }, []);

  const handleStatusUpdate = async (id, newStatus) => {
    setError('');
    setActionLoading(id);
    try {
      await api.put(`/alertas/${id}`, { estado: newStatus });
      // Remove or update the alert in local state (since the table only shows "pendientes")
      setAlerts((prevAlerts) => prevAlerts.filter((alert) => alert.id !== id));
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

  return (
    <div className="animate-fade-in">
      <div className="dashboard-header">
        <div>
          <h1 style={{ fontSize: '2.25rem', marginBottom: '0.25rem' }}>Panel de Moderación</h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            Supervisión y confirmación de detecciones de cámaras automáticas
          </p>
        </div>
        <button onClick={fetchPendingAlerts} className="btn btn-secondary" disabled={loading}>
          🔄 Actualizar
        </button>
      </div>

      {/* Mapa interactivo de alertas activas */}
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
          🗺️ Mapa de Alertas Activas
        </h2>
        <ActiveAlertsMap />
      </div>

      {error && <div className="auth-error text-center mb-4">{error}</div>}

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '6rem', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
          <div style={{ border: '3px solid rgba(255,255,255,0.1)', borderTop: '3px solid #0ea5e9', borderRadius: '50%', width: '40px', height: '40px', animation: 'spin 1s linear infinite' }} />
          <span style={{ color: 'var(--text-secondary)' }}>Cargando alertas de cámaras...</span>
        </div>
      ) : alerts.length === 0 ? (
        <div className="glass-panel text-center" style={{ padding: '4rem 2rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🛡️</div>
          <h3>Sin alertas pendientes</h3>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
            Todas las detecciones de cámaras han sido procesadas con éxito.
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
                <th>Evidencias</th>
                <th style={{ textAlign: 'center' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {alerts.map((alert) => (
                <tr key={alert.id} className={actionLoading === alert.id ? 'row-updating' : ''}>
                  <td style={{ fontWeight: 'bold', color: 'var(--primary)' }}>#{alert.id}</td>
                  <td>{formatDate(alert.created_at)}</td>
                  <td>
                    <span style={{ fontWeight: '600', color: 'var(--text-primary)' }}>
                      {alert.nombre_desaparecido}
                    </span>
                    <span style={{ fontSize: '0.75rem', display: 'block', color: 'var(--text-muted)' }}>
                      Caso ID: {alert.caso_id}
                    </span>
                  </td>
                  <td style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>
                    {alert.ubicacion_lat.toFixed(6)}, {alert.ubicacion_lng.toFixed(6)}
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
