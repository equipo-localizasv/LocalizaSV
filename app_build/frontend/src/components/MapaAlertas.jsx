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
const HeatAndClusterLayers = ({ alerts, showHeatmap, showClusters }) => {
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
        zoomToBoundsOnClick: true, // Expande los clusters al hacer clic (Requisito 40)
        disableClusteringAtZoom: 17
      });

      alerts.forEach((alert) => {
        const lat = parseFloat(alert.ubicacion_lat || alert.lat);
        const lng = parseFloat(alert.ubicacion_lng || alert.lng);
        if (isNaN(lat) || isNaN(lng)) return;

        const nombre = alert.nombre_desaparecido || alert.nombre || 'Persona Desaparecida';
        const fechaStr = alert.fecha_deteccion || alert.created_at || alert.fecha;

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

        // Mantener la funcionalidad de los popups (Requisito 41)
        const popupContent = `
          <div style="font-family: system-ui, -apple-system, sans-serif; padding: 6px; min-width: 180px;">
            <div style="font-size: 0.75rem; text-transform: uppercase; color: #0ea5e9; font-weight: 700; margin-bottom: 2px;">
              Alerta #${alert.id}
            </div>
            <h4 style="margin: 0 0 6px 0; color: #0f172a; font-size: 1rem; font-weight: 700;">
              🚨 ${nombre}
            </h4>
            <p style="margin: 0 0 4px 0; font-size: 0.85rem; color: #475569;">
              <strong>Fecha de detección:</strong><br />${formatDateStr(fechaStr)}
            </p>
            <p style="margin: 0 0 4px 0; font-size: 0.85rem; color: #475569;">
              <strong>Ubicación:</strong> ${lat.toFixed(5)}, ${lng.toFixed(5)}
            </p>
            ${alert.porcentaje_confianza ? `
              <div style="margin-top: 6px; font-size: 0.75rem; background: #e0f2fe; color: #0369a1; padding: 3px 8px; border-radius: 4px; display: inline-block; font-weight: 600;">
                Confianza: ${alert.porcentaje_confianza}%
              </div>
            ` : ''}
          </div>
        `;

        const marker = L_GLOBAL.marker([lat, lng]);
        marker.bindPopup(popupContent);
        clusterGroup.addLayer(marker);
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
  }, [map, alerts, showHeatmap, showClusters]);

  return null;
};

/**
 * Componente MapaAlertas
 * Incluye capa de calor con Leaflet.Heat y clustering con Leaflet.markercluster
 */
const MapaAlertas = ({ alerts: propAlerts }) => {
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
    [13.0, -90.5], // SouthWest
    [14.5, -87.5]  // NorthEast
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
        padding: '1.5rem', 
        marginBottom: '2rem', 
        overflow: 'hidden',
        position: 'relative'
      }}
    >
      {/* Encabezado del Mapa con selectores de capas */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '1.4rem' }}>🗺️</span>
          <h2 style={{ fontSize: '1.25rem', color: 'var(--text-primary)' }}>Mapa de Alertas Geolocalizadas</h2>
        </div>

        {/* Controles para activar/desactivar Heatmap y Clusters */}
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', fontSize: '0.85rem' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', cursor: 'pointer', color: 'var(--text-secondary)' }}>
            <input 
              type="checkbox" 
              checked={showHeatmap} 
              onChange={(e) => setShowHeatmap(e.target.checked)} 
              style={{ accentColor: 'var(--primary)' }}
            />
            🔥 Capa de Calor (Heatmap)
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', cursor: 'pointer', color: 'var(--text-secondary)' }}>
            <input 
              type="checkbox" 
              checked={showClusters} 
              onChange={(e) => setShowClusters(e.target.checked)} 
              style={{ accentColor: 'var(--primary)' }}
            />
            📍 Clusters de Alertas
          </label>
          <span style={{ color: 'var(--text-muted)' }}>| {alerts.length} alertas</span>
        </div>
      </div>

      {/* Contenedor del Mapa */}
      <div 
        style={{ 
          position: 'relative', 
          width: '100%', 
          height: '420px', 
          borderRadius: 'var(--radius-md)', 
          overflow: 'hidden',
          border: '1px solid var(--border-color)',
          boxShadow: '0 8px 30px rgba(0,0,0,0.5)'
        }}
      >
        {loading && (
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(9, 13, 22, 0.8)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#fff', gap: '0.75rem' }}>
            <div style={{ border: '3px solid rgba(255,255,255,0.1)', borderTop: '3px solid #0ea5e9', borderRadius: '50%', width: '24px', height: '24px', animation: 'spin 1s linear infinite' }} />
            <span>Cargando mapa y capas de alertas...</span>
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
            />
          )}
        </MapContainer>
      </div>
    </div>
  );
};

export default MapaAlertas;
