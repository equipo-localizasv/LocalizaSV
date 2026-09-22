import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import api from '../services/api';

// Configuración de los íconos por defecto de Leaflet para evitar imágenes rotas
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Cargador de dependencias Leaflet.Heat y Leaflet.markercluster
const loadLeafletPlugins = () => {
  return new Promise((resolve) => {
    // Inyectar CSS de MarkerCluster si no existe en el DOM
    if (!document.getElementById('leaflet-markercluster-css')) {
      const link1 = document.createElement('link');
      link1.id = 'leaflet-markercluster-css';
      link1.rel = 'stylesheet';
      link1.href = 'https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.css';
      document.head.appendChild(link1);

      const link2 = document.createElement('link');
      link2.id = 'leaflet-markercluster-default-css';
      link2.rel = 'stylesheet';
      link2.href = 'https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.Default.css';
      document.head.appendChild(link2);
    }

    const L_GLOBAL = window.L || L;
    const needClusterJS = typeof L_GLOBAL.markerClusterGroup !== 'function';
    const needHeatJS = typeof L_GLOBAL.heatLayer !== 'function';

    if (!needClusterJS && !needHeatJS) {
      resolve(true);
      return;
    }

    let loadedCount = 0;
    const totalToLoad = (needClusterJS ? 1 : 0) + (needHeatJS ? 1 : 0);

    const checkDone = () => {
      loadedCount++;
      if (loadedCount >= totalToLoad) {
        resolve(true);
      }
    };

    if (needClusterJS) {
      const script1 = document.createElement('script');
      script1.src = 'https://unpkg.com/leaflet.markercluster@1.5.3/dist/leaflet.markercluster.js';
      script1.onload = checkDone;
      script1.onerror = checkDone;
      document.head.appendChild(script1);
    }

    if (needHeatJS) {
      const script2 = document.createElement('script');
      script2.src = 'https://unpkg.com/leaflet.heat@0.2.0/dist/leaflet-heat.js';
      script2.onload = checkDone;
      script2.onerror = checkDone;
      document.head.appendChild(script2);
    }
  });
};

// Componente interno que gestiona las capas en la instancia del mapa Leaflet
const HeatAndClusterLayers = ({ alerts, showHeatmap, showClusters, onSelectAlert }) => {
  const map = useMap();

  useEffect(() => {
    if (!map || !alerts) return;

    const L_GLOBAL = window.L || L;
    let heatLayer = null;
    let clusterGroup = null;

    // 1. Capa de calor (Heatmap con Leaflet.Heat - Requisitos 36, 37)
    if (showHeatmap && typeof L_GLOBAL.heatLayer === 'function') {
      const heatPoints = alerts
        .map((a) => {
          const lat = parseFloat(a.ubicacion_lat || a.lat);
          const lng = parseFloat(a.ubicacion_lng || a.lng);
          if (isNaN(lat) || isNaN(lng)) return null;
          const intensity = a.porcentaje_confianza ? a.porcentaje_confianza / 100 : 0.8;
          return [lat, lng, intensity];
        })
        .filter(Boolean);

      if (heatPoints.length > 0) {
        heatLayer = L_GLOBAL.heatLayer(heatPoints, {
          radius: 30,
          blur: 20,
          maxZoom: 16,
          gradient: { 0.4: '#0ea5e9', 0.65: '#f59e0b', 1.0: '#f43f5e' }
        });
        heatLayer.addTo(map);
      }
    }

    // 2. Agrupamiento de marcadores (Clustering con Leaflet.markercluster - Requisitos 38, 39, 40)
    if (showClusters && typeof L_GLOBAL.markerClusterGroup === 'function') {
      clusterGroup = L_GLOBAL.markerClusterGroup({
        spiderfyOnMaxZoom: true,
        showCoverageOnHover: false,
        zoomToBoundsOnClick: true,
        disableClusteringAtZoom: 17
      });

      alerts.forEach((alert) => {
        const lat = parseFloat(alert.ubicacion_lat || alert.lat);
        const lng = parseFloat(alert.ubicacion_lng || alert.lng);
        if (isNaN(lat) || isNaN(lng)) return;

        const nombre = alert.nombre_desaparecido || alert.nombre || 'Persona Desaparecida';
        const fechaStr = alert.fecha_deteccion || alert.created_at || alert.fecha;
        const isConfirmed = (alert.estado || '').toLowerCase() === 'confirmado' || (alert.estado || '').toLowerCase() === 'confirmada';

        const formatDateStr = (dStr) => {
          if (!dStr) return 'N/A';
          const d = new Date(dStr);
          return new Intl.DateTimeFormat('es-SV', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
          }).format(d);
        };

        const popupContent = `
          <div style="font-family: system-ui, -apple-system, sans-serif; padding: 6px; min-width: 190px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 4px;">
              <span style="font-size: 0.72rem; text-transform: uppercase; color: #0ea5e9; font-weight: 700;">
                Alerta #${alert.id}
              </span>
              ${isConfirmed ? '<span style="background:#ef4444; color:#fff; font-size:0.65rem; font-weight:800; padding:1px 6px; border-radius:3px;">CONFIRMADO</span>' : ''}
            </div>
            <h4 style="margin: 0 0 6px 0; color: #0f172a; font-size: 1rem; font-weight: 800;">
              ${isConfirmed ? '🚨' : '📍'} ${nombre}
            </h4>
            <p style="margin: 0 0 4px 0; font-size: 0.82rem; color: #475569;">
              <strong>Detección:</strong> ${formatDateStr(fechaStr)}
            </p>
            <p style="margin: 0 0 4px 0; font-size: 0.82rem; color: #475569;">
              <strong>Ubicación GPS:</strong> ${lat.toFixed(5)}, ${lng.toFixed(5)}
            </p>
            ${alert.porcentaje_confianza ? `
              <div style="margin-top: 4px; font-size: 0.72rem; background: #e0f2fe; color: #0369a1; padding: 2px 6px; border-radius: 4px; display: inline-block; font-weight: 700;">
                Confianza IA: ${alert.porcentaje_confianza}%
              </div>
            ` : ''}
          </div>
        `;

        let customMarker;
        if (isConfirmed) {
          const confirmedIcon = L_GLOBAL.divIcon({
            className: 'pnc-custom-confirmed-marker',
            html: `
              <div style="position:relative; width:34px; height:34px; display:flex; align-items:center; justify-content:center;">
                <div style="position:absolute; width:100%; height:100%; border-radius:50%; background:rgba(239, 68, 68, 0.45); animation:ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
                <div style="background:#ef4444; color:#fff; border:2px solid #fff; border-radius:50%; width:26px; height:26px; display:flex; align-items:center; justify-content:center; font-size:14px; box-shadow:0 0 12px #ef4444; z-index:2;">🚨</div>
              </div>
            `,
            iconSize: [34, 34],
            iconAnchor: [17, 17]
          });
          customMarker = L_GLOBAL.marker([lat, lng], { icon: confirmedIcon });
        } else {
          customMarker = L_GLOBAL.marker([lat, lng]);
        }

        customMarker.bindPopup(popupContent);
        if (typeof onSelectAlert === 'function') {
          customMarker.on('click', () => onSelectAlert(alert));
        }
        clusterGroup.addLayer(customMarker);
      });

      map.addLayer(clusterGroup);
    }

    return () => {
      if (heatLayer && map) {
        map.removeLayer(heatLayer);
      }
      if (clusterGroup && map) {
        map.removeLayer(clusterGroup);
      }
    };
  }, [map, alerts, showHeatmap, showClusters, onSelectAlert]);

  return null;
};

// Componente interno que renderiza la Ruta de Llegada Rápida de Emergencia PNC
const EmergencyRouteLayer = ({ route }) => {
  const map = useMap();

  useEffect(() => {
    if (!map || !route || !route.routeCoordinates || route.routeCoordinates.length === 0) return;

    const L_GLOBAL = window.L || L;
    const layerGroup = L_GLOBAL.layerGroup();

    // 1. Línea Resplandeciente de Fondo (Neon Glow)
    const glowLine = L_GLOBAL.polyline(route.routeCoordinates, {
      color: '#0284c7',
      weight: 10,
      opacity: 0.45,
      lineCap: 'round',
      lineJoin: 'round'
    });
    layerGroup.addLayer(glowLine);

    // 2. Línea Táctica Principal (Cyber Cyan con tramos direccionales)
    const mainLine = L_GLOBAL.polyline(route.routeCoordinates, {
      color: '#00f0ff',
      weight: 5,
      opacity: 0.95,
      lineCap: 'round',
      lineJoin: 'round',
      dashArray: '10, 8'
    });
    layerGroup.addLayer(mainLine);

    // 3. Marcador de Unidad Patrulla PNC de Origen
    const patrolIcon = L_GLOBAL.divIcon({
      className: 'pnc-patrol-origin-marker',
      html: `
        <div style="position:relative; width:42px; height:42px; display:flex; align-items:center; justify-content:center;">
          <div style="position:absolute; width:100%; height:100%; border-radius:50%; background:rgba(2, 132, 199, 0.4); animation:ping 2s infinite;"></div>
          <div style="background:linear-gradient(135deg, #0284c7, #1e3a8a); color:#fff; border:2px solid #38bdf8; border-radius:50%; width:34px; height:34px; display:flex; align-items:center; justify-content:center; font-size:18px; box-shadow:0 0 16px rgba(2,132,199,0.8); z-index:5;">
            🚔
          </div>
        </div>
      `,
      iconSize: [42, 42],
      iconAnchor: [21, 21]
    });

    const startMarker = L_GLOBAL.marker(route.startCoords, { icon: patrolIcon });
    startMarker.bindPopup(`
      <div style="font-family:system-ui; padding:4px;">
        <strong style="color:#0284c7; font-size:0.85rem;">🚔 Punto de Despacho PNC</strong>
        <p style="margin:2px 0 0 0; font-size:0.78rem; color:#475569;">${route.startUnit?.nombre || 'Base 911'}</p>
      </div>
    `);
    layerGroup.addLayer(startMarker);

    // 4. Marcador del Objetivo Confirmado de Destino
    const targetIcon = L_GLOBAL.divIcon({
      className: 'pnc-target-dest-marker',
      html: `
        <div style="position:relative; width:48px; height:48px; display:flex; align-items:center; justify-content:center;">
          <div style="position:absolute; width:100%; height:100%; border-radius:50%; background:rgba(239, 68, 68, 0.5); animation:ping 1s infinite;"></div>
          <div style="background:#ef4444; color:#fff; border:2px solid #fff; border-radius:50%; width:36px; height:36px; display:flex; align-items:center; justify-content:center; font-size:18px; box-shadow:0 0 24px #ef4444; z-index:5;">
            🚨
          </div>
        </div>
      `,
      iconSize: [48, 48],
      iconAnchor: [24, 24]
    });

    const destMarker = L_GLOBAL.marker(route.targetCoords, { icon: targetIcon });
    destMarker.bindPopup(`
      <div style="font-family:system-ui; padding:6px; min-width:180px;">
        <div style="background:#ef4444; color:#fff; font-size:0.65rem; font-weight:800; padding:2px 6px; border-radius:3px; display:inline-block; margin-bottom:4px;">
          OBJETIVO CONFIRMADO POR MODERADOR
        </div>
        <strong style="display:block; color:#0f172a; font-size:0.95rem;">${route.targetInfo?.nombre_desaparecido || 'Persona Localizada'}</strong>
        <p style="margin:4px 0 0 0; font-size:0.8rem; color:#475569;">
          <strong>Ubicación:</strong> ${route.targetInfo?.ubicacion || 'Punto de detección'}
        </p>
        <p style="margin:2px 0 0 0; font-size:0.8rem; color:#0284c7; font-weight:700;">
          ⏱️ ETA de llegada: ~${route.etaMinutes} min (${route.distanceKm} km)
        </p>
      </div>
    `);
    layerGroup.addLayer(destMarker);

    layerGroup.addTo(map);

    // Ajustar el zoom suavemente para encuadrar toda la ruta de llegada
    try {
      const bounds = mainLine.getBounds();
      map.fitBounds(bounds, { padding: [60, 60], maxZoom: 15, animate: true, duration: 1.2 });
    } catch (e) {
      console.warn('Error al ajustar vista de ruta:', e);
    }

    return () => {
      if (map && layerGroup) {
        map.removeLayer(layerGroup);
      }
    };
  }, [map, route]);

  return null;
};

/**
 * Componente MapaAlertas
 * Incluye capa de calor con Leaflet.Heat, clustering con Leaflet.markercluster,
 * y ruteo GPS de llegada rápida para intercepción de emergencias PNC.
 */
const MapaAlertas = ({
  alerts: propAlerts,
  emergencyRoute = null,
  onClearRoute = null,
  onSelectAlert = null
}) => {
  const [alerts, setAlerts] = useState(propAlerts || []);
  const [loading, setLoading] = useState(!propAlerts);
  const [error, setError] = useState('');
  const [pluginsReady, setPluginsReady] = useState(false);

  // Controles de visibilidad de capas
  const [showHeatmap, setShowHeatmap] = useState(true);
  const [showClusters, setShowClusters] = useState(true);

  // Coordenadas centradas en El Salvador y límites
  const defaultCenter = [13.7, -89.2];
  const defaultZoom = 8;
  const elSalvadorBounds = [
    [13.0, -90.5],
    [14.5, -87.5]
  ];

  // Cargar extensiones externas (Leaflet.Heat y Leaflet.markercluster)
  useEffect(() => {
    loadLeafletPlugins().then(() => setPluginsReady(true));
  }, []);

  // Si propAlerts cambia desde el componente padre, actualizar estado local
  useEffect(() => {
    if (propAlerts !== undefined) {
      setAlerts(propAlerts);
      setLoading(false);
    }
  }, [propAlerts]);

  // Si no se proveyeron propAlerts, obtener las alertas activas desde la API
  useEffect(() => {
    if (propAlerts === undefined) {
      const fetchAlerts = async () => {
        try {
          setLoading(true);
          const response = await api.get('/alertas/activas');
          setAlerts(response.data || []);
        } catch (err) {
          console.error('Error al obtener alertas para el mapa:', err);
          setError('No se pudieron cargar las alertas en el mapa.');
        } finally {
          setLoading(false);
        }
      };

      fetchAlerts();
    }
  }, [propAlerts]);

  return (
    <div 
      className="glass-panel" 
      style={{ 
        padding: '1.25rem', 
        marginBottom: '1.5rem', 
        overflow: 'hidden',
        position: 'relative'
      }}
    >
      {/* Encabezado del Mapa con selectores de capas */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '1.3rem' }}>🗺️</span>
          <div>
            <h2 style={{ fontSize: '1.15rem', margin: 0, color: 'var(--text-primary)', fontWeight: 800 }}>
              Mapa Táctico de Intervención Policial PNC
            </h2>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Geolocalización con cálculo de ruta de llegada más rápida
            </span>
          </div>
        </div>

        {/* Controles para activar/desactivar Heatmap y Clusters */}
        <div style={{ display: 'flex', gap: '0.85rem', alignItems: 'center', fontSize: '0.82rem', flexWrap: 'wrap' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', cursor: 'pointer', color: 'var(--text-secondary)' }}>
            <input 
              type="checkbox" 
              checked={showHeatmap} 
              onChange={(e) => setShowHeatmap(e.target.checked)} 
              style={{ accentColor: 'var(--primary)' }}
            />
            🔥 Capa de Calor
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', cursor: 'pointer', color: 'var(--text-secondary)' }}>
            <input 
              type="checkbox" 
              checked={showClusters} 
              onChange={(e) => setShowClusters(e.target.checked)} 
              style={{ accentColor: 'var(--primary)' }}
            />
            📍 Agrupación de Alertas
          </label>
          <span style={{ color: 'var(--text-muted)' }}>| {alerts.length} alertas</span>
        </div>
      </div>

      {/* Contenedor del Mapa */}
      <div 
        style={{ 
          position: 'relative', 
          width: '100%', 
          height: '460px', 
          borderRadius: 'var(--radius-md)', 
          overflow: 'hidden',
          border: emergencyRoute ? '2px solid #00f0ff' : '1px solid var(--border-color)',
          boxShadow: emergencyRoute ? '0 0 25px rgba(0, 240, 255, 0.3)' : '0 8px 30px rgba(0,0,0,0.5)',
          transition: 'all 0.3s ease'
        }}
      >
        {/* PANEL FLOTANTE DE DESPACHO RÁPIDO PNC (HUD TÁCTICO) */}
        {emergencyRoute && (
          <div
            style={{
              position: 'absolute',
              top: '12px',
              right: '12px',
              zIndex: 1000,
              background: 'rgba(2, 6, 23, 0.94)',
              backdropFilter: 'blur(10px)',
              border: '1px solid #00f0ff',
              borderRadius: '12px',
              padding: '0.85rem 1rem',
              boxShadow: '0 10px 35px rgba(0, 0, 0, 0.85), 0 0 15px rgba(0, 240, 255, 0.25)',
              maxWidth: '360px',
              width: '90%',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem',
              animation: 'fadeIn 0.3s ease'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.4rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444', animation: 'ping 1.2s infinite' }} />
                <span style={{ fontSize: '0.78rem', fontWeight: 900, color: '#00f0ff', letterSpacing: '0.5px' }}>
                  RUTA RÁPIDA DE INTERCEPCIÓN PNC
                </span>
              </div>
              {onClearRoute && (
                <button
                  onClick={onClearRoute}
                  style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '0.9rem', padding: '0 4px' }}
                  title="Cerrar ruteo"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Datos Clave: ETA y Distancia */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', background: 'rgba(15, 23, 42, 0.7)', padding: '0.5rem', borderRadius: '8px' }}>
              <div>
                <span style={{ fontSize: '0.68rem', color: '#94a3b8', textTransform: 'uppercase', display: 'block' }}>Tiempo con Sirena</span>
                <span style={{ fontSize: '1.25rem', fontWeight: 900, color: '#4ade80' }}>
                  ~{emergencyRoute.etaMinutes} min
                </span>
              </div>
              <div>
                <span style={{ fontSize: '0.68rem', color: '#94a3b8', textTransform: 'uppercase', display: 'block' }}>Distancia de Ruta</span>
                <span style={{ fontSize: '1.25rem', fontWeight: 900, color: '#38bdf8' }}>
                  {emergencyRoute.distanceKm} km
                </span>
              </div>
            </div>

            {/* Info del Objetivo y Base de Despacho */}
            <div style={{ fontSize: '0.75rem', color: '#cbd5e1' }}>
              <div>
                <strong style={{ color: '#ef4444' }}>Objetivo:</strong>{' '}
                <span style={{ color: '#fff', fontWeight: 700 }}>{emergencyRoute.targetInfo?.nombre_desaparecido || 'Persona Localizada'}</span>
              </div>
              <div>
                <strong style={{ color: '#38bdf8' }}>Destino:</strong>{' '}
                <span>{emergencyRoute.targetInfo?.ubicacion || 'Punto de detección'}</span>
              </div>
              <div style={{ color: '#94a3b8', fontSize: '0.7rem', marginTop: '2px' }}>
                Despachado desde: {emergencyRoute.startUnit?.nombre || 'Base 911'}
              </div>
            </div>

            {/* Botones de Navegación GPS Externa (Móvil / Tablet Patrulla) */}
            <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.25rem' }}>
              <a
                href={emergencyRoute.googleMapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  flex: 1,
                  background: 'linear-gradient(135deg, #0284c7, #0369a1)',
                  color: '#fff',
                  padding: '0.45rem 0.5rem',
                  borderRadius: '6px',
                  fontSize: '0.75rem',
                  fontWeight: 800,
                  textAlign: 'center',
                  textDecoration: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.35rem',
                  boxShadow: '0 2px 10px rgba(2, 132, 199, 0.4)'
                }}
              >
                <span>🚗 Google Maps</span>
              </a>
              <a
                href={emergencyRoute.wazeUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  flex: 1,
                  background: 'rgba(30, 41, 59, 0.9)',
                  border: '1px solid rgba(56, 189, 248, 0.3)',
                  color: '#38bdf8',
                  padding: '0.45rem 0.5rem',
                  borderRadius: '6px',
                  fontSize: '0.75rem',
                  fontWeight: 800,
                  textAlign: 'center',
                  textDecoration: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.35rem'
                }}
              >
                <span>🚙 Waze</span>
              </a>
            </div>
          </div>
        )}

        {loading && (
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(9, 13, 22, 0.8)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#fff', gap: '0.75rem' }}>
            <div style={{ border: '3px solid rgba(255,255,255,0.1)', borderTop: '3px solid #0ea5e9', borderRadius: '50%', width: '24px', height: '24px', animation: 'spin 1s linear infinite' }} />
            <span>Cargando mapa y capas tácticas de alerta...</span>
          </div>
        )}

        {error && (
          <div style={{ position: 'absolute', top: '10px', left: '50%', transform: 'translateX(-50%)', backgroundColor: 'var(--accent-red)', color: '#fff', padding: '0.5rem 1rem', borderRadius: '6px', zIndex: 1000, fontSize: '0.9rem' }}>
            {error}
          </div>
        )}

        <MapContainer
          center={defaultCenter}
          zoom={defaultZoom}
          minZoom={8}
          maxBounds={elSalvadorBounds}
          maxBoundsViscosity={1.0}
          style={{ height: '100%', width: '100%' }}
          scrollWheelZoom={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {pluginsReady && (
            <HeatAndClusterLayers 
              alerts={alerts} 
              showHeatmap={showHeatmap} 
              showClusters={showClusters}
              onSelectAlert={onSelectAlert}
            />
          )}

          {emergencyRoute && (
            <EmergencyRouteLayer route={emergencyRoute} />
          )}
        </MapContainer>
      </div>
    </div>
  );
};

export default MapaAlertas;
