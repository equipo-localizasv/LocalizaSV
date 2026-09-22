import React, { useState, useEffect } from 'react';
import api from '../services/api';
import {
  FileText,
  MapPin,
  Camera,
  Activity,
  Calendar,
  Clock,
  User,
  Shield,
  CheckCircle,
  AlertTriangle,
  ExternalLink,
  Printer,
  ChevronRight,
  Flame,
  Layers,
  ZoomIn
} from 'lucide-react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Sub-componente para renderizar la trayectoria y mapa de calor específico del caso
const CaseHeatmapAndTrajectory = ({ points, alerts, lastKnownCoords }) => {
  const map = useMap();

  useEffect(() => {
    if (!map) return;

    const L_GLOBAL = window.L || L;
    const layerGroup = L_GLOBAL.layerGroup();

    // 1. Capa de Calor específica para los puntos de este caso
    if (typeof L_GLOBAL.heatLayer === 'function' && points && points.length > 0) {
      const heat = L_GLOBAL.heatLayer(points, {
        radius: 35,
        blur: 22,
        maxZoom: 16,
        gradient: { 0.4: '#0ea5e9', 0.65: '#f59e0b', 1.0: '#ef4444' }
      });
      layerGroup.addLayer(heat);
    }

    // 2. Trazo de Trayectoria Cronológica entre los puntos de detección
    if (alerts && alerts.length > 1) {
      const validCoords = alerts
        .map((a) => {
          const lat = parseFloat(a.ubicacion_lat || a.lat);
          const lng = parseFloat(a.ubicacion_lng || a.lng);
          return !isNaN(lat) && !isNaN(lng) ? [lat, lng] : null;
        })
        .filter(Boolean);

      if (validCoords.length > 1) {
        const polyline = L_GLOBAL.polyline(validCoords, {
          color: '#f59e0b',
          weight: 3,
          opacity: 0.8,
          dashArray: '6, 8'
        });
        layerGroup.addLayer(polyline);
      }
    }

    // 3. Marcadores numerados para cada avistamiento
    alerts.forEach((alert, idx) => {
      const lat = parseFloat(alert.ubicacion_lat || alert.lat);
      const lng = parseFloat(alert.ubicacion_lng || alert.lng);
      if (isNaN(lat) || isNaN(lng)) return;

      const isCamera = alert.tipo_origen === 'Cámara IP' || alert.tipo_origen === 'CCTV' || alert.camara_id;
      const markerIcon = L_GLOBAL.divIcon({
        className: 'case-sighting-marker',
        html: `
          <div style="
            background: ${isCamera ? '#0284c7' : '#10b981'};
            color: #fff;
            border: 2px solid #fff;
            border-radius: 50%;
            width: 28px;
            height: 28px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 800;
            font-size: 0.72rem;
            box-shadow: 0 0 12px ${isCamera ? '#0284c7' : '#10b981'};
          ">
            ${alerts.length - idx}
          </div>
        `,
        iconSize: [28, 28],
        iconAnchor: [14, 14]
      });

      const marker = L_GLOBAL.marker([lat, lng], { icon: markerIcon });
      marker.bindPopup(`
        <div style="font-family: system-ui; padding: 4px; min-width: 170px;">
          <div style="font-size: 0.7rem; color: #0284c7; font-weight: 800; text-transform: uppercase;">
            ${isCamera ? '📹 Detección Cámara CCTV' : '👤 Avistamiento Ciudadano'}
          </div>
          <strong style="display:block; margin: 2px 0; font-size: 0.88rem; color: #0f172a;">
            ${alert.ubicacion_nombre || alert.ubicacion_texto || 'Punto registrado'}
          </strong>
          <span style="font-size: 0.72rem; color: #64748b;">
            Confianza Facial: <strong>${alert.porcentaje_confianza || 80}%</strong>
          </span>
        </div>
      `);
      layerGroup.addLayer(marker);
    });

    layerGroup.addTo(map);

    // Encuadrar el mapa suavemente
    if (alerts.length > 0) {
      const validCoords = alerts
        .map((a) => [parseFloat(a.ubicacion_lat || a.lat), parseFloat(a.ubicacion_lng || a.lng)])
        .filter(([lat, lng]) => !isNaN(lat) && !isNaN(lng));
      if (validCoords.length > 0) {
        try {
          map.fitBounds(validCoords, { padding: [40, 40], maxZoom: 15 });
        } catch (e) {
          // Fallback
        }
      }
    }

    return () => {
      if (map && layerGroup) {
        map.removeLayer(layerGroup);
      }
    };
  }, [map, points, alerts, lastKnownCoords]);

  return null;
};

const CaseDossierModal = ({ isOpen, caseId, onClose, onDispatchGps = null }) => {
  const [dossier, setDossier] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('capturas'); // 'capturas' | 'heatmap' | 'ficha' | 'timeline'
  const [previewPhoto, setPreviewPhoto] = useState(null);

  useEffect(() => {
    if (!isOpen || !caseId) return;

    const fetchDossier = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await api.get(`/cases/${caseId}/dossier`);
        setDossier(res.data);
      } catch (err) {
        console.error('Error cargando expediente del caso:', err);
        setError('No se pudo cargar el expediente forense completo.');
      } finally {
        setLoading(false);
      }
    };

    fetchDossier();
  }, [isOpen, caseId]);

  if (!isOpen) return null;

  const getImageUrl = (path) => {
    if (!path) return '';
    return `http://localhost:3001${path}`;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    const d = new Date(dateStr);
    return new Intl.DateTimeFormat('es-SV', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    }).format(d);
  };

  const caso = dossier?.caso || {};
  const alerts = dossier?.alertas || [];
  const heatmapPoints = dossier?.heatmapPoints || [];
  const timeline = dossier?.timeline || [];

  return (
    <div className="modal-overlay animate-fade-in" style={{ zIndex: 12000, overflowY: 'auto', padding: '1.5rem 1rem' }}>
      <div
        className="glass-panel"
        style={{
          maxWidth: '1080px',
          width: '100%',
          background: 'rgba(7, 13, 29, 0.98)',
          border: '1px solid rgba(0, 240, 255, 0.35)',
          borderRadius: '16px',
          boxShadow: '0 25px 65px rgba(0, 0, 0, 0.95), 0 0 30px rgba(0, 240, 255, 0.15)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          margin: 'auto'
        }}
      >
        {/* HEADER FORENSE DEL EXPEDIENTE */}
        <div style={{
          padding: '1.25rem 1.75rem',
          background: 'linear-gradient(90deg, rgba(15, 23, 42, 0.95) 0%, rgba(2, 132, 199, 0.2) 100%)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{
              width: '46px',
              height: '46px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #0284c7, #0369a1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              boxShadow: '0 0 20px rgba(2, 132, 199, 0.5)'
            }}>
              <FileText size={24} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <h2 style={{ margin: 0, fontSize: '1.35rem', color: '#f8fafc', fontWeight: 800 }}>
                  Expediente Biométrico Vivo #{caseId}
                </h2>
                <span style={{
                  background: caso.estado === 'Encontrado' ? '#10b981' : (caso.estado === 'En Proceso de Rescate' ? '#f59e0b' : '#ef4444'),
                  color: '#fff',
                  fontSize: '0.72rem',
                  fontWeight: 900,
                  padding: '0.15rem 0.6rem',
                  borderRadius: '9999px',
                  textTransform: 'uppercase'
                }}>
                  {caso.estado || 'Desaparecido'}
                </span>
              </div>
              <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.82rem', color: '#94a3b8' }}>
                Persona Buscada: <strong style={{ color: '#38bdf8' }}>{caso.nombre_desaparecido}</strong> • {alerts.length} evidencias fotográficas y capturas registradas
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
            {onDispatchGps && alerts.length > 0 && (
              <button
                onClick={() => {
                  onDispatchGps(alerts[0]);
                  onClose();
                }}
                className="btn btn-primary"
                style={{ fontSize: '0.8rem', padding: '0.45rem 0.85rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
              >
                <span>🚔</span>
                <span>Intercepción GPS PNC</span>
              </button>
            )}
            <button
              onClick={() => window.print()}
              className="btn btn-secondary"
              style={{ fontSize: '0.8rem', padding: '0.45rem 0.85rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
            >
              <Printer size={15} />
              <span>Imprimir Ficha</span>
            </button>
            <button
              onClick={onClose}
              className="btn btn-secondary"
              style={{ fontSize: '0.9rem', padding: '0.45rem 0.75rem' }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* NAVEGACIÓN MODULAR DEL EXPEDIENTE */}
        <div style={{
          display: 'flex',
          background: 'rgba(11, 20, 42, 0.9)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          padding: '0.35rem 1.5rem',
          gap: '0.5rem',
          overflowX: 'auto'
        }}>
          <button
            onClick={() => setActiveTab('capturas')}
            style={{
              background: activeTab === 'capturas' ? 'rgba(0, 240, 255, 0.15)' : 'none',
              border: 'none',
              borderBottom: activeTab === 'capturas' ? '2px solid #00f0ff' : '2px solid transparent',
              color: activeTab === 'capturas' ? '#00f0ff' : '#94a3b8',
              padding: '0.6rem 1rem',
              fontSize: '0.85rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem'
            }}
          >
            <Camera size={16} />
            <span>1. Capturas y Evidencias de Cámaras</span>
            <span style={{ background: 'rgba(0,240,255,0.2)', color: '#00f0ff', padding: '1px 6px', borderRadius: '10px', fontSize: '0.72rem' }}>
              {alerts.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('heatmap')}
            style={{
              background: activeTab === 'heatmap' ? 'rgba(245, 158, 11, 0.15)' : 'none',
              border: 'none',
              borderBottom: activeTab === 'heatmap' ? '2px solid #f59e0b' : '2px solid transparent',
              color: activeTab === 'heatmap' ? '#fbbf24' : '#94a3b8',
              padding: '0.6rem 1rem',
              fontSize: '0.85rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem'
            }}
          >
            <Flame size={16} />
            <span>2. Mapa de Calor de Desplazamiento</span>
            <span style={{ background: 'rgba(245, 158, 11, 0.2)', color: '#fbbf24', padding: '1px 6px', borderRadius: '10px', fontSize: '0.72rem' }}>
              {heatmapPoints.length} Pts GPS
            </span>
          </button>

          <button
            onClick={() => setActiveTab('ficha')}
            style={{
              background: activeTab === 'ficha' ? 'rgba(14, 165, 233, 0.15)' : 'none',
              border: 'none',
              borderBottom: activeTab === 'ficha' ? '2px solid #0ea5e9' : '2px solid transparent',
              color: activeTab === 'ficha' ? '#38bdf8' : '#94a3b8',
              padding: '0.6rem 1rem',
              fontSize: '0.85rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem'
            }}
          >
            <User size={16} />
            <span>3. Datos Enriquecidos y Perfil</span>
          </button>

          <button
            onClick={() => setActiveTab('timeline')}
            style={{
              background: activeTab === 'timeline' ? 'rgba(16, 185, 129, 0.15)' : 'none',
              border: 'none',
              borderBottom: activeTab === 'timeline' ? '2px solid #10b981' : '2px solid transparent',
              color: activeTab === 'timeline' ? '#34d399' : '#94a3b8',
              padding: '0.6rem 1rem',
              fontSize: '0.85rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem'
            }}
          >
            <Clock size={16} />
            <span>4. Cronología de la Investigación</span>
          </button>
        </div>

        {/* CONTENIDO PRINCIPAL */}
        <div style={{ padding: '1.5rem', maxHeight: '72vh', overflowY: 'auto' }}>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '4rem', flexDirection: 'column', gap: '1rem', color: '#94a3b8' }}>
              <div style={{ border: '3px solid rgba(255,255,255,0.1)', borderTop: '3px solid #00f0ff', borderRadius: '50%', width: '36px', height: '36px', animation: 'spin 1s linear infinite' }} />
              <span>Consolidando capturas de videovigilancia y peritaje biométrico...</span>
            </div>
          ) : error ? (
            <div className="auth-error text-center">{error}</div>
          ) : (
            <>
              {/* PESTAÑA 1: CAPTURAS Y EVIDENCIAS DE CÁMARAS Y CIUDADANOS */}
              {activeTab === 'capturas' && (
                <div className="animate-fade-in">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#f8fafc', fontWeight: 800 }}>
                        Registro Histórico de Capturas de Videovigilancia y Reportes
                      </h3>
                      <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.8rem', color: '#94a3b8' }}>
                        Todas las apariciones detectadas por cámaras IP autónomas y fotos enviadas por la ciudadanía
                      </p>
                    </div>
                    <span style={{ fontSize: '0.8rem', color: '#00f0ff', background: 'rgba(0, 240, 255, 0.1)', padding: '0.3rem 0.7rem', borderRadius: '8px', border: '1px solid rgba(0, 240, 255, 0.3)' }}>
                      Total Evidencias: <strong>{alerts.length}</strong>
                    </span>
                  </div>

                  {alerts.length === 0 ? (
                    <div style={{
                      padding: '3.5rem 2rem',
                      textAlign: 'center',
                      background: 'rgba(15, 23, 42, 0.5)',
                      borderRadius: '12px',
                      border: '1px dashed rgba(255, 255, 255, 0.1)'
                    }}>
                      <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>📷</div>
                      <h4 style={{ margin: 0, color: '#f8fafc' }}>Aún no se registran capturas de cámaras para este caso</h4>
                      <p style={{ color: '#94a3b8', fontSize: '0.85rem', maxWidth: '450px', margin: '0.5rem auto 0 auto' }}>
                        El motor de vigilancia autónoma InsightFace continúa escaneando la red CCTV en vivo. Cuando se reconozca el rostro o un ciudadano suba una foto, aparecerá aquí automáticamente.
                      </p>
                    </div>
                  ) : (
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                      gap: '1.25rem'
                    }}>
                      {alerts.map((alerta) => {
                        const isCamera = alerta.tipo_origen === 'Cámara IP' || alerta.tipo_origen === 'CCTV' || alerta.camara_id;
                        const isConfirmed = alerta.estado === 'confirmado' || alerta.id_estado_alerta === 2;
                        const isPending = alerta.estado === 'pendiente' || alerta.id_estado_alerta === 1;

                        return (
                          <div
                            key={alerta.id}
                            style={{
                              background: 'rgba(15, 23, 42, 0.85)',
                              border: isConfirmed ? '1px solid #10b981' : (isPending ? '1px solid #f59e0b' : '1px solid rgba(255, 255, 255, 0.1)'),
                              borderRadius: '12px',
                              overflow: 'hidden',
                              display: 'flex',
                              flexDirection: 'column',
                              boxShadow: '0 8px 25px rgba(0,0,0,0.5)',
                              position: 'relative'
                            }}
                          >
                            {/* Imagen de la captura con badge de confianza */}
                            <div style={{ position: 'relative', height: '180px', background: '#000', overflow: 'hidden' }}>
                              <img
                                src={getImageUrl(alerta.foto_evidencia_url)}
                                alt="Captura pericial"
                                style={{ width: '100%', height: '100%', objectFit: 'cover', cursor: 'pointer' }}
                                onClick={() => setPreviewPhoto(getImageUrl(alerta.foto_evidencia_url))}
                                onError={(e) => {
                                  e.target.src = 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=400&q=80';
                                }}
                              />

                              {/* Badge de Fuente */}
                              <div style={{
                                position: 'absolute',
                                top: '8px',
                                left: '8px',
                                background: isCamera ? 'rgba(2, 132, 199, 0.9)' : 'rgba(16, 185, 129, 0.9)',
                                color: '#fff',
                                fontSize: '0.68rem',
                                fontWeight: 800,
                                padding: '0.2rem 0.5rem',
                                borderRadius: '4px',
                                backdropFilter: 'blur(4px)'
                              }}>
                                {isCamera ? '📹 CÁMARA CCTV' : '👤 CIUDADANO'}
                              </div>

                              {/* Badge de Similitud ArcFace */}
                              <div style={{
                                position: 'absolute',
                                top: '8px',
                                right: '8px',
                                background: 'rgba(0, 0, 0, 0.85)',
                                border: '1px solid #00f0ff',
                                color: '#00f0ff',
                                fontSize: '0.72rem',
                                fontWeight: 900,
                                padding: '0.2rem 0.5rem',
                                borderRadius: '4px'
                              }}>
                                🧬 {alerta.porcentaje_confianza || 80}% IA
                              </div>

                              {/* Botón de lupa para ampliar */}
                              <button
                                onClick={() => setPreviewPhoto(getImageUrl(alerta.foto_evidencia_url))}
                                style={{
                                  position: 'absolute',
                                  bottom: '8px',
                                  right: '8px',
                                  background: 'rgba(0,0,0,0.7)',
                                  color: '#fff',
                                  border: 'none',
                                  borderRadius: '4px',
                                  padding: '4px 8px',
                                  cursor: 'pointer',
                                  fontSize: '0.75rem'
                                }}
                                title="Ver en resolución completa"
                              >
                                <ZoomIn size={14} />
                              </button>
                            </div>

                            {/* Detalles de la captura */}
                            <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.4rem', flex: 1, justifyContent: 'space-between' }}>
                              <div>
                                <div style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                  <Clock size={12} />
                                  <span>{formatDate(alerta.fecha_deteccion || alerta.created_at)}</span>
                                </div>
                                <div style={{ fontSize: '0.85rem', color: '#f8fafc', fontWeight: 700, marginTop: '0.2rem' }}>
                                  📍 {alerta.ubicacion_nombre || alerta.ubicacion_texto || 'Cámara en vía pública'}
                                </div>
                                {alerta.comentarios && (
                                  <p style={{ margin: '0.3rem 0 0 0', fontSize: '0.78rem', color: '#94a3b8', lineHeight: 1.4 }}>
                                    "{alerta.comentarios}"
                                  </p>
                                )}
                              </div>

                              <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                borderTop: '1px solid rgba(255,255,255,0.08)',
                                paddingTop: '0.6rem',
                                marginTop: '0.5rem'
                              }}>
                                <span style={{
                                  fontSize: '0.72rem',
                                  fontWeight: 800,
                                  color: isConfirmed ? '#4ade80' : (isPending ? '#fbbf24' : '#94a3b8')
                                }}>
                                  {isConfirmed ? '✓ CONFIRMADO' : (isPending ? '⌛ PENDIENTE' : 'DESCARTADO')}
                                </span>

                                <span style={{ fontSize: '0.7rem', color: '#64748b', fontFamily: 'monospace' }}>
                                  GPS: [{parseFloat(alerta.ubicacion_lat || 13.69).toFixed(3)}, {parseFloat(alerta.ubicacion_lng || -89.21).toFixed(3)}]
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* PESTAÑA 2: MAPA DE CALOR DE DESPLAZAMIENTO DEL CASO */}
              {activeTab === 'heatmap' && (
                <div className="animate-fade-in">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#fbbf24', display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 800 }}>
                        <Flame size={20} />
                        <span>Mapa de Calor Forense de Desplazamientos</span>
                      </h3>
                      <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.8rem', color: '#94a3b8' }}>
                        Zonas calientes con mayor concentración de detecciones del rostro de <strong>{caso.nombre_desaparecido}</strong>
                      </p>
                    </div>

                    <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.75rem', color: '#cbd5e1', background: 'rgba(245, 158, 11, 0.15)', padding: '0.3rem 0.65rem', borderRadius: '6px', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
                        Radio Estimado: <strong>~3.5 km</strong>
                      </span>
                    </div>
                  </div>

                  <div style={{
                    height: '460px',
                    borderRadius: '12px',
                    overflow: 'hidden',
                    border: '1px solid rgba(245, 158, 11, 0.4)',
                    boxShadow: '0 8px 30px rgba(0,0,0,0.6)',
                    position: 'relative'
                  }}>
                    <MapContainer
                      center={[parseFloat(caso.ubicacion_lat || 13.6989), parseFloat(caso.ubicacion_lng || -89.2155)]}
                      zoom={12}
                      style={{ height: '100%', width: '100%' }}
                    >
                      <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      />
                      <CaseHeatmapAndTrajectory
                        points={heatmapPoints}
                        alerts={alerts}
                        lastKnownCoords={[parseFloat(caso.ubicacion_lat || 13.6989), parseFloat(caso.ubicacion_lng || -89.2155)]}
                      />
                    </MapContainer>

                    {/* Leyenda Táctica del Mapa de Calor */}
                    <div style={{
                      position: 'absolute',
                      bottom: '12px',
                      left: '12px',
                      background: 'rgba(2, 6, 23, 0.9)',
                      padding: '0.5rem 0.85rem',
                      borderRadius: '8px',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      fontSize: '0.75rem',
                      color: '#cbd5e1',
                      zIndex: 1000,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.25rem'
                    }}>
                      <div style={{ fontWeight: 800, color: '#f59e0b', fontSize: '0.78rem' }}>LEYENDA PERICIAL:</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ef4444' }} />
                        <span>Zona de Mayor Presencia Facial</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <span style={{ width: '12px', height: '3px', background: '#f59e0b' }} />
                        <span>Trayectoria Cronológica Estimada</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* PESTAÑA 3: FICHA DE DATOS ENRIQUECIDOS */}
              {activeTab === 'ficha' && (
                <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
                    {/* Foto Principal y Biometría */}
                    <div style={{
                      background: 'rgba(15, 23, 42, 0.75)',
                      border: '1px solid rgba(0, 240, 255, 0.25)',
                      borderRadius: '12px',
                      padding: '1.25rem',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '1rem'
                    }}>
                      <img
                        src={getImageUrl(caso.foto_url)}
                        alt={caso.nombre_desaparecido}
                        style={{
                          width: '180px',
                          height: '220px',
                          borderRadius: '10px',
                          objectFit: 'cover',
                          border: '2px solid #00f0ff',
                          boxShadow: '0 0 20px rgba(0, 240, 255, 0.35)'
                        }}
                        onError={(e) => {
                          e.target.src = 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=400&q=80';
                        }}
                      />
                      <div style={{ textAlign: 'center' }}>
                        <h4 style={{ margin: 0, color: '#f8fafc', fontSize: '1.15rem' }}>{caso.nombre_desaparecido}</h4>
                        <span style={{ color: '#00f0ff', fontSize: '0.78rem', fontFamily: 'monospace' }}>VECTOR FACIAL 512-D ACTIVO</span>
                      </div>
                    </div>

                    {/* Ficha Descriptiva Integral */}
                    <div style={{
                      background: 'rgba(15, 23, 42, 0.75)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      borderRadius: '12px',
                      padding: '1.25rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.85rem'
                    }}>
                      <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#38bdf8', textTransform: 'uppercase' }}>
                        Detalles Físicos y Señas Particulares
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', fontSize: '0.85rem' }}>
                        <div>
                          <span style={{ color: '#94a3b8', fontSize: '0.72rem', display: 'block' }}>Edad Registrada</span>
                          <strong style={{ color: '#f8fafc' }}>{caso.edad} años</strong>
                        </div>
                        <div>
                          <span style={{ color: '#94a3b8', fontSize: '0.72rem', display: 'block' }}>Género</span>
                          <strong style={{ color: '#f8fafc' }}>{caso.genero}</strong>
                        </div>
                        <div>
                          <span style={{ color: '#94a3b8', fontSize: '0.72rem', display: 'block' }}>Estatura Aprox.</span>
                          <strong style={{ color: '#f8fafc' }}>{caso.estatura_cm ? `${caso.estatura_cm} cm` : 'No especificada'}</strong>
                        </div>
                        <div>
                          <span style={{ color: '#94a3b8', fontSize: '0.72rem', display: 'block' }}>Complexión</span>
                          <strong style={{ color: '#f8fafc' }}>{caso.complexion || 'Media'}</strong>
                        </div>
                      </div>

                      <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.06)', paddingTop: '0.75rem' }}>
                        <span style={{ color: '#94a3b8', fontSize: '0.72rem', display: 'block' }}>Vestimenta la última vez visto</span>
                        <div style={{ color: '#f8fafc', fontSize: '0.85rem', marginTop: '2px' }}>
                          {caso.vestimenta || 'Camisa oscura y pantalón de lona'}
                        </div>
                      </div>

                      <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.06)', paddingTop: '0.75rem' }}>
                        <span style={{ color: '#94a3b8', fontSize: '0.72rem', display: 'block' }}>Señas particulares (tatuajes, cicatrices, lunares)</span>
                        <div style={{ color: '#f8fafc', fontSize: '0.85rem', marginTop: '2px' }}>
                          {caso.senas_particulares || 'Sin señas específicas reportadas'}
                        </div>
                      </div>

                      {caso.condicion_medica && (
                        <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.06)', paddingTop: '0.75rem' }}>
                          <span style={{ color: '#f87171', fontSize: '0.72rem', display: 'block', fontWeight: 800 }}>⚠️ Condición Médica / Requiere Tratamiento</span>
                          <div style={{ color: '#fca5a5', fontSize: '0.85rem', marginTop: '2px' }}>
                            {caso.condicion_medica}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Datos del Reportante y Contacto de Urgencia */}
                  <div style={{
                    background: 'rgba(15, 23, 42, 0.6)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '12px',
                    padding: '1rem 1.25rem',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '1rem'
                  }}>
                    <div>
                      <span style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase' }}>Contacto de Emergencia Familiar</span>
                      <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#38bdf8' }}>
                        📞 {caso.telefono_contacto}
                      </div>
                      <span style={{ fontSize: '0.75rem', color: '#cbd5e1' }}>
                        Denunciante: {caso.creador_nombre} ({caso.creador_telefono})
                      </span>
                    </div>

                    <div>
                      <span style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase' }}>Lugar de Desaparición</span>
                      <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#f8fafc' }}>
                        📍 {caso.ubicacion_desaparicion}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* PESTAÑA 4: TIMELINE CRONOLÓGICO FORENSE */}
              {activeTab === 'timeline' && (
                <div className="animate-fade-in" style={{ padding: '0.5rem 1rem' }}>
                  <div style={{ position: 'relative', borderLeft: '2px solid rgba(56, 189, 248, 0.4)', paddingLeft: '1.5rem', marginLeft: '1rem' }}>
                    {timeline.map((event, idx) => (
                      <div key={idx} style={{ position: 'relative', marginBottom: '1.75rem' }}>
                        <div style={{
                          position: 'absolute',
                          left: '-2.15rem',
                          top: '0',
                          width: '26px',
                          height: '26px',
                          borderRadius: '50%',
                          background: '#0f172a',
                          border: '2px solid #38bdf8',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.8rem'
                        }}>
                          {event.icono || '•'}
                        </div>

                        <div style={{
                          background: 'rgba(15, 23, 42, 0.75)',
                          border: '1px solid rgba(255, 255, 255, 0.08)',
                          borderRadius: '10px',
                          padding: '0.85rem 1.1rem'
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                            <strong style={{ color: '#f8fafc', fontSize: '0.95rem' }}>{event.titulo}</strong>
                            <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>{formatDate(event.fecha)}</span>
                          </div>
                          <p style={{ margin: '0.35rem 0 0 0', fontSize: '0.82rem', color: '#cbd5e1' }}>
                            {event.descripcion}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* MODAL LIGHTBOX PARA AMPLIAR EVIDENCIA FOTOGRÁFICA */}
      {previewPhoto && (
        <div
          className="modal-overlay animate-fade-in"
          style={{ zIndex: 13000, background: 'rgba(0,0,0,0.92)' }}
          onClick={() => setPreviewPhoto(null)}
        >
          <div style={{ maxWidth: '800px', width: '90%', textAlign: 'center' }}>
            <img
              src={previewPhoto}
              alt="Evidencia forense en alta resolución"
              style={{ maxHeight: '80vh', maxWidth: '100%', borderRadius: '12px', border: '2px solid #00f0ff', boxShadow: '0 0 40px rgba(0, 240, 255, 0.5)' }}
            />
            <div style={{ marginTop: '0.75rem', color: '#cbd5e1', fontSize: '0.85rem' }}>
              Presiona en cualquier lugar para cerrar la vista ampliada
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CaseDossierModal;
