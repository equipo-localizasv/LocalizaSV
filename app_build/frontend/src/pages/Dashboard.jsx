import React, { useState, useEffect, useContext, useMemo } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import socketService from '../services/socket';
import { AuthContext } from '../App';
import ReportSightingModal from '../components/ReportSightingModal';
import MissingPersonFlyerModal from '../components/MissingPersonFlyerModal';
import MapaAlertas from '../components/MapaAlertas';
import ReversePhotoSearchModal from '../components/ReversePhotoSearchModal';
import AgeProgressionModal from '../components/AgeProgressionModal';
import HeroSection from '../components/HeroSection';
import soundEffects from '../services/soundEffects';

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

const Dashboard = () => {
  const { user } = useContext(AuthContext);
  const [cases, setCases] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState(''); // Empty = All, 'Desaparecido', 'Encontrado', 'En Proceso de Rescate'
  const [deptFilter, setDeptFilter] = useState('');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'map'
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [acceptingId, setAcceptingId] = useState(null);
  const [actionSuccess, setActionSuccess] = useState('');
  const [sightingModalOpen, setSightingModalOpen] = useState(false);
  const [sightingInitialCaseId, setSightingInitialCaseId] = useState(null);
  const [selectedFlyerCase, setSelectedFlyerCase] = useState(null);
  const [reverseSearchOpen, setReverseSearchOpen] = useState(false);
  const [ageProgressionCase, setAgeProgressionCase] = useState(null);


  const fetchCases = async () => {
    setLoading(true);
    setError('');
    try {
      const params = {};
      if (search) params.search = search;
      if (statusFilter) params.estado = statusFilter;

      const [casesRes, alertsRes] = await Promise.all([
        api.get('/cases', { params }),
        api.get('/alertas/activas').catch(() => ({ data: [] }))
      ]);
      setCases(casesRes.data || []);
      setAlerts(alertsRes.data || []);
    } catch (err) {
      console.error('Error fetching cases:', err);
      setError('No se pudieron cargar los casos. Intente de nuevo más tarde.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Debounce search input slightly or trigger on search/filter update
    const timer = setTimeout(() => {
      fetchCases();
    }, 300);

    return () => clearTimeout(timer);
  }, [search, statusFilter]);

  // Escuchar actualizaciones de casos en tiempo real por WebSocket
  useEffect(() => {
    const unsubscribe = socketService.on('caso_actualizado', (updatedCase) => {
      console.log('🔄 [Dashboard] Caso actualizado recibido por WebSocket:', updatedCase);
      setCases((prevCases) =>
        prevCases.map((c) => (c.id === updatedCase.id ? { ...c, ...updatedCase } : c))
      );
    });

    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, []);

  const handleAcceptSearch = async (caseId) => {
    if (!user) return;
    setAcceptingId(caseId);
    setActionSuccess('');
    try {
      const res = await api.put(`/cases/${caseId}/aceptar`);
      const updatedCase = res.data.caso;
      setCases((prevCases) =>
        prevCases.map((c) => (c.id === caseId ? { ...c, ...updatedCase } : c))
      );
      setActionSuccess(`¡Te has unido a la búsqueda del Caso #${caseId}!`);
      setTimeout(() => setActionSuccess(''), 6000);
    } catch (err) {
      console.error('Error al aceptar búsqueda:', err);
      alert(err.response?.data?.error || 'No se pudo aceptar la búsqueda.');
    } finally {
      setAcceptingId(null);
    }
  };


  const [fcmToken, setFcmToken] = useState('');
  const [regStatus, setRegStatus] = useState('');

  const handleSimulateFcmRegister = async () => {
    setRegStatus('Registrando...');
    try {
      const mockToken = `mock-fcm-token-${user ? user.id : 'anon'}-${Math.floor(Math.random() * 100000)}`;
      await api.post('/notifications/register-token', { token: mockToken });
      setFcmToken(mockToken);
      setRegStatus('¡Token registrado en la BD!');
    } catch (err) {
      console.error(err);
      setRegStatus('Error al registrar token de simulación.');
    }
  };

  const getImageUrl = (path) => {
    if (!path) return '';
    return `http://localhost:3001${path}`;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat('es-SV', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC'
    }).format(date);
  };

  const filteredCases = useMemo(() => {
    return cases.filter((c) => {
      if (!deptFilter) return true;
      const loc = (c.ubicacion_desaparicion || '').toLowerCase();
      return loc.includes(deptFilter.toLowerCase());
    });
  }, [cases, deptFilter]);

  const stats = useMemo(() => {
    const total = cases.length;
    const activos = cases.filter(c => c.estado === 'Desaparecido').length;
    const enRescate = cases.filter(c => c.estado === 'En Proceso de Rescate').length;
    const localizados = cases.filter(c => c.estado === 'Encontrado').length;
    return { total, activos, enRescate, localizados };
  }, [cases]);

  return (
    <div className="animate-fade-in">
      {/* Hero Section Cinematográfico Táctico C4I */}
      <HeroSection onOpenReverseSearch={() => setReverseSearchOpen(true)} user={user} />

      {/* Top Cyber Amber Alert Pulsing Banner */}
      {cases.some(c => c.estado === 'Desaparecido') && (
        <div style={{
          background: 'linear-gradient(90deg, rgba(239, 68, 68, 0.18), rgba(6, 13, 29, 0.95), rgba(239, 68, 68, 0.18))',
          borderTop: '2px solid #ef4444',
          borderBottom: '2px solid #ef4444',
          padding: '0.65rem 1.25rem',
          marginBottom: '1.75rem',
          borderRadius: '10px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          boxShadow: '0 0 25px rgba(239, 68, 68, 0.3)',
          flexWrap: 'wrap',
          gap: '0.75rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <span className="cyber-beacon" style={{ background: '#ef4444', boxShadow: '0 0 12px #ef4444' }} />
            <span style={{
              background: 'rgba(239, 68, 68, 0.25)',
              border: '1px solid #ef4444',
              color: '#fca5a5',
              fontWeight: 800,
              fontSize: '0.75rem',
              padding: '0.2rem 0.6rem',
              borderRadius: '4px',
              letterSpacing: '1px'
            }}>
              CÓDIGO ÁMBAR ACTIVO
            </span>
            <span style={{ color: '#f8fafc', fontSize: '0.85rem' }}>
              Red Nacional de Vigilancia en alerta máxima • Prioridad en terminales y puestos de control
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <button
              onClick={() => {
                soundEffects.playScanSound();
                setReverseSearchOpen(true);
              }}
              style={{
                background: 'rgba(0, 240, 255, 0.15)',
                border: '1px solid #00f0ff',
                color: '#00f0ff',
                fontSize: '0.75rem',
                fontWeight: 700,
                padding: '0.35rem 0.75rem',
                borderRadius: '6px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem'
              }}
            >
              <span>🧬</span>
              <span>Cotejo Biométrico Rápido</span>
            </button>
          </div>
        </div>
      )}

      <div className="dashboard-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.25rem' }}>
            <h1 style={{ fontSize: '2.25rem', margin: 0 }}>Casos de Desaparición</h1>
            <span className="cyber-badge-cyan">SISTEMA CIBERNÉTICO HUD</span>
          </div>
          <p style={{ color: 'var(--text-secondary)' }}>Plataforma nacional de geolocalización, biometría 512D e inteligencia colaborativa en El Salvador</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={() => {
              soundEffects.playScanSound();
              setReverseSearchOpen(true);
            }}
            className="btn"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              border: '1px solid #00f0ff',
              color: '#00f0ff',
              background: 'rgba(0, 240, 255, 0.12)',
              fontWeight: 700,
              padding: '0.6rem 1rem',
              borderRadius: '8px',
              boxShadow: '0 0 15px rgba(0, 240, 255, 0.2)'
            }}
          >
            <span>🧬</span>
            <span>Búsqueda Inversa por Foto (IA)</span>
          </button>
          <button
            onClick={() => {
              soundEffects.playClickSound();
              setSightingInitialCaseId(null);
              setSightingModalOpen(true);
            }}
            className="btn btn-secondary"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              border: '1px solid #0ea5e9',
              color: '#38bdf8',
              background: 'rgba(14, 165, 233, 0.12)',
              fontWeight: 600,
              padding: '0.6rem 1rem'
            }}
          >
            <span>📸</span>
            <span>Reportar Avistamiento</span>
          </button>
          {user ? (
            <Link
              to="/reportar"
              onClick={() => soundEffects.playClickSound()}
              className="btn btn-primary"
              style={{ padding: '0.6rem 1.2rem', fontWeight: 600 }}
            >
              ➕ Reportar Desaparición
            </Link>
          ) : (
            <Link
              to="/login"
              onClick={() => soundEffects.playClickSound()}
              className="btn btn-secondary"
            >
              Iniciar sesión para reportar
            </Link>
          )}
        </div>
      </div>

      {/* KPI Stats Bar */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '1rem',
        marginBottom: '2rem'
      }}>
        <div className="glass-panel card-interactive-lift" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.5rem',
            color: '#ef4444'
          }}>
            🚨
          </div>
          <div>
            <div style={{ fontSize: '1.6rem', fontWeight: '800', color: '#f87171', lineHeight: 1.1 }}>
              {stats.activos}
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              En Búsqueda Activa
            </div>
          </div>
        </div>

        <div className="glass-panel card-interactive-lift" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            background: 'rgba(245, 158, 11, 0.15)',
            border: '1px solid rgba(245, 158, 11, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.5rem',
            color: '#f59e0b'
          }}>
            🤝
          </div>
          <div>
            <div style={{ fontSize: '1.6rem', fontWeight: '800', color: '#f59e0b', lineHeight: 1.1 }}>
              {stats.enRescate}
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              En Rescate Activo
            </div>
          </div>
        </div>

        <div className="glass-panel card-interactive-lift" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            background: 'rgba(16, 185, 129, 0.15)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.5rem',
            color: '#10b981'
          }}>
            ✓
          </div>
          <div>
            <div style={{ fontSize: '1.6rem', fontWeight: '800', color: '#10b981', lineHeight: 1.1 }}>
              {stats.localizados}
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Personas Localizadas
            </div>
          </div>
        </div>

        <div className="glass-panel card-interactive-lift" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            background: 'rgba(14, 165, 233, 0.15)',
            border: '1px solid rgba(14, 165, 233, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.5rem',
            color: '#0ea5e9'
          }}>
            📡
          </div>
          <div>
            <div style={{ fontSize: '1.6rem', fontWeight: '800', color: '#38bdf8', lineHeight: 1.1 }}>
              {alerts.length}
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Alertas Verificadas
            </div>
          </div>
        </div>
      </div>

      {user && (
        <div className="glass-panel animate-fade-in" style={{ padding: '1rem', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px dashed var(--primary)' }}>
          <div>
            <h4 style={{ margin: 0, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              📲 Simulador de Notificaciones Push (FCM)
            </h4>
            <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Registra este navegador como un dispositivo para recibir alertas simuladas del sistema.
            </p>
            {fcmToken && (
              <code style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginTop: '0.25rem' }}>
                Token: {fcmToken}
              </code>
            )}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.25rem' }}>
            <button onClick={handleSimulateFcmRegister} className="btn btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}>
              🔔 Registrar Dispositivo Mock
            </button>
            {regStatus && <span style={{ fontSize: '0.75rem', color: regStatus.includes('¡') ? 'var(--success)' : 'var(--text-secondary)' }}>{regStatus}</span>}
          </div>
        </div>
      )}

      {actionSuccess && (
        <div className="glass-panel animate-fade-in" style={{
          background: 'rgba(16, 185, 129, 0.15)',
          border: '1px solid #10b981',
          color: '#10b981',
          padding: '1rem',
          borderRadius: '8px',
          marginBottom: '1.5rem',
          fontWeight: 600,
          textAlign: 'center'
        }}>
          {actionSuccess}
        </div>
      )}

      {/* Tarea 5: Banner 'En proceso de rescate' cuando hay casos activos en búsqueda */}
      {cases.some((c) => c.estado === 'En Proceso de Rescate') && (
        <div
          className="glass-panel animate-fade-in"
          style={{
            background: 'linear-gradient(90deg, rgba(239, 68, 68, 0.15), rgba(245, 158, 11, 0.15))',
            border: '1px solid rgba(245, 158, 11, 0.5)',
            borderRadius: '12px',
            padding: '1.25rem 1.5rem',
            marginBottom: '2rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1rem',
            boxShadow: '0 4px 20px rgba(245, 158, 11, 0.15)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <span style={{ fontSize: '2.2rem', animation: 'spin 3s linear infinite' }}>🚨</span>
            <div>
              <h3 style={{ margin: 0, color: '#f59e0b', fontSize: '1.15rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                OPERATIVO EN CURSO: En Proceso de Rescate
              </h3>
              <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.9rem', color: '#e2e8f0' }}>
                Búsqueda colaborativa activa para:{' '}
                {cases
                  .filter((c) => c.estado === 'En Proceso de Rescate')
                  .map((c) => (
                    <strong key={c.id} style={{ color: '#fbbf24' }}>
                      {c.nombre_desaparecido} {c.rescatista_nombre ? `(Voluntario: ${c.rescatista_nombre})` : ''}{' '}
                    </strong>
                  ))}
              </p>
            </div>
          </div>
          <span
            style={{
              padding: '0.4rem 0.85rem',
              borderRadius: '20px',
              background: 'rgba(245, 158, 11, 0.25)',
              border: '1px solid #f59e0b',
              color: '#fef3c7',
              fontSize: '0.8rem',
              fontWeight: 700,
              textTransform: 'uppercase'
            }}
          >
            Vigilancia Activa 24/7
          </span>
        </div>
      )}

      {/* Selector de Filtros y Modo de Vista */}
      <div className="glass-panel" style={{ padding: '1.25rem', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ flex: '1 1 260px', position: 'relative' }}>
            <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }}>🔍</span>
            <input
              type="text"
              className="form-control"
              placeholder="Buscar por nombre o lugar..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: '2.5rem', width: '100%' }}
            />
          </div>

          <div style={{ flex: '0 1 200px' }}>
            <select
              className="form-control"
              value={deptFilter}
              onChange={(e) => {
                soundEffects.playClickSound();
                setDeptFilter(e.target.value);
              }}
            >
              <option value="">Todos los Departamentos</option>
              {DEPARTAMENTOS_SV.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          {/* Filtros de Estado */}
          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
            <button 
              onClick={() => {
                soundEffects.playClickSound();
                setStatusFilter('');
              }} 
              className={`btn ${statusFilter === '' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
            >
              Todos
            </button>
            <button 
              onClick={() => {
                soundEffects.playClickSound();
                setStatusFilter('Desaparecido');
              }} 
              className={`btn ${statusFilter === 'Desaparecido' ? 'btn-danger' : 'btn-secondary'}`}
              style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
            >
              Desaparecidos
            </button>
            <button 
              onClick={() => {
                soundEffects.playClickSound();
                setStatusFilter('En Proceso de Rescate');
              }} 
              className={`btn ${statusFilter === 'En Proceso de Rescate' ? 'btn-warning' : 'btn-secondary'}`}
              style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', color: statusFilter === 'En Proceso de Rescate' ? '#000' : 'inherit' }}
            >
              En Rescate
            </button>
            <button 
              onClick={() => {
                soundEffects.playClickSound();
                setStatusFilter('Encontrado');
              }} 
              className={`btn ${statusFilter === 'Encontrado' ? 'btn-success' : 'btn-secondary'}`}
              style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
            >
              Localizados
            </button>
          </div>

          {/* View Mode Toggle */}
          <div style={{ display: 'flex', gap: '0.35rem', background: 'rgba(14, 165, 233, 0.15)', padding: '0.25rem', borderRadius: '8px', border: '1px solid rgba(14, 165, 233, 0.3)' }}>
            <button
              onClick={() => {
                soundEffects.playClickSound();
                setViewMode('grid');
              }}
              style={{
                background: viewMode === 'grid' ? '#0ea5e9' : 'transparent',
                color: '#fff',
                border: 'none',
                padding: '0.4rem 0.75rem',
                borderRadius: '6px',
                fontSize: '0.8rem',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              🗂️ Tarjetas
            </button>
            <button
              onClick={() => {
                soundEffects.playClickSound();
                setViewMode('map');
              }}
              style={{
                background: viewMode === 'map' ? '#0ea5e9' : 'transparent',
                color: '#fff',
                border: 'none',
                padding: '0.4rem 0.75rem',
                borderRadius: '6px',
                fontSize: '0.8rem',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              🗺️ Mapa Táctico
            </button>
          </div>
        </div>
      </div>

      {error && <div className="auth-error text-center">{error}</div>}

      {/* SKELETON LOADERS CON PULSO LUMINOSO */}
      {loading ? (
        <div className="cases-grid">
          {[1, 2, 3, 4, 5, 6].map((sk) => (
            <div key={sk} className="glass-panel" style={{ borderRadius: '14px', overflow: 'hidden', padding: '1rem' }}>
              <div className="skeleton-box" style={{ width: '100%', height: '220px', borderRadius: '8px', marginBottom: '1rem' }} />
              <div className="skeleton-box" style={{ width: '70%', height: '20px', borderRadius: '4px', marginBottom: '0.65rem' }} />
              <div className="skeleton-box" style={{ width: '50%', height: '14px', borderRadius: '4px', marginBottom: '0.5rem' }} />
              <div className="skeleton-box" style={{ width: '90%', height: '14px', borderRadius: '4px', marginBottom: '1rem' }} />
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <div className="skeleton-box" style={{ flex: 1, height: '36px', borderRadius: '6px' }} />
                <div className="skeleton-box" style={{ flex: 1, height: '36px', borderRadius: '6px' }} />
              </div>
            </div>
          ))}
        </div>
      ) : viewMode === 'map' ? (
        <div className="glass-panel animate-fade-in" style={{ padding: '1.25rem', marginBottom: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div>
              <h3 style={{ margin: 0, color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                🗺️ Mapa Táctico de Casos y Avistamientos
              </h3>
              <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Visualización satelital y geográfica de alertas y puntos de desaparición en El Salvador
              </p>
            </div>
            <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
              📍 {filteredCases.length} casos • 📡 {alerts.length} alertas georreferenciadas
            </div>
          </div>
          <div style={{ borderRadius: '12px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }}>
            <MapaAlertas alerts={alerts} />
          </div>
        </div>
      ) : filteredCases.length === 0 ? (
        <div className="glass-panel text-center" style={{ padding: '4rem 2rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔍</div>
          <h3>No se encontraron reportes</h3>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
            No hay casos registrados que coincidan con sus criterios de búsqueda o departamento seleccionado.
          </p>
        </div>
      ) : (
        <div className="cases-grid">
          {filteredCases.map((caso, index) => (
            <div
              key={caso.id}
              className="case-card hud-panel corner-hud spotlight-card stagger-item"
              style={{ animationDelay: `${index * 45}ms` }}
              onMouseMove={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                e.currentTarget.style.setProperty('--mouse-x', `${e.clientX - rect.left}px`);
                e.currentTarget.style.setProperty('--mouse-y', `${e.clientY - rect.top}px`);
              }}
            >
              <div className="case-card-img-wrapper laser-scan-container" style={{ position: 'relative' }}>
                <img 
                  src={getImageUrl(caso.foto_url)} 
                  alt={caso.nombre_desaparecido} 
                  className="case-card-img"
                  onError={(e) => {
                    e.target.src = 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=400&q=80';
                  }}
                />

                {/* Línea de escaneo láser forense en hover */}
                <div className="laser-scanline" />

                {/* Malla holográfica de landmarks biométricos */}
                <div className="landmark-overlay">
                  <div className="landmark-dot" style={{ top: '38%', left: '42%' }} title="Ojo Izquierdo" />
                  <div className="landmark-dot" style={{ top: '38%', left: '58%' }} title="Ojo Derecho" />
                  <div className="landmark-dot" style={{ top: '50%', left: '50%' }} title="Nariz" />
                  <div className="landmark-dot" style={{ top: '65%', left: '44%' }} title="Comisura Izquierda" />
                  <div className="landmark-dot" style={{ top: '65%', left: '56%' }} title="Comisura Derecha" />
                </div>

                <span className={`status-badge ${caso.estado === 'En Proceso de Rescate' ? 'warning' : caso.estado.toLowerCase()}`}>
                  {caso.estado}
                </span>
                <span style={{
                  position: 'absolute',
                  bottom: '6px',
                  left: '6px',
                  background: 'rgba(6, 13, 29, 0.85)',
                  border: '1px solid rgba(0, 240, 255, 0.4)',
                  color: '#00f0ff',
                  fontSize: '0.65rem',
                  padding: '0.15rem 0.4rem',
                  borderRadius: '4px',
                  fontFamily: 'monospace'
                }}>
                  ID #{caso.id} • BIO 512D
                </span>
              </div>
              <div className="case-card-body">
                <h3 className="case-card-title" style={{ color: '#f8fafc' }}>{caso.nombre_desaparecido}</h3>
                <div className="case-card-meta">
                  <div><strong>Edad:</strong> {caso.edad} años</div>
                  <div><strong>Género:</strong> {caso.genero}</div>
                  <div><strong>Visto el:</strong> {formatDate(caso.fecha_desaparicion)}</div>
                  <div style={{ color: '#38bdf8', marginTop: '0.25rem', fontWeight: 600 }}>
                    📍 {caso.ubicacion_desaparicion}
                  </div>
                </div>
                <p className="case-card-desc">{caso.descripcion}</p>

                {/* Botón "Ayudar" o indicador de rescate */}
                {caso.estado === 'Desaparecido' && (
                  user ? (
                    <button
                      onClick={() => handleAcceptSearch(caso.id)}
                      disabled={acceptingId === caso.id}
                      className="btn btn-warning"
                      style={{
                        width: '100%',
                        marginTop: '0.75rem',
                        marginBottom: '0.5rem',
                        padding: '0.55rem 0.85rem',
                        fontSize: '0.85rem',
                        fontWeight: '700',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.45rem',
                        background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                        border: 'none',
                        color: '#ffffff',
                        cursor: 'pointer',
                        borderRadius: '6px',
                        boxShadow: '0 2px 8px rgba(245, 158, 11, 0.3)'
                      }}
                    >
                      <span>🤝</span>
                      <span>{acceptingId === caso.id ? 'Aceptando...' : 'Ayudar en la Búsqueda'}</span>
                    </button>
                  ) : (
                    <Link
                      to="/login"
                      className="btn btn-secondary"
                      style={{
                        width: '100%',
                        marginTop: '0.75rem',
                        marginBottom: '0.5rem',
                        padding: '0.45rem',
                        fontSize: '0.8rem',
                        textAlign: 'center',
                        display: 'block'
                      }}
                    >
                      Inicia sesión para ayudar
                    </Link>
                  )
                )}

                {caso.estado === 'En Proceso de Rescate' && (
                  <div
                    style={{
                      width: '100%',
                      marginTop: '0.75rem',
                      marginBottom: '0.5rem',
                      padding: '0.5rem 0.75rem',
                      borderRadius: '6px',
                      background: 'rgba(245, 158, 11, 0.15)',
                      border: '1px solid rgba(245, 158, 11, 0.4)',
                      color: '#fbbf24',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.4rem'
                    }}
                  >
                    <span>🚨 En Proceso de Rescate</span>
                    {caso.rescatista_nombre && (
                      <span style={{ opacity: 0.9, fontSize: '0.75rem' }}>({caso.rescatista_nombre.split(' ')[0]})</span>
                    )}
                  </div>
                )}

                {/* Botón rápido para reportar avistamiento de este caso */}
                <button
                  onClick={() => {
                    setSightingInitialCaseId(caso.id);
                    setSightingModalOpen(true);
                  }}
                  style={{
                    width: '100%',
                    background: 'rgba(14, 165, 233, 0.08)',
                    border: '1px dashed rgba(14, 165, 233, 0.4)',
                    color: '#38bdf8',
                    cursor: 'pointer',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.35rem',
                    padding: '0.45rem',
                    borderRadius: '6px',
                    marginBottom: '0.4rem',
                    transition: 'all 0.2s'
                  }}
                >
                  <span>📸</span>
                  <span>Reportar que vi a esta persona</span>
                </button>

                {/* Acciones Solidarias: Boletín Se Busca y Proyección IA */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem', marginBottom: '0.4rem' }}>
                  <button
                    onClick={() => setSelectedFlyerCase(caso)}
                    style={{
                      background: 'rgba(239, 68, 68, 0.12)',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                      color: '#f87171',
                      borderRadius: '6px',
                      padding: '0.35rem',
                      fontSize: '0.72rem',
                      fontWeight: '700',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.25rem'
                    }}
                  >
                    <span>📄</span>
                    <span>Afiche Se Busca</span>
                  </button>
                  <button
                    onClick={() => setAgeProgressionCase(caso)}
                    style={{
                      background: 'rgba(0, 240, 255, 0.12)',
                      border: '1px solid rgba(0, 240, 255, 0.35)',
                      color: '#00f0ff',
                      borderRadius: '6px',
                      padding: '0.35rem',
                      fontSize: '0.72rem',
                      fontWeight: '700',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.25rem'
                    }}
                  >
                    <span>⏳</span>
                    <span>Proyección Edad IA</span>
                  </button>
                </div>

                <button
                  onClick={() => {
                    const text = `🚨 ALERTA: Ayúdanos a encontrar a ${caso.nombre_desaparecido} (${caso.edad} años). Visto en: ${caso.ubicacion_desaparicion}. Teléfono: ${caso.telefono_contacto}. Info: ${window.location.origin}/casos/${caso.id}`;
                    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
                  }}
                  style={{
                    width: '100%',
                    background: 'rgba(37, 211, 102, 0.12)',
                    border: '1px solid rgba(37, 211, 102, 0.3)',
                    color: '#4ade80',
                    borderRadius: '6px',
                    padding: '0.35rem',
                    fontSize: '0.75rem',
                    fontWeight: '700',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.35rem',
                    marginBottom: '0.75rem'
                  }}
                >
                  <span>💬</span>
                  <span>Compartir en WhatsApp</span>
                </button>

                <div className="case-card-footer">
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    Por: {caso.creador_nombre ? caso.creador_nombre.split(' ')[0] : 'Usuario'}
                  </span>
                  <Link to={`/caso/${caso.id}`} className="btn btn-primary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}>
                    Ver Detalle
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal interactivo de avistamiento ciudadano con foto de evidencia */}
      <ReportSightingModal
        isOpen={sightingModalOpen}
        onClose={() => setSightingModalOpen(false)}
        initialCaseId={sightingInitialCaseId}
        cases={cases}
        onSuccess={(alerta) => {
          setActionSuccess(`¡Evidencia fotográfica enviada con éxito para ${alerta.nombre_desaparecido || 'el caso'}! Moderadores y autoridades han sido notificados.`);
          setTimeout(() => setActionSuccess(''), 7000);
        }}
      />

      {/* Modal de Boletín Oficial de Se Busca para Imprimir / Compartir */}
      <MissingPersonFlyerModal
        isOpen={Boolean(selectedFlyerCase)}
        caso={selectedFlyerCase}
        onClose={() => setSelectedFlyerCase(null)}
      />

      {/* Modal de Búsqueda Inversa Biométrica 1:N */}
      <ReversePhotoSearchModal
        isOpen={reverseSearchOpen}
        onClose={() => setReverseSearchOpen(false)}
      />

      {/* Modal de Simulación de Proyección de Edad Facial */}
      <AgeProgressionModal
        isOpen={Boolean(ageProgressionCase)}
        caso={ageProgressionCase}
        onClose={() => setAgeProgressionCase(null)}
      />
    </div>
  );
};

export default Dashboard;


