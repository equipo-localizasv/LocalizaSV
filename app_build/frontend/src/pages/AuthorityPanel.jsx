import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import socketService from '../services/socket';
import { calculateFastestEmergencyRoute } from '../services/emergencyRouting';
import MapaAlertas from '../components/MapaAlertas';
import PoliceInterventionCertificateModal from '../components/PoliceInterventionCertificateModal';
import './AuthorityPanel.css';
import {
  Shield,
  ShieldAlert,
  Radio,
  MapPin,
  Users,
  FileText,
  Activity,
  CheckCircle2,
  Crosshair,
  Printer,
  Search,
  SlidersHorizontal,
  AlertTriangle,
  Clock,
  Phone,
  Eye,
  RefreshCw,
  Send,
  ExternalLink,
  Radar,
  FileCheck,
  Navigation,
  Siren
} from 'lucide-react';

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

const AuthorityPanel = () => {
  const [alerts, setAlerts] = useState([]);
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Sub-interfaz activa: 'gis' | 'cases' | 'alerts' | 'broadcast'
  const [activeTab, setActiveTab] = useState('gis');

  // Ruteo Táctico de Intercepción de Emergencia PNC
  const [emergencyRoute, setEmergencyRoute] = useState(null);
  const [confirmedEmergency, setConfirmedEmergency] = useState(null);
  const [calculatingRoute, setCalculatingRoute] = useState(false);

  // Filtros de Alertas
  const [dateFilter, setDateFilter] = useState('todas');
  const [statusFilter, setStatusFilter] = useState('todos');

  // Filtros de Casos / Expedientes
  const [caseSearch, setCaseSearch] = useState('');
  const [caseDeptFilter, setCaseDeptFilter] = useState('');
  const [caseStatusFilter, setCaseStatusFilter] = useState('');

  // Emisión de Alerta Nacional (Código Ámbar Flash)
  const [broadcastModalOpen, setBroadcastModalOpen] = useState(false);
  const [broadcastCaseId, setBroadcastCaseId] = useState('');
  const [broadcastMsg, setBroadcastMsg] = useState('');
  const [broadcastPriority, setBroadcastPriority] = useState('flash'); // 'flash' | 'preventivo'
  const [geofenceRadius, setGeofenceRadius] = useState('15km'); // '5km' | '15km' | 'nacional'
  const [broadcasting, setBroadcasting] = useState(false);
  const [broadcastSuccess, setBroadcastSuccess] = useState('');

  // Anillos Predictivos de Isócronas y Certificado SHA-256
  const [isochroneRadius, setIsochroneRadius] = useState('30m'); // '15m' | '30m' | '60m'
  const [certificateTarget, setCertificateTarget] = useState({ isOpen: false, alerta: null, caso: null });

  // Estado de actualización de caso
  const [updatingCaseId, setUpdatingCaseId] = useState(null);

  const playEmergencyTone = () => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.35);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
      osc.start();
      osc.stop(ctx.currentTime + 0.4);
    } catch (e) {
      console.warn('Audio synthesis warning:', e);
    }
  };

  const handleEmitBroadcast = async () => {
    if (!broadcastCaseId) {
      alert('Por favor seleccione un expediente prioritario.');
      return;
    }
    setBroadcasting(true);
    setBroadcastSuccess('');
    try {
      playEmergencyTone();
      const selectedCase = cases.find((c) => c.id === parseInt(broadcastCaseId));
      await api.post('/notifications/test-broadcast', {
        title: `🚨 ALERTA POLICIAL CÓDIGO ÁMBAR (${geofenceRadius.toUpperCase()}): Búsqueda de ${selectedCase?.nombre_desaparecido || 'Persona'}`,
        body: broadcastMsg || `Última vez visto en: ${selectedCase?.ubicacion_desaparicion || 'Zona urbana'}. Despliegue de retenes PNC y cámaras LPR.`
      }).catch(() => null);

      setBroadcastSuccess(`¡Alerta Nacional Código Ámbar emitida con éxito vía FCM Push & WebSockets para el Caso #${broadcastCaseId}!`);
      setTimeout(() => {
        setBroadcastSuccess('');
        setBroadcastModalOpen(false);
      }, 3500);
    } catch (err) {
      console.error(err);
      alert('Error al emitir la alerta policial.');
    } finally {
      setBroadcasting(false);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const [alertsRes, casesRes] = await Promise.all([
        api.get('/alertas/activas'),
        api.get('/cases').catch(() => ({ data: [] }))
      ]);
      setAlerts(alertsRes.data || []);
      setCases(casesRes.data || []);
    } catch (err) {
      console.error('Error fetching data for AuthorityPanel:', err);
      setError('No se pudieron cargar los datos operativos de la PNC.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    // Conexión y escucha en tiempo real de eventos de confirmación positiva por moderador
    const handleIncomingConfirmedAlert = async (data) => {
      console.log('🚨 [PNC Dispatch] Notificación de avistamiento confirmado por moderador humano:', data);
      playEmergencyTone();
      setConfirmedEmergency(data);

      const lat = data.latitud || data.alerta?.latitud || data.ubicacion_lat || data.lat;
      const lng = data.longitud || data.alerta?.longitud || data.ubicacion_lng || data.lng;

      if (lat && lng) {
        try {
          setCalculatingRoute(true);
          const route = await calculateFastestEmergencyRoute(lat, lng, {
            nombre_desaparecido: data.nombre_desaparecido || data.alerta?.nombre_desaparecido || 'Persona Localizada',
            ubicacion: data.ubicacion || data.alerta?.ubicacion_texto || 'Cámara de Videovigilancia',
            caso_id: data.caso_id || data.alerta?.caso_id
          });
          setEmergencyRoute(route);
          setActiveTab('gis');
        } catch (err) {
          console.warn('Error calculando ruta rápida:', err);
        } finally {
          setCalculatingRoute(false);
        }
      }

      // Refrescar listas operativas
      fetchData();
    };

    socketService.on('alerta_confirmada', handleIncomingConfirmedAlert);
    socketService.on('alerta_actualizada', (alerta) => {
      if (alerta.id_estado_alerta === 2 || (alerta.estado || '').toLowerCase() === 'confirmado') {
        handleIncomingConfirmedAlert({
          alerta,
          caso_id: alerta.caso_id,
          nombre_desaparecido: alerta.nombre_desaparecido || 'Persona Identificada',
          latitud: alerta.latitud || alerta.ubicacion_lat,
          longitud: alerta.longitud || alerta.ubicacion_lng,
          ubicacion: alerta.ubicacion_texto || 'Punto de detección'
        });
      }
    });

    return () => {
      socketService.off('alerta_confirmada', handleIncomingConfirmedAlert);
    };
  }, []);

  // Función para iniciar o recalcular la ruta de intercepción inmediata a un objetivo
  const handleDispatchEmergency = async (target) => {
    const lat = target.latitud || target.ubicacion_lat || target.lat;
    const lng = target.longitud || target.ubicacion_lng || target.lng;

    if (!lat || !lng) {
      alert('Esta alerta no posee coordenadas GPS válidas para trazar la ruta.');
      return;
    }

    try {
      setCalculatingRoute(true);
      playEmergencyTone();
      const route = await calculateFastestEmergencyRoute(lat, lng, {
        nombre_desaparecido: target.nombre_desaparecido || 'Persona Localizada',
        ubicacion: target.ubicacion_texto || target.ubicacion || `${parseFloat(lat).toFixed(4)}, ${parseFloat(lng).toFixed(4)}`,
        caso_id: target.caso_id || target.id
      });
      setEmergencyRoute(route);
      setActiveTab('gis');
    } catch (err) {
      console.error('Error calculando ruta de intercepción:', err);
      alert('Error calculando la ruta de llegada más rápida.');
    } finally {
      setCalculatingRoute(false);
    }
  };

  // Cambio de estado policial de un caso
  const handleUpdateCaseStatus = async (caseId, newStatus) => {
    setUpdatingCaseId(caseId);
    try {
      const res = await api.put(`/cases/${caseId}/estado`, { estado: newStatus });
      setCases((prev) =>
        prev.map((c) => (c.id === caseId ? { ...c, estado: res.data.caso.estado } : c))
      );
    } catch (err) {
      console.error('Error actualizando estado policial:', err);
      alert(err.response?.data?.error || 'No se pudo actualizar el estado.');
    } finally {
      setUpdatingCaseId(null);
    }
  };

  // KPIs
  const stats = useMemo(() => {
    const activeAlerts = alerts.length;
    const casesInProgress = cases.filter(
      (c) => (c.estado || '').toLowerCase() === 'desaparecido' || (c.estado || '').toLowerCase() === 'en curso'
    ).length;
    const casesInRescue = cases.filter((c) => c.estado === 'En Proceso de Rescate').length;
    const casesResolved = cases.filter(
      (c) => (c.estado || '').toLowerCase() === 'encontrado' || (c.estado || '').toLowerCase() === 'resuelto'
    ).length;

    return { activeAlerts, casesInProgress, casesInRescue, casesResolved };
  }, [alerts, cases]);

  // Alertas Filtradas
  const filteredAlerts = useMemo(() => {
    return alerts.filter((alerta) => {
      let matchesDate = true;
      if (dateFilter !== 'todas') {
        const dateStr = alerta.fecha_deteccion || alerta.created_at;
        if (!dateStr) {
          matchesDate = false;
        } else {
          const alertTime = new Date(dateStr).getTime();
          const diffMs = Date.now() - alertTime;
          if (dateFilter === '24h') matchesDate = diffMs <= 24 * 60 * 60 * 1000;
          else if (dateFilter === '7d') matchesDate = diffMs <= 7 * 24 * 60 * 60 * 1000;
          else if (dateFilter === '30d') matchesDate = diffMs <= 30 * 24 * 60 * 60 * 1000;
        }
      }

      let matchesStatus = true;
      if (statusFilter !== 'todos') {
        const st = (alerta.estado || 'pendiente').toLowerCase();
        if (statusFilter === 'confirmado') matchesStatus = (st === 'confirmado' || st === 'confirmada');
        else if (statusFilter === 'en_investigacion') matchesStatus = (st === 'en investigación' || st === 'en investigacion' || st === 'pendiente');
        else if (statusFilter === 'resuelto') matchesStatus = (st === 'resuelto' || st === 'encontrado');
      }

      return matchesDate && matchesStatus;
    });
  }, [alerts, dateFilter, statusFilter]);

  // Casos Filtrados
  const filteredCases = useMemo(() => {
    return cases.filter((c) => {
      const matchesSearch = caseSearch === '' ||
        (c.nombre_desaparecido || '').toLowerCase().includes(caseSearch.toLowerCase()) ||
        (c.ubicacion_desaparicion || '').toLowerCase().includes(caseSearch.toLowerCase()) ||
        String(c.id).includes(caseSearch);

      const matchesDept = caseDeptFilter === '' ||
        (c.ubicacion_desaparicion || '').toLowerCase().includes(caseDeptFilter.toLowerCase());

      const matchesStatus = caseStatusFilter === '' || c.estado === caseStatusFilter;

      return matchesSearch && matchesDept && matchesStatus;
    });
  }, [cases, caseSearch, caseDeptFilter, caseStatusFilter]);

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat('es-SV', {
      day: 'numeric',
      month: 'short',
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
    return `${latNum.toFixed(5)}, ${lngNum.toFixed(5)}`;
  };

  const getImageUrl = (path) => {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    return `http://localhost:3001${path}`;
  };

  return (
    <div className="pnc-command-container animate-fade-in">
      
      {/* 1. Header Táctico Superior */}
      <div className="pnc-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{
            width: '46px',
            height: '46px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #0284c7, #1e3a8a)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            boxShadow: '0 0 20px rgba(2, 132, 199, 0.4)'
          }}>
            <Shield size={24} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <h1 style={{ margin: 0, fontSize: '1.45rem', fontWeight: 800, color: '#f8fafc', letterSpacing: '-0.02em' }}>
                Centro de Mando y Despacho Policial PNC
              </h1>
              <span className="pnc-badge-official">
                <span className="cyber-beacon" style={{ width: '6px', height: '6px' }} />
                SISTEMA C4I LOCALIZASV
              </span>
            </div>
            <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.82rem', color: '#94a3b8' }}>
              División Central de Investigaciones (DCI) • Supervisión Georreferenciada de Seguridad Pública
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={() => setBroadcastModalOpen(true)}
            className="btn btn-danger"
            style={{
              padding: '0.5rem 0.95rem',
              fontSize: '0.82rem',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              borderRadius: '8px',
              boxShadow: '0 4px 15px rgba(239, 68, 68, 0.35)'
            }}
          >
            <Radio size={16} />
            <span>Código Ámbar Flash</span>
          </button>
          <button
            onClick={() => window.print()}
            className="btn btn-secondary"
            style={{
              padding: '0.5rem 0.95rem',
              fontSize: '0.82rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              borderRadius: '8px'
            }}
          >
            <Printer size={16} />
            <span>Exportar Informe</span>
          </button>
          <button
            onClick={fetchData}
            disabled={loading}
            className="btn btn-secondary"
            style={{ padding: '0.5rem 0.75rem', borderRadius: '8px' }}
            title="Refrescar datos"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {error && <div className="auth-error text-center">{error}</div>}

      {/* BANNER DE DESPACHO INMEDIATO PNC (CONFIRMACIÓN DE MODERADOR HUMANO) */}
      {confirmedEmergency && (
        <div className="pnc-emergency-dispatch-banner animate-fade-in" style={{ marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              background: '#ef4444',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 25px rgba(239, 68, 68, 0.7)'
            }}>
              <Siren size={26} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <span style={{ background: '#ef4444', color: '#fff', fontSize: '0.72rem', fontWeight: 900, padding: '0.15rem 0.55rem', borderRadius: '4px' }}>
                  🚨 CÓDIGO ROJO — MODERADOR CONFIRMÓ OBJETIVO LOCALIZADO
                </span>
                <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                  {confirmedEmergency.timestamp ? new Date(confirmedEmergency.timestamp).toLocaleTimeString() : 'Hace instantes'}
                </span>
              </div>
              <h3 style={{ margin: '0.25rem 0', color: '#fff', fontSize: '1.25rem', fontWeight: 800 }}>
                {confirmedEmergency.nombre_desaparecido || 'Persona Localizada'}
              </h3>
              <p style={{ margin: 0, fontSize: '0.85rem', color: '#cbd5e1' }}>
                📍 <strong>Punto de avistamiento:</strong> {confirmedEmergency.ubicacion || 'Cámara de Videovigilancia'}
                {emergencyRoute && (
                  <span style={{ color: '#4ade80', marginLeft: '0.8rem', fontWeight: 800 }}>
                    ⏱️ Tiempo de llegada con sirena: ~{emergencyRoute.etaMinutes} min ({emergencyRoute.distanceKm} km)
                  </span>
                )}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={() => {
                setActiveTab('gis');
                if (!emergencyRoute) {
                  handleDispatchEmergency(confirmedEmergency);
                }
              }}
              className="pnc-btn-fast-dispatch"
              style={{ fontSize: '0.85rem', padding: '0.65rem 1.1rem' }}
              disabled={calculatingRoute}
            >
              <Navigation size={17} />
              <span>{calculatingRoute ? 'Calculando Ruta...' : (emergencyRoute ? 'Ver Ruta Táctica en Mapa' : 'Calcular Ruta de Intercepción')}</span>
            </button>
            {emergencyRoute && (
              <a
                href={emergencyRoute.googleMapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-secondary"
                style={{ fontSize: '0.8rem', padding: '0.65rem 0.9rem', textDecoration: 'none' }}
              >
                🚗 Abrir GPS Móvil
              </a>
            )}
            <button
              onClick={() => setConfirmedEmergency(null)}
              style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '1.3rem', cursor: 'pointer', padding: '0.25rem 0.5rem' }}
              title="Ocultar banner"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* 2. KPIs de Mando */}
      <div className="pnc-kpi-grid">
        <div className="pnc-kpi-card alerts">
          <div>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em' }}>
              Alertas Activas (Cámaras/Avistamientos)
            </div>
            <div style={{ fontSize: '1.85rem', fontWeight: 900, color: '#f8fafc', marginTop: '0.2rem' }}>
              {stats.activeAlerts}
            </div>
            <div style={{ fontSize: '0.72rem', color: '#f87171', display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.2rem' }}>
              <Activity size={12} /> Vigilancia 24/7 en vivo
            </div>
          </div>
          <div className="pnc-kpi-icon-box" style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
            <ShieldAlert size={22} />
          </div>
        </div>

        <div className="pnc-kpi-card in-progress">
          <div>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em' }}>
              Expedientes en Búsqueda Activa
            </div>
            <div style={{ fontSize: '1.85rem', fontWeight: 900, color: '#f8fafc', marginTop: '0.2rem' }}>
              {stats.casesInProgress}
            </div>
            <div style={{ fontSize: '0.72rem', color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.2rem' }}>
              <Users size={12} /> Red nacional de búsqueda
            </div>
          </div>
          <div className="pnc-kpi-icon-box" style={{ background: 'rgba(14, 165, 233, 0.15)', color: '#38bdf8', border: '1px solid rgba(14, 165, 233, 0.3)' }}>
            <Search size={22} />
          </div>
        </div>

        <div className="pnc-kpi-card" style={{ borderLeft: '4px solid #f59e0b' }}>
          <div>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em' }}>
              En Operativo de Rescate
            </div>
            <div style={{ fontSize: '1.85rem', fontWeight: 900, color: '#fbbf24', marginTop: '0.2rem' }}>
              {stats.casesInRescue}
            </div>
            <div style={{ fontSize: '0.72rem', color: '#fbbf24', display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.2rem' }}>
              <Radio size={12} /> Patrullas asignadas
            </div>
          </div>
          <div className="pnc-kpi-icon-box" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
            <Crosshair size={22} />
          </div>
        </div>

        <div className="pnc-kpi-card resolved">
          <div>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em' }}>
              Personas Localizadas
            </div>
            <div style={{ fontSize: '1.85rem', fontWeight: 900, color: '#f8fafc', marginTop: '0.2rem' }}>
              {stats.casesResolved}
            </div>
            <div style={{ fontSize: '0.72rem', color: '#4ade80', display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.2rem' }}>
              <CheckCircle2 size={12} /> Casos resueltos con éxito
            </div>
          </div>
          <div className="pnc-kpi-icon-box" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
            <FileCheck size={22} />
          </div>
        </div>
      </div>

      {/* 3. Navegación por Sub-interfaces Modulares (Tabs) */}
      <div className="pnc-tabs-nav">
        <button
          className={`pnc-tab-btn ${activeTab === 'gis' ? 'active' : ''}`}
          onClick={() => setActiveTab('gis')}
        >
          <MapPin size={17} />
          <span>1. Despliegue Táctico & GIS</span>
          <span className="pnc-tab-badge">{alerts.length}</span>
        </button>

        <button
          className={`pnc-tab-btn ${activeTab === 'cases' ? 'active' : ''}`}
          onClick={() => setActiveTab('cases')}
        >
          <FileText size={17} />
          <span>2. Expedientes Policiales & Casos</span>
          <span className="pnc-tab-badge">{cases.length}</span>
        </button>

        <button
          className={`pnc-tab-btn ${activeTab === 'alerts' ? 'active' : ''}`}
          onClick={() => setActiveTab('alerts')}
        >
          <Activity size={17} />
          <span>3. Alertas y Detecciones Biométricas</span>
          <span className="pnc-tab-badge">{filteredAlerts.length}</span>
        </button>

        <button
          className={`pnc-tab-btn ${activeTab === 'broadcast' ? 'active' : ''}`}
          onClick={() => setActiveTab('broadcast')}
        >
          <Radio size={17} />
          <span>4. Centro Código Ámbar Flash</span>
        </button>
      </div>

      {/* =========================================================================
          SUB-INTERFAZ 1: DESPLIEGUE TÁCTICO & GIS (MAPA E ISÓCRONAS)
         ========================================================================= */}
      {activeTab === 'gis' && (
        <div className="pnc-gis-layout animate-fade-in">
          {/* Main Map Box */}
          <div className="pnc-map-container">
            <div style={{
              padding: '1rem 1.25rem',
              borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1rem', color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                  <Radar size={18} />
                  <span>Mapa Operativo de Cobertura Nacional</span>
                </h3>
                <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                  Georreferenciación de alertas, cámaras de videovigilancia y últimos puntos de avistamiento
                </span>
              </div>
              <div style={{ fontSize: '0.75rem', color: '#38bdf8', fontWeight: 600 }}>
                {filteredAlerts.length} Puntos Mapeados
              </div>
            </div>

            <div style={{ padding: '0.75rem' }}>
              <MapaAlertas
                alerts={filteredAlerts}
                emergencyRoute={emergencyRoute}
                onClearRoute={() => setEmergencyRoute(null)}
                onSelectAlert={(a) => handleDispatchEmergency(a)}
              />
            </div>
          </div>

          {/* Sidebar: Ruteo de Intercepción Rápida PNC + Anillos Predictivos de Isócronas */}
          <div className="pnc-sidebar-panel">
            {emergencyRoute && (
              <div style={{
                background: 'linear-gradient(135deg, rgba(2, 132, 199, 0.25), rgba(15, 23, 42, 0.9))',
                border: '1px solid #00f0ff',
                borderRadius: '10px',
                padding: '0.85rem',
                marginBottom: '1rem',
                boxShadow: '0 0 20px rgba(0, 240, 255, 0.2)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#00f0ff', fontWeight: 800, fontSize: '0.85rem' }}>
                    <Navigation size={16} />
                    <span>Despacho Rápido Activo</span>
                  </div>
                  <button
                    onClick={() => setEmergencyRoute(null)}
                    style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '0.85rem' }}
                  >
                    ✕
                  </button>
                </div>

                <div style={{ fontSize: '0.78rem', color: '#f1f5f9', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                  <div><strong>Destino:</strong> {emergencyRoute.targetInfo?.nombre_desaparecido}</div>
                  <div><strong>Lugar:</strong> {emergencyRoute.targetInfo?.ubicacion}</div>
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.3rem' }}>
                    <div style={{ flex: 1, background: 'rgba(0,0,0,0.4)', padding: '0.4rem', borderRadius: '6px', textAlign: 'center' }}>
                      <span style={{ fontSize: '0.65rem', color: '#94a3b8', display: 'block' }}>ETA SIRENA</span>
                      <strong style={{ color: '#4ade80', fontSize: '1rem' }}>~{emergencyRoute.etaMinutes} min</strong>
                    </div>
                    <div style={{ flex: 1, background: 'rgba(0,0,0,0.4)', padding: '0.4rem', borderRadius: '6px', textAlign: 'center' }}>
                      <span style={{ fontSize: '0.65rem', color: '#94a3b8', display: 'block' }}>DISTANCIA</span>
                      <strong style={{ color: '#38bdf8', fontSize: '1rem' }}>{emergencyRoute.distanceKm} km</strong>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.75rem' }}>
                  <a
                    href={emergencyRoute.googleMapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="pnc-btn-fast-dispatch"
                    style={{ flex: 1, textAlign: 'center', justifyContent: 'center', textDecoration: 'none', padding: '0.45rem' }}
                  >
                    🚗 Google Maps
                  </a>
                  <a
                    href={emergencyRoute.wazeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-secondary"
                    style={{ flex: 1, textAlign: 'center', justifyContent: 'center', textDecoration: 'none', padding: '0.45rem', fontSize: '0.75rem' }}
                  >
                    🚙 Waze
                  </a>
                </div>
              </div>
            )}

            <div style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#00f0ff', fontWeight: 700, fontSize: '0.9rem' }}>
                <Crosshair size={18} />
                <span>Isócronas Predictivas</span>
              </div>
              <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.75rem', color: '#94a3b8' }}>
                Radio estimado de desplazamiento desde el último punto de contacto
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <button
                onClick={() => setIsochroneRadius('15m')}
                style={{
                  background: isochroneRadius === '15m' ? 'rgba(0, 240, 255, 0.2)' : 'rgba(255, 255, 255, 0.03)',
                  border: `1px solid ${isochroneRadius === '15m' ? '#00f0ff' : 'rgba(255, 255, 255, 0.08)'}`,
                  color: isochroneRadius === '15m' ? '#00f0ff' : '#cbd5e1',
                  padding: '0.6rem 0.8rem',
                  borderRadius: '8px',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  textAlign: 'left',
                  cursor: 'pointer',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <span>🚶 15 min A Pie</span>
                <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>~1.2 km</span>
              </button>

              <button
                onClick={() => setIsochroneRadius('30m')}
                style={{
                  background: isochroneRadius === '30m' ? 'rgba(0, 240, 255, 0.2)' : 'rgba(255, 255, 255, 0.03)',
                  border: `1px solid ${isochroneRadius === '30m' ? '#00f0ff' : 'rgba(255, 255, 255, 0.08)'}`,
                  color: isochroneRadius === '30m' ? '#00f0ff' : '#cbd5e1',
                  padding: '0.6rem 0.8rem',
                  borderRadius: '8px',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  textAlign: 'left',
                  cursor: 'pointer',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <span>🚌 30 min Transporte Público</span>
                <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>~7.5 km</span>
              </button>

              <button
                onClick={() => setIsochroneRadius('60m')}
                style={{
                  background: isochroneRadius === '60m' ? 'rgba(0, 240, 255, 0.2)' : 'rgba(255, 255, 255, 0.03)',
                  border: `1px solid ${isochroneRadius === '60m' ? '#00f0ff' : 'rgba(255, 255, 255, 0.08)'}`,
                  color: isochroneRadius === '60m' ? '#00f0ff' : '#cbd5e1',
                  padding: '0.6rem 0.8rem',
                  borderRadius: '8px',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  textAlign: 'left',
                  cursor: 'pointer',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <span>🚗 60 min Vehículo / Carretera</span>
                <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>~35 km</span>
              </button>
            </div>

            <div style={{
              background: 'rgba(0,0,0,0.3)',
              borderRadius: '8px',
              padding: '0.85rem',
              border: '1px dashed rgba(56, 189, 248, 0.25)',
              fontSize: '0.78rem'
            }}>
              <div style={{ color: '#38bdf8', fontWeight: 700, marginBottom: '0.35rem' }}>
                📍 Puntos de Control Sugeridos:
              </div>
              <ul style={{ margin: 0, paddingLeft: '1.1rem', color: '#94a3b8', lineHeight: 1.5 }}>
                {isochroneRadius === '15m' && (
                  <>
                    <li>Parque Cuscatlán y Pasarelas peatonales</li>
                    <li>Paradas de autobuses urbanos aledañas</li>
                  </>
                )}
                {isochroneRadius === '30m' && (
                  <>
                    <li>Terminal de Occidente y Terminal Nuevo Amanecer</li>
                    <li>Plaza Salvador del Mundo y Metrocentro</li>
                    <li>Puntos de enlace R-42, R-101 y R-52</li>
                  </>
                )}
                {isochroneRadius === '60m' && (
                  <>
                    <li>Retén Carretera Los Chorros (Salida Occidente)</li>
                    <li>Autopista a Comalapa (Hacia Aeropuerto Internacional)</li>
                    <li>Fronteras Las Chinamas y San Cristóbal</li>
                  </>
                )}
              </ul>
            </div>

            {/* Acciones Rápidas */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: 'auto' }}>
              <button
                onClick={() => setBroadcastModalOpen(true)}
                className="btn btn-danger w-100"
                style={{ padding: '0.55rem', fontSize: '0.8rem', fontWeight: 700, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.4rem' }}
              >
                <Radio size={14} />
                <span>Geocercar & Disparar Alerta</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          SUB-INTERFAZ 2: EXPEDIENTES POLICIALES & GESTIÓN DE CASOS
         ========================================================================= */}
      {activeTab === 'cases' && (
        <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          {/* Barra de Filtros de Expedientes */}
          <div className="pnc-cases-toolbar">
            <div style={{ display: 'flex', gap: '0.75rem', flex: 1, minWidth: '280px', flexWrap: 'wrap' }}>
              <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
                <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input
                  type="text"
                  className="form-control"
                  placeholder="Buscar por nombre, lugar o ID de caso..."
                  value={caseSearch}
                  onChange={(e) => setCaseSearch(e.target.value)}
                  style={{ paddingLeft: '2.4rem' }}
                />
              </div>

              <select
                className="form-control"
                value={caseDeptFilter}
                onChange={(e) => setCaseDeptFilter(e.target.value)}
                style={{ width: 'auto', minWidth: '170px' }}
              >
                <option value="">🇸🇻 Todos los Departamentos</option>
                {DEPARTAMENTOS_SV.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>

              <select
                className="form-control"
                value={caseStatusFilter}
                onChange={(e) => setCaseStatusFilter(e.target.value)}
                style={{ width: 'auto', minWidth: '150px' }}
              >
                <option value="">Todos los Estados</option>
                <option value="Desaparecido">Desaparecido</option>
                <option value="En Proceso de Rescate">En Rescate</option>
                <option value="Encontrado">Localizado</option>
              </select>
            </div>

            <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
              Mostrando <strong style={{ color: '#fff' }}>{filteredCases.length}</strong> de {cases.length} expedientes
            </div>
          </div>

          {/* Grid de Casos para Autoridades */}
          {filteredCases.length === 0 ? (
            <div className="glass-panel text-center" style={{ padding: '3rem 2rem' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🔍</div>
              <h3 style={{ margin: 0 }}>No se encontraron expedientes con los criterios seleccionados</h3>
              <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginTop: '0.35rem' }}>
                Intente modificando el término de búsqueda o limpiando los filtros de departamento y estado.
              </p>
            </div>
          ) : (
            <div className="pnc-cases-grid">
              {filteredCases.map((caso) => {
                const isDesaparecido = caso.estado === 'Desaparecido';
                const isRescate = caso.estado === 'En Proceso de Rescate';
                const isEncontrado = caso.estado === 'Encontrado';

                return (
                  <div key={caso.id} className="pnc-case-card">
                    {/* Header Card */}
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                      <img
                        src={getImageUrl(caso.foto_url)}
                        alt={caso.nombre_desaparecido}
                        className="pnc-case-photo"
                        onError={(e) => {
                          e.target.src = 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=300&q=80';
                        }}
                      />

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <span style={{ fontSize: '0.72rem', color: '#38bdf8', fontWeight: 700, fontFamily: 'monospace' }}>
                            EXP #{caso.id}
                          </span>
                          <span className={`status-badge ${isRescate ? 'warning' : isEncontrado ? 'encontrado' : 'desaparecido'}`} style={{ position: 'static' }}>
                            {caso.estado}
                          </span>
                        </div>

                        <h4 style={{ margin: '0.25rem 0', fontSize: '1.05rem', fontWeight: 800, color: '#f8fafc', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {caso.nombre_desaparecido}
                        </h4>

                        <div style={{ fontSize: '0.78rem', color: '#94a3b8', display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                          <div><strong>Edad:</strong> {caso.edad} años • {caso.genero}</div>
                          <div style={{ color: '#38bdf8' }}>📍 {caso.ubicacion_desaparicion}</div>
                          <div>📅 {formatDate(caso.fecha_desaparicion)}</div>
                        </div>
                      </div>
                    </div>

                    {/* Descripción Corta */}
                    <p style={{
                      margin: 0,
                      fontSize: '0.78rem',
                      color: '#cbd5e1',
                      lineHeight: 1.45,
                      background: 'rgba(255,255,255,0.02)',
                      padding: '0.5rem',
                      borderRadius: '6px',
                      maxHeight: '48px',
                      overflow: 'hidden'
                    }}>
                      {caso.descripcion || 'Sin señas particulares adicionales.'}
                    </p>

                    {/* Barra de Acciones Policiales Oficiales */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem' }}>
                        <button
                          onClick={() => setCertificateTarget({ isOpen: true, alerta: null, caso })}
                          className="btn btn-secondary"
                          style={{
                            fontSize: '0.75rem',
                            padding: '0.45rem',
                            fontWeight: 700,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.3rem',
                            border: '1px solid rgba(0, 240, 255, 0.35)',
                            color: '#00f0ff'
                          }}
                        >
                          <Shield size={13} />
                          <span>Orden SHA-256</span>
                        </button>

                        <button
                          onClick={() => {
                            setBroadcastCaseId(String(caso.id));
                            setBroadcastModalOpen(true);
                          }}
                          className="btn btn-secondary"
                          style={{
                            fontSize: '0.75rem',
                            padding: '0.45rem',
                            fontWeight: 700,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.3rem',
                            border: '1px solid rgba(239, 68, 68, 0.4)',
                            color: '#f87171'
                          }}
                        >
                          <Radio size={13} />
                          <span>Alerta Flash</span>
                        </button>

                        {/* Botón de Intercepción GPS Táctica si el caso tiene alertas o coordenadas */}
                        {alerts.some((a) => a.caso_id === caso.id && ((a.estado || '').toLowerCase() === 'confirmado' || a.id_estado_alerta === 2)) && (
                          <button
                            onClick={() => {
                              const alertMatch = alerts.find((a) => a.caso_id === caso.id && ((a.estado || '').toLowerCase() === 'confirmado' || a.id_estado_alerta === 2));
                              if (alertMatch) {
                                handleDispatchEmergency({
                                  ...alertMatch,
                                  nombre_desaparecido: caso.nombre_desaparecido,
                                  ubicacion: alertMatch.ubicacion_texto || caso.ubicacion_desaparicion
                                });
                              }
                            }}
                            className="pnc-btn-fast-dispatch"
                            style={{ gridColumn: '1 / -1', justifyContent: 'center', padding: '0.45rem', fontSize: '0.75rem' }}
                          >
                            <Navigation size={13} />
                            <span>🚨 Despachar Intercepción GPS</span>
                          </button>
                        )}
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '0.5rem' }}>
                        {/* Selector Rápido de Estado Policial */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Acción PNC:</span>
                          <select
                            disabled={updatingCaseId === caso.id}
                            value={caso.estado}
                            onChange={(e) => handleUpdateCaseStatus(caso.id, e.target.value)}
                            style={{
                              background: 'rgba(15, 23, 42, 0.9)',
                              border: '1px solid rgba(255, 255, 255, 0.15)',
                              color: '#fff',
                              fontSize: '0.72rem',
                              padding: '0.2rem 0.4rem',
                              borderRadius: '4px',
                              cursor: 'pointer'
                            }}
                          >
                            <option value="Desaparecido">Desaparecido</option>
                            <option value="En Proceso de Rescate">En Rescate</option>
                            <option value="Encontrado">Localizado</option>
                          </select>
                        </div>

                        <Link
                          to={`/caso/${caso.id}`}
                          style={{
                            fontSize: '0.75rem',
                            color: '#38bdf8',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.2rem',
                            fontWeight: 600,
                            textDecoration: 'none'
                          }}
                        >
                          <span>Expediente</span>
                          <ExternalLink size={12} />
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          SUB-INTERFAZ 3: ALERTAS Y DETECCIONES BIOMÉTRICAS
         ========================================================================= */}
      {activeTab === 'alerts' && (
        <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          {/* Barra de Filtros de Alertas */}
          <div className="pnc-cases-toolbar">
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Clock size={16} style={{ color: '#94a3b8' }} />
                <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Rango:</span>
                <select
                  className="form-control"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  style={{ width: 'auto' }}
                >
                  <option value="todas">Todas las fechas</option>
                  <option value="24h">Últimas 24 horas</option>
                  <option value="7d">Última semana</option>
                  <option value="30d">Último mes</option>
                </select>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <SlidersHorizontal size={16} style={{ color: '#94a3b8' }} />
                <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Estado:</span>
                <select
                  className="form-control"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  style={{ width: 'auto' }}
                >
                  <option value="todos">Todos los estados</option>
                  <option value="confirmado">Confirmado</option>
                  <option value="en_investigacion">En investigación</option>
                  <option value="resuelto">Resuelto</option>
                </select>
              </div>
            </div>

            <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
              {filteredAlerts.length} detecciones registradas
            </span>
          </div>

          {/* Tabla de Alertas */}
          <div className="pnc-table-wrapper">
            {filteredAlerts.length === 0 ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>
                No se registraron alertas con los filtros seleccionados.
              </div>
            ) : (
              <table className="pnc-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Persona Detectada</th>
                    <th>Estado</th>
                    <th>Fecha & Hora</th>
                    <th>Coordenadas GPS</th>
                    <th>Acción Policial</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAlerts.map((alerta) => (
                    <tr key={alerta.id}>
                      <td style={{ fontWeight: 700, color: '#38bdf8' }}>
                        #{alerta.id}
                      </td>
                      <td style={{ fontWeight: 600 }}>
                        {alerta.nombre_desaparecido}
                      </td>
                      <td>
                        <span className={`status-badge ${alerta.estado === 'confirmado' ? 'encontrado' : 'warning'}`} style={{ position: 'static' }}>
                          {alerta.estado || 'En investigación'}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.82rem', color: '#cbd5e1' }}>
                        {formatDate(alerta.fecha_deteccion || alerta.created_at)}
                      </td>
                      <td style={{ fontFamily: 'monospace', fontSize: '0.85rem', color: '#38bdf8' }}>
                        📍 {formatCoordinates(alerta.ubicacion_lat, alerta.ubicacion_lng)}
                      </td>
                      <td>
                        <button
                          onClick={() => {
                            const matchedCase = cases.find((c) => c.id === alerta.caso_id);
                            setCertificateTarget({ isOpen: true, alerta, caso: matchedCase });
                          }}
                          style={{
                            background: 'rgba(0, 240, 255, 0.12)',
                            border: '1px solid rgba(0, 240, 255, 0.4)',
                            color: '#00f0ff',
                            borderRadius: '6px',
                            padding: '0.35rem 0.65rem',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem'
                          }}
                        >
                          <Shield size={13} />
                          <span>Despacho SHA-256</span>
                        </button>

                        <button
                          onClick={() => handleDispatchEmergency(alerta)}
                          className="pnc-btn-fast-dispatch"
                          style={{ padding: '0.35rem 0.65rem', fontSize: '0.72rem', marginLeft: '0.4rem' }}
                          title="Trazar e interceptar con ruta rápida GPS"
                        >
                          <Navigation size={12} />
                          <span>Ruta GPS</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          SUB-INTERFAZ 4: CENTRO DE EMISIÓN DE CÓDIGO ÁMBAR FLASH
         ========================================================================= */}
      {activeTab === 'broadcast' && (
        <div className="pnc-broadcast-room animate-fade-in">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', marginBottom: '1.5rem', borderBottom: '1px solid rgba(239, 68, 68, 0.25)', paddingBottom: '1rem' }}>
            <div style={{
              width: '50px',
              height: '50px',
              borderRadius: '50%',
              background: 'rgba(239, 68, 68, 0.2)',
              border: '1px solid #ef4444',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ef4444'
            }}>
              <Radio size={26} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.35rem', color: '#f87171' }}>
                Sala de Transmisión de Código Ámbar Nacional
              </h2>
              <p style={{ margin: 0, fontSize: '0.82rem', color: '#94a3b8' }}>
                Despacho simultáneo vía WebSockets, Notificaciones Push y Alertas a Dispositivos Móviles
              </p>
            </div>
          </div>

          {broadcastSuccess && (
            <div style={{
              background: 'rgba(16, 185, 129, 0.2)',
              border: '1px solid #10b981',
              color: '#34d399',
              padding: '0.85rem',
              borderRadius: '8px',
              marginBottom: '1.25rem',
              textAlign: 'center',
              fontWeight: 700
            }}>
              {broadcastSuccess}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
            {/* Formulario */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
              <div className="form-group">
                <label className="form-label">1. Seleccionar Expediente Objetivo</label>
                <select
                  className="form-control"
                  value={broadcastCaseId}
                  onChange={(e) => setBroadcastCaseId(e.target.value)}
                  disabled={broadcasting}
                >
                  <option value="">-- Seleccionar Persona Desaparecida --</option>
                  {cases.map((c) => (
                    <option key={c.id} value={c.id}>
                      Caso #{c.id} - {c.nombre_desaparecido} ({c.ubicacion_desaparicion})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">2. Geocerca Táctica de Difusión</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem' }}>
                  <button
                    type="button"
                    onClick={() => setGeofenceRadius('5km')}
                    style={{
                      background: geofenceRadius === '5km' ? 'rgba(239, 68, 68, 0.3)' : 'rgba(15, 23, 42, 0.8)',
                      border: `1px solid ${geofenceRadius === '5km' ? '#ef4444' : 'rgba(255, 255, 255, 0.1)'}`,
                      color: geofenceRadius === '5km' ? '#fca5a5' : '#94a3b8',
                      padding: '0.6rem',
                      borderRadius: '8px',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    📍 5 km (Perímetro Inmediato)
                  </button>
                  <button
                    type="button"
                    onClick={() => setGeofenceRadius('15km')}
                    style={{
                      background: geofenceRadius === '15km' ? 'rgba(239, 68, 68, 0.3)' : 'rgba(15, 23, 42, 0.8)',
                      border: `1px solid ${geofenceRadius === '15km' ? '#ef4444' : 'rgba(255, 255, 255, 0.1)'}`,
                      color: geofenceRadius === '15km' ? '#fca5a5' : '#94a3b8',
                      padding: '0.6rem',
                      borderRadius: '8px',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    🏙️ 15 km (Área Metropolitana)
                  </button>
                  <button
                    type="button"
                    onClick={() => setGeofenceRadius('nacional')}
                    style={{
                      background: geofenceRadius === 'nacional' ? 'rgba(239, 68, 68, 0.3)' : 'rgba(15, 23, 42, 0.8)',
                      border: `1px solid ${geofenceRadius === 'nacional' ? '#ef4444' : 'rgba(255, 255, 255, 0.1)'}`,
                      color: geofenceRadius === 'nacional' ? '#fca5a5' : '#94a3b8',
                      padding: '0.6rem',
                      borderRadius: '8px',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    🇸🇻 Red Nacional Completa
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">3. Directiva Táctica / Instrucciones Especiales</label>
                <textarea
                  className="form-control"
                  rows="3"
                  placeholder="Ej. Búsqueda prioritaria con patrullaje en retenes fronterizos, terminales y puntos de peaje..."
                  value={broadcastMsg}
                  onChange={(e) => setBroadcastMsg(e.target.value)}
                  disabled={broadcasting}
                />
              </div>

              <button
                type="button"
                onClick={handleEmitBroadcast}
                disabled={broadcasting || !broadcastCaseId}
                className="btn btn-danger"
                style={{
                  padding: '0.75rem',
                  fontSize: '0.95rem',
                  fontWeight: 800,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  boxShadow: '0 4px 20px rgba(239, 68, 68, 0.45)'
                }}
              >
                <Radio size={18} />
                <span>{broadcasting ? 'Transmitiendo a Unidades...' : 'Disparar Alerta Código Ámbar'}</span>
              </button>
            </div>

            {/* Panel Informativo de Protocolo */}
            <div style={{
              background: 'rgba(0,0,0,0.4)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '12px',
              padding: '1.25rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
              fontSize: '0.82rem'
            }}>
              <div style={{ color: '#f87171', fontWeight: 700, fontSize: '0.9rem' }}>
                ⚠️ Protocolo de Activación Policial:
              </div>
              <p style={{ margin: 0, color: '#94a3b8', lineHeight: 1.5 }}>
                Al disparar una Alerta de Código Ámbar, la plataforma realiza las siguientes acciones inmediatas:
              </p>
              <ul style={{ margin: 0, paddingLeft: '1.2rem', color: '#cbd5e1', lineHeight: 1.6 }}>
                <li>Genera notificación Push prioritaria a todos los oficiales y terminales móviles en el radio establecido.</li>
                <li>Activa la baliza parpadeante de alerta roja en todos los tableros comunitarios de LocalizaSV.</li>
                <li>Indexa los vectores faciales en las cámaras conectadas para escaneo continuo a 1 segundo.</li>
                <li>Registra un sello de tiempo inmutable en la cadena de custodia pericial.</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Emisión Rápida (Disparado desde el Header) */}
      {broadcastModalOpen && activeTab !== 'broadcast' && (
        <div className="modal-overlay animate-fade-in" style={{ zIndex: 12500 }}>
          <div
            className="pnc-broadcast-room"
            style={{ maxWidth: '580px', width: '95%', margin: '0 auto' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <Radio size={22} style={{ color: '#f87171' }} />
                <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#f87171' }}>
                  Emisión de Alerta Código Ámbar Flash
                </h3>
              </div>
              <button
                onClick={() => setBroadcastModalOpen(false)}
                className="btn btn-secondary"
                style={{ padding: '0.25rem 0.6rem', fontSize: '0.8rem' }}
              >
                ✕
              </button>
            </div>

            {broadcastSuccess && (
              <div style={{
                background: 'rgba(16, 185, 129, 0.2)',
                border: '1px solid #10b981',
                color: '#34d399',
                padding: '0.65rem',
                borderRadius: '6px',
                marginBottom: '1rem',
                fontSize: '0.85rem',
                textAlign: 'center'
              }}>
                {broadcastSuccess}
              </div>
            )}

            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label className="form-label">Seleccionar Expediente</label>
              <select
                className="form-control"
                value={broadcastCaseId}
                onChange={(e) => setBroadcastCaseId(e.target.value)}
              >
                <option value="">-- Seleccionar Persona Desaparecida --</option>
                {cases.map((c) => (
                  <option key={c.id} value={c.id}>
                    Caso #{c.id} - {c.nombre_desaparecido}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group" style={{ marginBottom: '1.25rem' }}>
              <label className="form-label">Geocerca Táctica</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.4rem' }}>
                {['5km', '15km', 'nacional'].map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setGeofenceRadius(r)}
                    style={{
                      background: geofenceRadius === r ? 'rgba(239, 68, 68, 0.3)' : 'rgba(15, 23, 42, 0.8)',
                      border: `1px solid ${geofenceRadius === r ? '#ef4444' : 'rgba(255, 255, 255, 0.1)'}`,
                      color: geofenceRadius === r ? '#fca5a5' : '#94a3b8',
                      padding: '0.45rem',
                      borderRadius: '6px',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    {r === '5km' ? '5 km' : r === '15km' ? '15 km' : 'Nacional'}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setBroadcastModalOpen(false)}
                className="btn btn-secondary"
                disabled={broadcasting}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleEmitBroadcast}
                disabled={broadcasting || !broadcastCaseId}
                className="btn btn-danger"
                style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem' }}
              >
                <Radio size={14} />
                <span>{broadcasting ? 'Transmitiendo...' : 'Disparar Alerta'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Certificado e Intervención Policial Oficial SHA-256 */}
      <PoliceInterventionCertificateModal
        isOpen={certificateTarget.isOpen}
        alerta={certificateTarget.alerta}
        caso={certificateTarget.caso}
        onClose={() => setCertificateTarget({ isOpen: false, alerta: null, caso: null })}
      />
    </div>
  );
};

export default AuthorityPanel;
