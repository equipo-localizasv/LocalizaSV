import React, { useState } from 'react';

/**
 * Componente AlertsMap: Mapa interactivo de alertas georreferenciadas
 * Muestra los puntos GPS (latitud y longitud) de las detecciones activas sobre El Salvador.
 */
const AlertsMap = ({ alerts = [] }) => {
  const [selectedAlert, setSelectedAlert] = useState(null);

  // Coordenadas bounding box aproximadas de El Salvador
  const MIN_LAT = 13.1;
  const MAX_LAT = 14.5;
  const MIN_LNG = -90.1;
  const MAX_LNG = -87.7;

  // Convierte coordenadas GPS (lat, lng) a porcentajes (%) para posicionar en el mapa SVG
  const getCoordinatesPct = (lat, lng) => {
    const latNum = parseFloat(lat) || 13.6929;
    const lngNum = parseFloat(lng) || -89.2182;

    const y = 100 - ((latNum - MIN_LAT) / (MAX_LAT - MIN_LAT)) * 100;
    const x = ((lngNum - MIN_LNG) / (MAX_LNG - MIN_LNG)) * 100;

    return {
      x: Math.max(8, Math.min(92, x)),
      y: Math.max(12, Math.min(88, y))
    };
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat('es-SV', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  return (
    <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '2rem', overflow: 'hidden' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '1.4rem' }}>🗺️</span>
          <h2 style={{ fontSize: '1.25rem', color: 'var(--text-primary)' }}>Mapa de Alertas Geolocalizadas</h2>
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', fontSize: '0.85rem' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#f43f5e', boxShadow: '0 0 8px #f43f5e', display: 'inline-block' }} />
            Alerta Activa ({alerts.length})
          </span>
          <span style={{ color: 'var(--text-muted)' }}>📍 El Salvador</span>
        </div>
      </div>

      {/* Contenedor del Mapa interactivo */}
      <div 
        style={{ 
          position: 'relative', 
          width: '100%', 
          height: '380px', 
          borderRadius: 'var(--radius-md)', 
          overflow: 'hidden',
          background: 'linear-gradient(180deg, #070b14 0%, #0d1527 100%)',
          border: '1px solid var(--border-color)',
          boxShadow: 'inset 0 0 40px rgba(0,0,0,0.8)'
        }}
      >
        {/* Rejilla de Radar / Map Grid background */}
        <div 
          style={{ 
            position: 'absolute', 
            inset: 0, 
            backgroundImage: 'linear-gradient(rgba(14, 165, 233, 0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(14, 165, 233, 0.07) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
            opacity: 0.6
          }} 
        />

        {/* Silueta SVG estilizada de El Salvador / zonas geográficas */}
        <svg 
          viewBox="0 0 1000 500" 
          style={{ position: 'absolute', width: '100%', height: '100%', opacity: 0.15 }}
          preserveAspectRatio="none"
        >
          <path 
            d="M 50,220 Q 180,180 320,160 Q 480,140 650,150 Q 820,170 950,250 Q 900,340 750,370 Q 550,380 350,360 Q 180,350 50,220 Z" 
            fill="#0ea5e9"
            stroke="#0ea5e9"
            strokeWidth="3"
          />
        </svg>

        {/* Indicador Radar sweep animado */}
        <div 
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            width: '400px',
            height: '400px',
            transform: 'translate(-50%, -50%)',
            borderRadius: '50%',
            border: '1px solid rgba(14, 165, 233, 0.15)',
            pointerEvents: 'none'
          }}
        />

        {/* Pines de Alerta posicionados según latitud y longitud */}
        {alerts.map((alerta) => {
          const pos = getCoordinatesPct(alerta.ubicacion_lat, alerta.ubicacion_lng);
          const isSelected = selectedAlert?.id === alerta.id;

          return (
            <div
              key={alerta.id}
              onClick={() => setSelectedAlert(selectedAlert?.id === alerta.id ? null : alerta)}
              style={{
                position: 'absolute',
                left: `${pos.x}%`,
                top: `${pos.y}%`,
                transform: 'translate(-50%, -50%)',
                cursor: 'pointer',
                zIndex: isSelected ? 20 : 10,
                transition: 'transform 0.2s ease'
              }}
            >
              {/* Ocultamiento del pulso rojo para radar */}
              <div 
                style={{
                  position: 'absolute',
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(244, 63, 94, 0.4)',
                  animation: 'ping 1.8s cubic-bezier(0, 0, 0.2, 1) infinite',
                  top: '-4px',
                  left: '-4px'
                }}
              />

              {/* Marcador Pin */}
              <div 
                style={{
                  width: '16px',
                  height: '16px',
                  borderRadius: '50%',
                  backgroundColor: '#f43f5e',
                  border: '2px solid #ffffff',
                  boxShadow: '0 0 12px #f43f5e',
                  transform: isSelected ? 'scale(1.3)' : 'scale(1)'
                }}
              />

              {/* Etiqueta tooltip con nombre */}
              <div
                style={{
                  position: 'absolute',
                  top: '-26px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  whiteSpace: 'nowrap',
                  background: 'rgba(9, 13, 22, 0.85)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  fontSize: '0.7rem',
                  fontWeight: '600',
                  color: '#ffffff',
                  pointerEvents: 'none'
                }}
              >
                #{alerta.id} - {alerta.nombre_desaparecido?.split(' ')[0] || 'Alerta'}
              </div>
            </div>
          );
        })}

        {/* Modal de información al hacer clic en un pin */}
        {selectedAlert && (
          <div
            style={{
              position: 'absolute',
              bottom: '12px',
              left: '12px',
              right: '12px',
              background: 'rgba(17, 24, 39, 0.95)',
              backdropFilter: 'blur(10px)',
              border: '1px solid var(--primary)',
              borderRadius: 'var(--radius-sm)',
              padding: '1rem',
              color: '#fff',
              zIndex: 30,
              display: 'flex',
              justify: 'space-between',
              alignItems: 'center',
              boxShadow: '0 8px 24px rgba(0,0,0,0.6)'
            }}
          >
            <div>
              <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--primary)', fontWeight: '700' }}>
                Detalle de Detección en Mapa #{selectedAlert.id}
              </div>
              <div style={{ fontSize: '1rem', fontWeight: '700', marginTop: '0.2rem' }}>
                {selectedAlert.nombre_desaparecido}
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                📍 Lat: {parseFloat(selectedAlert.ubicacion_lat).toFixed(6)}, Lng: {parseFloat(selectedAlert.ubicacion_lng).toFixed(6)} | 🕒 {formatDate(selectedAlert.fecha_deteccion || selectedAlert.created_at)}
              </div>
            </div>
            <button
              onClick={() => setSelectedAlert(null)}
              className="btn btn-secondary"
              style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem' }}
            >
              ✕ Cerrar
            </button>
          </div>
        )}
      </div>

      <style>{`
        @keyframes ping {
          75%, 100% {
            transform: scale(2.2);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
};

export default AlertsMap;
