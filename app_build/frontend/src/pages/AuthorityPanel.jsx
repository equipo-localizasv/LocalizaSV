import React, { useState, useEffect } from 'react';
import api from '../services/api';
import AlertsMap from '../components/AlertsMap';

const AuthorityPanel = () => {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchActiveAlerts = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get('/alertas/activas');
      setAlerts(response.data);
    } catch (err) {
      console.error('Error fetching active alerts:', err);
      setError('No se pudieron cargar las alertas activas. Intente de nuevo más tarde.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActiveAlerts();
  }, []);

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat('es-SV', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    }).format(date);
  };

  const formatCoordinates = (lat, lng) => {
    if (lat === undefined || lng === undefined || lat === null || lng === null) return 'N/A';
    const latNum = typeof lat === 'number' ? lat : parseFloat(lat);
    const lngNum = typeof lng === 'number' ? lng : parseFloat(lng);
    return `${latNum.toFixed(6)}, ${lngNum.toFixed(6)}`;
  };

  return (
    <div className="animate-fade-in">
      {/* Encabezado con estilo de Dashboard.jsx */}
      <div className="dashboard-header">
        <div>
          <h1 style={{ fontSize: '2.25rem', marginBottom: '0.25rem' }}>Panel de Autoridades</h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            Supervisión georreferenciada y listado en tiempo real de alertas activas
          </p>
        </div>
        <button 
          onClick={fetchActiveAlerts} 
          className="btn btn-secondary" 
          disabled={loading}
        >
          🔄 Actualizar Alertas
        </button>
      </div>

      {error && <div className="auth-error text-center mb-4">{error}</div>}

      {/* Componente Mapa de Alertas */}
      <AlertsMap alerts={alerts} />

      {/* Tabla con todas las alertas activas */}
      <div className="glass-panel" style={{ padding: '1.5rem', marginTop: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <h3 style={{ fontSize: '1.2rem', color: 'var(--text-primary)' }}>
            Listado de Alertas Activas ({alerts.length})
          </h3>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Endpoint: GET /api/alertas/activas
          </span>
        </div>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
            <div style={{ border: '3px solid rgba(255,255,255,0.1)', borderTop: '3px solid #0ea5e9', borderRadius: '50%', width: '30px', height: '30px', animation: 'spin 1s linear infinite' }} />
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Cargando alertas activas...</span>
          </div>
        ) : alerts.length === 0 ? (
          <div className="glass-panel text-center" style={{ padding: '3rem 2rem', background: 'rgba(255,255,255,0.01)' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🛡️</div>
            <h3>No hay alertas activas en este momento</h3>
            <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
              Todas las detecciones han sido resueltas o no hay nuevos reportes vigentes.
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="moderator-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Nombre de la persona desaparecida</th>
                  <th>Fecha de detección</th>
                  <th>Ubicación (lat, lng)</th>
                </tr>
              </thead>
              <tbody>
                {alerts.map((alerta) => (
                  <tr key={alerta.id}>
                    <td style={{ fontWeight: 'bold', color: 'var(--primary)' }}>
                      #{alerta.id}
                    </td>
                    <td style={{ fontWeight: '600', color: 'var(--text-primary)' }}>
                      {alerta.nombre_desaparecido}
                    </td>
                    <td>
                      {formatDate(alerta.fecha_deteccion || alerta.created_at)}
                    </td>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                      📍 {formatCoordinates(alerta.ubicacion_lat, alerta.ubicacion_lng)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuthorityPanel;
