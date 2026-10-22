import React, { useState, useEffect, useContext, useMemo } from 'react';
import { Link } from 'react-router-dom';
import api, { getServerBaseUrl } from '../services/api';
import socketService from '../services/socket';
import { AuthContext } from '../App';
import ReportSightingModal from '../components/ReportSightingModal';
import MissingPersonFlyerModal from '../components/MissingPersonFlyerModal';
import MapaAlertas from '../components/MapaAlertas';
import ReversePhotoSearchModal from '../components/ReversePhotoSearchModal';
import RegisterCommunityCameraModal from '../components/RegisterCommunityCameraModal';
import HeroSection from '../components/HeroSection';
import { 
  Search,
  Camera, 
  MapPin, 
  Filter, 
  Share2, 
  Printer, 
  Eye, 
  AlertCircle, 
  CheckCircle, 
  Clock, 
  Users, 
  Sparkles, 
  Calendar, 
  ArrowUpDown,
  PhoneCall,
  UserCheck
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

const Dashboard = () => {
  const { user } = useContext(AuthContext);
  const [cases, setCases] = useState([]);
  const [alerts, setAlerts] = useState([]);
  
  // Search & Filter state
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState(''); // '' | 'Desaparecido' | 'En Proceso de Rescate' | 'Encontrado'
  const [deptFilter, setDeptFilter] = useState('');
  const [ageGroupFilter, setAgeGroupFilter] = useState('all'); // 'all' | 'menores' | 'adultos' | 'mayores'
  const [sortBy, setSortBy] = useState('recent'); // 'recent' | 'oldest' | 'name'
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'map'
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [acceptingId, setAcceptingId] = useState(null);
  const [actionSuccess, setActionSuccess] = useState('');

  // Modals state
  const [sightingModalOpen, setSightingModalOpen] = useState(false);
  const [sightingInitialCaseId, setSightingInitialCaseId] = useState(null);
  const [selectedFlyerCase, setSelectedFlyerCase] = useState(null);
  const [reverseSearchOpen, setReverseSearchOpen] = useState(false);
  const [communityCamOpen, setCommunityCamOpen] = useState(false);

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
    const timer = setTimeout(() => {
      fetchCases();
    }, 250);
    return () => clearTimeout(timer);
  }, [search, statusFilter]);

  // WebSocket real-time updates
  useEffect(() => {
    const unsubscribe = socketService.on('caso_actualizado', (updatedCase) => {
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
      setActionSuccess(`¡Te has sumado activamente a la búsqueda del Caso #${caseId}!`);
      setTimeout(() => setActionSuccess(''), 5000);
    } catch (err) {
      console.error('Error al aceptar búsqueda:', err);
      alert(err.response?.data?.error || 'No se pudo aceptar la búsqueda.');
    } finally {
      setAcceptingId(null);
    }
  };

  const getImageUrl = (path) => {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    return `${getServerBaseUrl()}${path}`;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'No especificada';
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat('es-SV', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      timeZone: 'UTC'
    }).format(date);
  };

  // Filtered & Sorted Cases
  const filteredCases = useMemo(() => {
    let result = cases.filter((c) => {
      // Department filter
      if (deptFilter) {
        const loc = (c.ubicacion_desaparicion || '').toLowerCase();
        if (!loc.includes(deptFilter.toLowerCase())) return false;
      }
      // Age group filter
      if (ageGroupFilter !== 'all') {
        const edad = parseInt(c.edad, 10);
        if (isNaN(edad)) return true;
        if (ageGroupFilter === 'menores' && edad >= 18) return false;
        if (ageGroupFilter === 'adultos' && (edad < 18 || edad >= 60)) return false;
        if (ageGroupFilter === 'mayores' && edad < 60) return false;
      }
      return true;
    });

    // Sorting
    result.sort((a, b) => {
      if (sortBy === 'recent') {
        return new Date(b.created_at || b.fecha_desaparicion) - new Date(a.created_at || a.fecha_desaparicion);
      }
      if (sortBy === 'oldest') {
        return new Date(a.created_at || a.fecha_desaparicion) - new Date(b.created_at || b.fecha_desaparicion);
      }
      if (sortBy === 'name') {
        return (a.nombre_desaparecido || '').localeCompare(b.nombre_desaparecido || '');
      }
      return 0;
    });

    return result;
  }, [cases, deptFilter, ageGroupFilter, sortBy]);

  // Statistics
  const stats = useMemo(() => {
    const total = cases.length;
    const activos = cases.filter(c => c.estado === 'Desaparecido').length;
    const enRescate = cases.filter(c => c.estado === 'En Proceso de Rescate').length;
    const localizados = cases.filter(c => c.estado === 'Encontrado').length;
    return { total, activos, enRescate, localizados };
  }, [cases]);

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', paddingBottom: '3rem' }}>
      {/* Hero Institucional */}
      <HeroSection 
        onOpenReverseSearch={() => setReverseSearchOpen(true)}
        onOpenSighting={() => {
          setSightingInitialCaseId(null);
          setSightingModalOpen(true);
        }}
        user={user} 
      />

      {/* Barra Unificada de Métricas Institucionales (Diseño Limpio y Sobrio) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '0.85rem',
        marginBottom: '1.5rem'
      }}>
        <div style={{
          background: 'rgba(15, 23, 42, 0.65)',
          border: '1px solid rgba(239, 68, 68, 0.2)',
          borderRadius: '10px',
          padding: '0.85rem 1.15rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div>
            <div style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.04em' }}>
              En Búsqueda Activa
            </div>
            <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#f87171', lineHeight: 1.2, marginTop: '0.15rem' }}>
              {stats.activos}
            </div>
          </div>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '8px',
            background: 'rgba(239, 68, 68, 0.12)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#f87171'
          }}>
            <AlertCircle size={18} />
          </div>
        </div>

        <div style={{
          background: 'rgba(15, 23, 42, 0.65)',
          border: '1px solid rgba(245, 158, 11, 0.2)',
          borderRadius: '10px',
          padding: '0.85rem 1.15rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div>
            <div style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.04em' }}>
              Operativos en Curso
            </div>
            <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#fbbf24', lineHeight: 1.2, marginTop: '0.15rem' }}>
              {stats.enRescate}
            </div>
          </div>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '8px',
            background: 'rgba(245, 158, 11, 0.12)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fbbf24'
          }}>
            <Clock size={18} />
          </div>
        </div>

        <div style={{
          background: 'rgba(15, 23, 42, 0.65)',
          border: '1px solid rgba(16, 185, 129, 0.2)',
          borderRadius: '10px',
          padding: '0.85rem 1.15rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div>
            <div style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.04em' }}>
              Personas Localizadas
            </div>
            <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#34d399', lineHeight: 1.2, marginTop: '0.15rem' }}>
              {stats.localizados}
            </div>
          </div>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '8px',
            background: 'rgba(16, 185, 129, 0.12)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#34d399'
          }}>
            <CheckCircle size={18} />
          </div>
        </div>

        <div style={{
          background: 'rgba(15, 23, 42, 0.65)',
          border: '1px solid rgba(56, 189, 248, 0.2)',
          borderRadius: '10px',
          padding: '0.85rem 1.15rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div>
            <div style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.04em' }}>
              Total Expedientes
            </div>
            <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#38bdf8', lineHeight: 1.2, marginTop: '0.15rem' }}>
              {stats.total}
            </div>
          </div>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '8px',
            background: 'rgba(56, 189, 248, 0.12)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#38bdf8'
          }}>
            <Users size={18} />
          </div>
        </div>
      </div>



      {actionSuccess && (
        <div style={{
          background: 'rgba(16, 185, 129, 0.12)',
          border: '1px solid rgba(16, 185, 129, 0.3)',
          color: '#34d399',
          padding: '0.85rem 1.25rem',
          borderRadius: '10px',
          marginBottom: '1.5rem',
          fontSize: '0.9rem',
          fontWeight: 600,
          textAlign: 'center'
        }}>
          {actionSuccess}
        </div>
      )}

      {/* Barra de Filtros y Búsqueda Avanzada */}
      <div style={{
        background: 'rgba(15, 23, 42, 0.85)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '14px',
        padding: '1.25rem',
        marginBottom: '2rem'
      }}>
        {/* Fila 1: Búsqueda y Selectores */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '0.85rem',
          alignItems: 'center',
          marginBottom: '1rem'
        }}>
          {/* Búsqueda por texto */}
          <div style={{ position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
            <input
              type="text"
              className="form-control"
              placeholder="Buscar por nombre, seña o lugar..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                paddingLeft: '2.4rem',
                fontSize: '0.88rem',
                height: '40px',
                borderRadius: '8px',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                background: 'rgba(2, 6, 23, 0.6)',
                color: '#ffffff'
              }}
            />
          </div>

          {/* Filtro por Departamento */}
          <div>
            <select
              className="form-control"
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              style={{
                fontSize: '0.88rem',
                height: '40px',
                borderRadius: '8px',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                background: 'rgba(2, 6, 23, 0.6)',
                color: '#ffffff'
              }}
            >
              <option value="">Todos los Departamentos (14)</option>
              {DEPARTAMENTOS_SV.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          {/* NUEVA FUNCIÓN: Filtro por Rango de Edad */}
          <div>
            <select
              className="form-control"
              value={ageGroupFilter}
              onChange={(e) => setAgeGroupFilter(e.target.value)}
              style={{
                fontSize: '0.88rem',
                height: '40px',
                borderRadius: '8px',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                background: 'rgba(2, 6, 23, 0.6)',
                color: '#ffffff'
              }}
            >
              <option value="all">Todas las edades</option>
              <option value="menores">Menores de 18 años</option>
              <option value="adultos">Adultos (18 a 59 años)</option>
              <option value="mayores">Adultos Mayores (60+ años)</option>
            </select>
          </div>

          {/* NUEVA FUNCIÓN: Ordenar por */}
          <div>
            <select
              className="form-control"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              style={{
                fontSize: '0.88rem',
                height: '40px',
                borderRadius: '8px',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                background: 'rgba(2, 6, 23, 0.6)',
                color: '#ffffff'
              }}
            >
              <option value="recent">Más recientes primero</option>
              <option value="oldest">Mayor tiempo en búsqueda</option>
              <option value="name">Alfabético por nombre</option>
            </select>
          </div>

          {/* Cotejo con Foto Biométrico */}
          <div>
            <button
              type="button"
              onClick={() => setReverseSearchOpen(true)}
              style={{
                width: '100%',
                height: '40px',
                borderRadius: '8px',
                border: '1px solid rgba(56, 189, 248, 0.35)',
                background: 'rgba(2, 132, 199, 0.15)',
                color: '#38bdf8',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.45rem',
                transition: 'all 0.2s ease'
              }}
            >
              <Camera size={15} />
              <span>Cotejar Foto (IA)</span>
            </button>
          </div>
        </div>

        {/* Fila 2: Filtros de Estado y Conmutador de Vista */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '1rem',
          flexWrap: 'wrap',
          paddingTop: '0.5rem',
          borderTop: '1px solid rgba(255, 255, 255, 0.06)'
        }}>
          {/* Pestañas de Estado */}
          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
            <button
              onClick={() => setStatusFilter('')}
              style={{
                padding: '0.4rem 0.85rem',
                fontSize: '0.82rem',
                fontWeight: 600,
                borderRadius: '6px',
                cursor: 'pointer',
                border: statusFilter === '' ? '1px solid #38bdf8' : '1px solid rgba(255,255,255,0.08)',
                background: statusFilter === '' ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
                color: statusFilter === '' ? '#38bdf8' : '#94a3b8'
              }}
            >
              Todos ({cases.length})
            </button>
            <button
              onClick={() => setStatusFilter('Desaparecido')}
              style={{
                padding: '0.4rem 0.85rem',
                fontSize: '0.82rem',
                fontWeight: 600,
                borderRadius: '6px',
                cursor: 'pointer',
                border: statusFilter === 'Desaparecido' ? '1px solid #f87171' : '1px solid rgba(255,255,255,0.08)',
                background: statusFilter === 'Desaparecido' ? 'rgba(239, 68, 68, 0.15)' : 'transparent',
                color: statusFilter === 'Desaparecido' ? '#f87171' : '#94a3b8'
              }}
            >
              Desaparecidos ({stats.activos})
            </button>
            <button
              onClick={() => setStatusFilter('En Proceso de Rescate')}
              style={{
                padding: '0.4rem 0.85rem',
                fontSize: '0.82rem',
                fontWeight: 600,
                borderRadius: '6px',
                cursor: 'pointer',
                border: statusFilter === 'En Proceso de Rescate' ? '1px solid #fbbf24' : '1px solid rgba(255,255,255,0.08)',
                background: statusFilter === 'En Proceso de Rescate' ? 'rgba(245, 158, 11, 0.15)' : 'transparent',
                color: statusFilter === 'En Proceso de Rescate' ? '#fbbf24' : '#94a3b8'
              }}
            >
              En Operativo ({stats.enRescate})
            </button>
            <button
              onClick={() => setStatusFilter('Encontrado')}
              style={{
                padding: '0.4rem 0.85rem',
                fontSize: '0.82rem',
                fontWeight: 600,
                borderRadius: '6px',
                cursor: 'pointer',
                border: statusFilter === 'Encontrado' ? '1px solid #34d399' : '1px solid rgba(255,255,255,0.08)',
                background: statusFilter === 'Encontrado' ? 'rgba(16, 185, 129, 0.15)' : 'transparent',
                color: statusFilter === 'Encontrado' ? '#34d399' : '#94a3b8'
              }}
            >
              Localizados ({stats.localizados})
            </button>
          </div>

          {/* Toggle de Modo: Cuadrícula vs Mapa */}
          <div style={{
            display: 'flex',
            background: 'rgba(2, 6, 23, 0.6)',
            padding: '3px',
            borderRadius: '8px',
            border: '1px solid rgba(255, 255, 255, 0.08)'
          }}>
            <button
              onClick={() => setViewMode('grid')}
              style={{
                padding: '0.35rem 0.75rem',
                borderRadius: '6px',
                fontSize: '0.82rem',
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
                background: viewMode === 'grid' ? '#0284c7' : 'transparent',
                color: viewMode === 'grid' ? '#ffffff' : '#94a3b8'
              }}
            >
              Ver Fichas
            </button>
            <button
              onClick={() => setViewMode('map')}
              style={{
                padding: '0.35rem 0.75rem',
                borderRadius: '6px',
                fontSize: '0.82rem',
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
                background: viewMode === 'map' ? '#0284c7' : 'transparent',
                color: viewMode === 'map' ? '#ffffff' : '#94a3b8'
              }}
            >
              Mapa Nacional
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div style={{
          background: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          color: '#f87171',
          padding: '1rem',
          borderRadius: '8px',
          marginBottom: '1.5rem',
          textAlign: 'center'
        }}>
          {error}
        </div>
      )}

      {/* Contenido Principal */}
      {loading ? (
        <div className="cases-grid">
          {[1, 2, 3, 4, 5, 6].map((sk) => (
            <div key={sk} style={{
              background: 'rgba(15, 23, 42, 0.7)',
              border: '1px solid rgba(255, 255, 255, 0.05)',
              borderRadius: '12px',
              padding: '1rem'
            }}>
              <div className="skeleton-box" style={{ width: '100%', height: '220px', borderRadius: '8px', marginBottom: '1rem' }} />
              <div className="skeleton-box" style={{ width: '70%', height: '18px', borderRadius: '4px', marginBottom: '0.5rem' }} />
              <div className="skeleton-box" style={{ width: '50%', height: '14px', borderRadius: '4px', marginBottom: '0.5rem' }} />
              <div className="skeleton-box" style={{ width: '90%', height: '14px', borderRadius: '4px' }} />
            </div>
          ))}
        </div>
      ) : viewMode === 'map' ? (
        <div style={{
          background: 'rgba(15, 23, 42, 0.85)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '14px',
          padding: '1.25rem',
          marginBottom: '2rem'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#ffffff' }}>
                Mapa de Casos y Puntos de Interés
              </h3>
              <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.82rem', color: '#94a3b8' }}>
                Ubicación geográfica de reportes y alertas en el territorio de El Salvador.
              </p>
            </div>
            <span style={{ fontSize: '0.8rem', color: '#cbd5e1' }}>
              {filteredCases.length} casos georreferenciados
            </span>
          </div>
          <div style={{ borderRadius: '10px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }}>
            <MapaAlertas alerts={alerts} />
          </div>
        </div>
      ) : filteredCases.length === 0 ? (
        <div style={{
          background: 'rgba(15, 23, 42, 0.6)',
          border: '1px dashed rgba(255, 255, 255, 0.1)',
          borderRadius: '14px',
          padding: '4rem 2rem',
          textAlign: 'center'
        }}>
          <Search size={40} color="#64748b" style={{ marginBottom: '1rem' }} />
          <h3 style={{ color: '#ffffff', margin: 0 }}>No se encontraron reportes</h3>
          <p style={{ color: '#94a3b8', fontSize: '0.9rem', maxWidth: '420px', margin: '0.5rem auto 1.5rem' }}>
            No hay casos registrados con los filtros seleccionados. Intente ajustar el departamento o término de búsqueda.
          </p>
          <button
            onClick={() => {
              setSearch('');
              setDeptFilter('');
              setStatusFilter('');
              setAgeGroupFilter('all');
            }}
            className="btn btn-secondary"
            style={{ fontSize: '0.85rem' }}
          >
            Limpiar Filtros
          </button>
        </div>
      ) : (
        <div className="cases-grid">
          {filteredCases.map((caso) => {
            const isDesaparecido = caso.estado === 'Desaparecido';
            const isEnRescate = caso.estado === 'En Proceso de Rescate';
            const isEncontrado = caso.estado === 'Encontrado';

            return (
              <div
                key={caso.id}
                style={{
                  background: 'rgba(15, 23, 42, 0.85)',
                  border: isEnRescate 
                    ? '1px solid rgba(245, 158, 11, 0.4)' 
                    : isDesaparecido 
                    ? '1px solid rgba(239, 68, 68, 0.3)' 
                    : '1px solid rgba(16, 185, 129, 0.3)',
                  borderRadius: '14px',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'transform 0.2s ease, box-shadow 0.2s ease'
                }}
              >
                {/* Imagen del Caso */}
                <div style={{ position: 'relative', width: '100%', height: '230px', background: '#090d16' }}>
                  <img
                    src={getImageUrl(caso.foto_url)}
                    alt={caso.nombre_desaparecido}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    onError={(e) => {
                      e.target.src = 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=400&q=80';
                    }}
                  />

                  {/* Badge de Estado */}
                  <span style={{
                    position: 'absolute',
                    top: '10px',
                    right: '10px',
                    padding: '0.25rem 0.65rem',
                    borderRadius: '9999px',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    letterSpacing: '0.02em',
                    background: isDesaparecido 
                      ? 'rgba(225, 29, 72, 0.92)' 
                      : isEnRescate 
                      ? 'rgba(217, 119, 6, 0.92)' 
                      : 'rgba(5, 150, 105, 0.92)',
                    color: '#ffffff',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.4)'
                  }}>
                    {caso.estado}
                  </span>

                  {/* Identificador de Caso */}
                  <span style={{
                    position: 'absolute',
                    bottom: '8px',
                    left: '8px',
                    background: 'rgba(2, 6, 23, 0.85)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: '#cbd5e1',
                    fontSize: '0.68rem',
                    padding: '0.15rem 0.5rem',
                    borderRadius: '4px',
                    fontWeight: 600,
                    fontFamily: 'monospace'
                  }}>
                    EXP #{caso.id}
                  </span>
                </div>

                {/* Cuerpo de la Tarjeta - Limpio y Ordenado */}
                <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '0.6rem' }}>
                    <h3 style={{
                      fontSize: '1.15rem',
                      fontWeight: 700,
                      color: '#ffffff',
                      margin: 0,
                      lineHeight: 1.25
                    }}>
                      {caso.nombre_desaparecido}
                    </h3>
                  </div>

                  {/* Cuadro de Metadatos Organizado */}
                  <div style={{
                    background: 'rgba(2, 6, 23, 0.45)',
                    border: '1px solid rgba(255, 255, 255, 0.05)',
                    borderRadius: '8px',
                    padding: '0.65rem 0.85rem',
                    fontSize: '0.82rem',
                    color: '#94a3b8',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.35rem',
                    marginBottom: '0.85rem'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap' }}>
                      <span><strong style={{ color: '#e2e8f0' }}>Edad:</strong> {caso.edad} años</span>
                      <span><strong style={{ color: '#e2e8f0' }}>Género:</strong> {caso.genero}</span>
                    </div>
                    <div>
                      <strong style={{ color: '#e2e8f0' }}>Visto por última vez:</strong> {formatDate(caso.fecha_desaparicion)}
                    </div>
                    <div style={{ color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <MapPin size={13} />
                      <span style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {caso.ubicacion_desaparicion || 'El Salvador'}
                      </span>
                    </div>
                  </div>

                  {caso.descripcion && (
                    <p style={{
                      fontSize: '0.82rem',
                      color: '#cbd5e1',
                      lineHeight: 1.5,
                      marginBottom: '1rem',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden'
                    }}>
                      {caso.descripcion}
                    </p>
                  )}

                  {/* Acciones del Caso Organizadas */}
                  <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {/* Botón Principal de Expediente (Abre dentro del mismo portal) */}
                    <div style={{
                      marginTop: 'auto',
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: '0.5rem',
                      paddingTop: '0.4rem'
                    }}>
                      <Link
                        to={`/caso/${caso.id}`}
                        style={{
                          padding: '0.6rem 0.5rem',
                          borderRadius: '8px',
                          fontSize: '0.82rem',
                          fontWeight: 700,
                          background: '#0284c7',
                          color: '#ffffff',
                          textAlign: 'center',
                          textDecoration: 'none',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.35rem',
                          transition: 'background 0.2s',
                          boxShadow: '0 2px 6px rgba(2, 132, 199, 0.25)'
                        }}
                      >
                        <Eye size={14} />
                        <span>Ver Ficha</span>
                      </Link>

                      <button
                        onClick={() => {
                          setSightingInitialCaseId(caso.id);
                          setSightingModalOpen(true);
                        }}
                        title="Aportar pista o avistamiento ciudadano"
                        style={{
                          padding: '0.6rem 0.5rem',
                          borderRadius: '8px',
                          background: 'rgba(56, 189, 248, 0.1)',
                          border: '1px solid rgba(56, 189, 248, 0.3)',
                          color: '#38bdf8',
                          fontSize: '0.82rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.35rem',
                          transition: 'all 0.2s'
                        }}
                      >
                        <span>Aportar Pista</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modales */}
      <ReportSightingModal
        isOpen={sightingModalOpen}
        onClose={() => setSightingModalOpen(false)}
        initialCaseId={sightingInitialCaseId}
        cases={cases}
        onSuccess={(alerta) => {
          setActionSuccess(`¡Información registrada exitosamente para ${alerta.nombre_desaparecido || 'el caso'}! Las autoridades han sido notificadas.`);
          setTimeout(() => setActionSuccess(''), 6000);
        }}
      />

      <MissingPersonFlyerModal
        isOpen={Boolean(selectedFlyerCase)}
        caso={selectedFlyerCase}
        onClose={() => setSelectedFlyerCase(null)}
      />

      <ReversePhotoSearchModal
        isOpen={reverseSearchOpen}
        onClose={() => setReverseSearchOpen(false)}
      />
    </div>
  );
};

export default Dashboard;
