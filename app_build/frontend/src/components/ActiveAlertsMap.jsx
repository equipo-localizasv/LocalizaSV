import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import api from '../services/api';

// Configuración de los íconos por defecto de Leaflet para evitar problemas en Vite/Webpack
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const ActiveAlertsMap = () => {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Coordenadas iniciales de El Salvador y zoom de 8 (Requisito 11)
  const defaultCenter = [13.7, -89.2];
  const defaultZoom = 8;

  useEffect(() => {
    const fetchActiveAlerts = async () => {
      try {
        setLoading(true);
        // Endpoint GET /api/alertas/activas (Requisito 8)
        const response = await api.get('/alertas/activas');
        setAlerts(response.data);
      } catch (err) {
        console.error('Error al obtener alertas activas:', err);
        setError('No se pudieron cargar las alertas activas en el mapa.');
      } finally {
        setLoading(false);
      }
    };

    fetchActiveAlerts();
  }, []);

  const formatDate = (dateStr) => {
    if (!dateStr) return 'Fecha no especificada';
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

  return (
    <div className="active-alerts-map-container" style={{ width: '100%', height: '500px', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)', position: 'relative', margin: '1.5rem 0' }}>
      {loading && (
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.7)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#fff' }}>
          <span>Cargando mapa y alertas activas...</span>
        </div>
      )}

      {error && (
        <div style={{ position: 'absolute', top: '10px', left: '50%', transform: 'translateX(-50%)', backgroundColor: '#ef4444', color: '#fff', padding: '0.5rem 1rem', borderRadius: '6px', zIndex: 1000, fontSize: '0.9rem' }}>
          {error}
        </div>
      )}

      <MapContainer
        center={defaultCenter}
        zoom={defaultZoom}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {alerts.map((alert) => {
          const lat = alert.ubicacion_lat || alert.lat;
          const lng = alert.ubicacion_lng || alert.lng;
          const nombre = alert.nombre_desaparecido || alert.nombre || 'Persona Desaparecida';
          const fecha = alert.created_at || alert.fecha_deteccion || alert.fecha;

          if (!lat || !lng) return null;

          return (
            /* Marcador en ubicación lat, lng (Requisito 9) */
            <Marker key={alert.id} position={[lat, lng]}>
              {/* Popup con nombre y fecha de detección (Requisito 10) */}
              <Popup>
                <div style={{ padding: '4px' }}>
                  <h4 style={{ margin: '0 0 6px 0', color: '#0f172a', fontSize: '1rem', fontWeight: 'bold' }}>
                    🚨 {nombre}
                  </h4>
                  <p style={{ margin: '0 0 4px 0', fontSize: '0.85rem', color: '#475569' }}>
                    <strong>Fecha de detección:</strong><br />
                    {formatDate(fecha)}
                  </p>
                  {alert.porcentaje_confianza && (
                    <span style={{ fontSize: '0.75rem', backgroundColor: '#e0f2fe', color: '#0369a1', padding: '2px 6px', borderRadius: '4px', display: 'inline-block', marginTop: '4px' }}>
                      Confianza: {alert.porcentaje_confianza}%
                    </span>
                  )}
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
};

export default ActiveAlertsMap;
