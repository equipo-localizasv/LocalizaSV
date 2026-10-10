import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import { AuthContext } from '../App';
import ReportSightingModal from '../components/ReportSightingModal';
import MissingPersonFlyerModal from '../components/MissingPersonFlyerModal';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Shield,
  MapPin,
  Calendar,
  Clock,
  User,
  CheckCircle2,
  AlertTriangle,
  Printer,
  Share2,
  Camera,
  Activity,
  FileText,
  UserCheck,
  ChevronLeft,
  Eye,
  Sparkles,
  PhoneCall,
  ExternalLink,
  Layers,
  ZoomIn,
  ListOrdered
} from 'lucide-react';

// Corrección de íconos de Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const CaseDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);

  const [caso, setCaso] = useState(null);
  const [dossier, setDossier] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updating, setUpdating] = useState(false);
  const [selectedPhotoPreview, setSelectedPhotoPreview] = useState(null);

  // Modales
  const [sightingModalOpen, setSightingModalOpen] = useState(false);
  const [flyerModalOpen, setFlyerModalOpen] = useState(false);

  const fetchCaseDetail = async () => {
    setLoading(true);
    setError('');
    try {
      const [caseRes, dossierRes] = await Promise.all([
        api.get(`/cases/${id}`),
        api.get(`/cases/${id}/dossier`).catch(() => ({ data: null }))
      ]);
      setCaso(caseRes.data);
      setDossier(dossierRes.data);
    } catch (err) {
      console.error('Error fetching case detail:', err);
      setError(err.response?.data?.error || 'No se pudo cargar la información del caso.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCaseDetail();
  }, [id]);

  const handleStatusChange = async (nuevoEstado) => {
    setError('');
    setUpdating(true);
    try {
      const response = await api.put(`/cases/${id}/estado`, { estado: nuevoEstado });
      setCaso((prev) => ({ ...prev, estado: response.data.caso.estado }));
      window.alert(nuevoEstado === 'Encontrado' 
        ? 'Aviso: La persona ha sido marcada como localizada.' 
        : 'Aviso: El caso se ha actualizado a ' + nuevoEstado);
    } catch (err) {
      console.error('Error updating status:', err);
      setError(err.response?.data?.error || 'No se pudo actualizar el estado del caso.');
    } finally {
      setUpdating(false);
    }
  };

  const handleAcceptSearch = async () => {
    if (!user) return;
    setUpdating(true);
    setError('');
    try {
      const response = await api.put(`/cases/${id}/aceptar`);
      setCaso((prev) => ({ ...prev, ...response.data.caso }));
      window.alert('¡Te has unido oficialmente al operativo de rescate de este caso!');
    } catch (err) {
      console.error('Error al aceptar búsqueda:', err);
      setError(err.response?.data?.error || 'No se pudo aceptar la búsqueda.');
    } finally {
      setUpdating(false);
    }
  };

  const getImageUrl = (path) => {
    if (!path) return 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=600&q=80';
    if (path.startsWith('http')) return path;
    const hostname = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
    return `http://${hostname}:3001${path}`;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'No especificada';
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat('es-SV', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    }).format(date);
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return 'Reciente';
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

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '6rem', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
        <div style={{ border: '3px solid rgba(255,255,255,0.1)', borderTop: '3px solid #0ea5e9', borderRadius: '50%', width: '40px', height: '40px', animation: 'spin 1s linear infinite' }} />
        <span style={{ color: 'var(--text-secondary)' }}>Cargando expediente digital C4I...</span>
      </div>
    );
  }

  if (error && !caso) {
    return (
      <div className="glass-panel text-center animate-fade-in" style={{ padding: '3rem 2rem', maxWidth: '600px', margin: '3rem auto' }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚠️</div>
        <h3>Error al cargar el expediente</h3>
        <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem', marginBottom: '2rem' }}>{error}</p>
        <Link to="/" className="btn btn-primary">Volver al Portal Principal</Link>
      </div>
    );
  }

  const handleDeleteCaseDetail = async () => {
    if (!window.confirm(`⚠️ ¿Está seguro que desea eliminar este expediente permanentemente de la base de datos nacional?`)) return;
    try {
      await api.delete(`/cases/${id}`);
      alert('✓ Expediente eliminado con éxito.');
      navigate('/moderacion');
    } catch (err) {
      alert(err.response?.data?.error || 'No se pudo eliminar el caso.');
    }
  };

  const isOwner = user && caso && user.id === caso.usuario_id;
  const canManageCase = isOwner || user?.rol === 'administrador' || user?.rol === 'moderador';
  const isDesaparecido = caso.estado === 'Desaparecido';
  const isEnRescate = caso.estado === 'En Proceso de Rescate';
  const isEncontrado = caso.estado === 'Encontrado';

  // Coordenadas para mapa
  const defaultCenter = [13.6929, -89.2182]; // San Salvador Centro
  const caseCoords = (() => {
    if (dossier?.heatmapPoints && dossier.heatmapPoints.length > 0) {
      return [dossier.heatmapPoints[0][0], dossier.heatmapPoints[0][1]];
    }
    return defaultCenter;
  })();

  const cctvAlerts = dossier?.alertas || [];

  // Línea de tiempo escrita (Timeline)
  const timelineEvents = (() => {
    if (dossier?.timeline && dossier.timeline.length > 0) {
      return dossier.timeline;
    }
    // Si aún no hay eventos en timeline, generar cronología pericial estructurada
    return [
      {
        icono: '📋',
        titulo: 'Registro Oficial de Denuncia',
        fecha: caso.created_at || caso.fecha_desaparicion,
        descripcion: `Expediente iniciado en plataforma por ${caso.creador_nombre || 'familiar directo'}. Asignado código pericial #${caso.id}.`
      },
      {
        icono: '🧬',
        titulo: 'Indexación Biométrica ArcFace 512-D',
        fecha: caso.created_at || new Date().toISOString(),
        descripcion: 'Vectorización facial generada y sincronizada en el circuito de videovigilancia policial de El Salvador.'
      },
      ...(isEnRescate || isEncontrado ? [{
        icono: '🚨',
        titulo: 'Activación de Código Ámbar / Cuadrante de Rescate',
        fecha: new Date().toISOString(),
        descripcion: 'Operativo táctico conjunto desplegado con unidades de campo y patrullaje focalizado.'
      }] : []),
      ...(isEncontrado ? [{
        icono: '✅',
        titulo: 'Localización Exitosa y Cierre de Protocolo',
        fecha: new Date().toISOString(),
        descripcion: 'Persona ubicada en condiciones seguras y reintegrada con sus familiares o autoridades correspondientes.'
      }] : [])
    ];
  })();

  return (
    <div className="animate-fade-in" style={{ width: '100%', maxWidth: '1540px', margin: '0 auto', paddingBottom: '4rem' }}>
      
      {/* 1. BARRA SUPERIOR TÁCTICA Y DE NAVEGACIÓN */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1rem',
        marginBottom: '1.25rem',
        paddingBottom: '1rem',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)'
      }}>
        {/* Lado Izquierdo: Miga de pan y Código de Expediente */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', flexWrap: 'wrap' }}>
          <button
            onClick={() => navigate('/')}
            className="btn btn-secondary"
            style={{ padding: '0.45rem 0.8rem', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
          >
            <ChevronLeft size={16} />
            <span>Volver al Portal</span>
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{
              background: 'rgba(2, 6, 23, 0.9)',
              border: '1px solid rgba(56, 189, 248, 0.35)',
              padding: '0.3rem 0.75rem',
              borderRadius: '6px',
              fontFamily: 'monospace',
              fontSize: '0.82rem',
              color: '#38bdf8',
              fontWeight: 800
            }}>
              EXP-SV #{caso.id}
            </span>

            <span style={{
              background: isDesaparecido ? 'rgba(225, 29, 72, 0.15)' : isEnRescate ? 'rgba(245, 158, 11, 0.15)' : 'rgba(16, 185, 129, 0.15)',
              border: `1px solid ${isDesaparecido ? '#ef4444' : isEnRescate ? '#f59e0b' : '#10b981'}`,
              color: isDesaparecido ? '#f87171' : isEnRescate ? '#fbbf24' : '#34d399',
              padding: '0.3rem 0.75rem',
              borderRadius: '9999px',
              fontSize: '0.78rem',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              {caso.estado}
            </span>
          </div>
        </div>

        {/* Lado Derecho: Barra de Acciones Operativas */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button
            onClick={() => setSightingModalOpen(true)}
            style={{
              padding: '0.5rem 0.9rem',
              borderRadius: '8px',
              background: 'rgba(56, 189, 248, 0.12)',
              border: '1px solid rgba(56, 189, 248, 0.35)',
              color: '#38bdf8',
              fontSize: '0.82rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem'
            }}
          >
            <Camera size={15} />
            <span>Aportar Pista</span>
          </button>

          <button
            onClick={() => setFlyerModalOpen(true)}
            style={{
              padding: '0.5rem 0.9rem',
              borderRadius: '8px',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              color: '#e2e8f0',
              fontSize: '0.82rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem'
            }}
          >
            <Printer size={15} />
            <span>Afiche Oficial</span>
          </button>

          <button
            onClick={() => {
              const text = `🚨 ALERTA NACIONAL LOCALIZASV: Ayúdanos a encontrar a ${caso.nombre_desaparecido} (${caso.edad} años). Visto en: ${caso.ubicacion_desaparicion}. Teléfono oficial: ${caso.telefono_contacto || '911'}. Más detalles: ${window.location.href}`;
              window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
            }}
            style={{
              padding: '0.5rem 0.9rem',
              borderRadius: '8px',
              background: 'rgba(34, 197, 94, 0.12)',
              border: '1px solid rgba(34, 197, 94, 0.3)',
              color: '#4ade80',
              fontSize: '0.82rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem'
            }}
          >
            <Share2 size={15} />
            <span>Difundir WhatsApp</span>
          </button>

          <button
            onClick={() => window.print()}
            style={{
              padding: '0.5rem 0.75rem',
              borderRadius: '8px',
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              color: '#94a3b8',
              cursor: 'pointer'
            }}
            title="Imprimir expediente completo"
          >
            <Printer size={16} />
          </button>
        </div>
      </div>

      {/* 2. ALERTA DE RESCATE EN CURSO (SI APLICA) */}
      {isEnRescate && (
        <div style={{
          background: 'rgba(245, 158, 11, 0.12)',
          border: '1px solid rgba(245, 158, 11, 0.4)',
          borderRadius: '12px',
          padding: '1rem 1.5rem',
          marginBottom: '1.25rem',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem'
        }}>
          <span style={{ fontSize: '2rem' }}>🚨</span>
          <div>
            <div style={{ fontWeight: 800, color: '#fbbf24', fontSize: '0.95rem' }}>
              OPERATIVO TÁCTICO DE RESCATE EN CURSO
            </div>
            <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.82rem', color: '#cbd5e1' }}>
              Este caso ha sido elevado a prioridad activa. Las cuadrillas de patrullaje y las cámaras perimetrales están cotejando el perímetro de búsqueda en tiempo real.
            </p>
          </div>
        </div>
      )}

      {/* 3. PIPELINE SUPERIOR HORIZONTAL DE 5 HITOS (SPAN COMPLETO) */}
      <div style={{
        background: 'rgba(15, 23, 42, 0.85)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '14px',
        padding: '1.1rem 1.5rem',
        marginBottom: '1.5rem',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Línea de Proceso Operativo C4I
          </span>
          <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
            Última actualización: {formatDateTime(caso.updated_at || caso.created_at)}
          </span>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: '0.75rem'
        }}>
          <div style={{
            background: 'rgba(14, 165, 233, 0.15)',
            border: '1px solid #0ea5e9',
            padding: '0.65rem',
            borderRadius: '8px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '1rem', marginBottom: '0.1rem' }}>📋</div>
            <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#38bdf8' }}>1. Reporte</div>
            <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>Admitido</div>
          </div>

          <div style={{
            background: 'rgba(14, 165, 233, 0.15)',
            border: '1px solid #0ea5e9',
            padding: '0.65rem',
            borderRadius: '8px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '1rem', marginBottom: '0.1rem' }}>🧬</div>
            <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#38bdf8' }}>2. Biometría</div>
            <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>Indexada 512-D</div>
          </div>

          <div style={{
            background: isEnRescate || isEncontrado ? 'rgba(245, 158, 11, 0.15)' : 'rgba(255, 255, 255, 0.04)',
            border: `1px solid ${isEnRescate || isEncontrado ? '#f59e0b' : 'rgba(255, 255, 255, 0.08)'}`,
            padding: '0.65rem',
            borderRadius: '8px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '1rem', marginBottom: '0.1rem' }}>📡</div>
            <div style={{
              fontSize: '0.75rem',
              fontWeight: 800,
              color: isEnRescate || isEncontrado ? '#fbbf24' : '#94a3b8'
            }}>
              3. Alerta Ámbar
            </div>
            <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>
              {isEnRescate || isEncontrado ? 'Difundida' : 'En monitoreo'}
            </div>
          </div>

          <div style={{
            background: isEnRescate ? 'rgba(245, 158, 11, 0.2)' : isEncontrado ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.04)',
            border: `1px solid ${isEnRescate ? '#f59e0b' : isEncontrado ? '#10b981' : 'rgba(255, 255, 255, 0.08)'}`,
            padding: '0.65rem',
            borderRadius: '8px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '1rem', marginBottom: '0.1rem' }}>🤝</div>
            <div style={{
              fontSize: '0.75rem',
              fontWeight: 800,
              color: isEnRescate ? '#fbbf24' : isEncontrado ? '#10b981' : '#94a3b8'
            }}>
              4. Búsqueda
            </div>
            <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>
              {isEnRescate ? 'En curso' : isEncontrado ? 'Completado' : 'Activa'}
            </div>
          </div>

          <div style={{
            background: isEncontrado ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.04)',
            border: `1px solid ${isEncontrado ? '#10b981' : 'rgba(255, 255, 255, 0.08)'}`,
            padding: '0.65rem',
            borderRadius: '8px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '1rem', marginBottom: '0.1rem' }}>✅</div>
            <div style={{ fontSize: '0.75rem', fontWeight: 800, color: isEncontrado ? '#10b981' : '#64748b' }}>
              5. Localización
            </div>
            <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>
              {isEncontrado ? 'Localizado' : 'Pendiente'}
            </div>
          </div>
        </div>
      </div>

      {/* 4. GRID PRINCIPAL BALANCEADO: LADO IZQUIERDO Y LADO DERECHO APROVECHANDO TODO EL ANCHO */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(480px, 1fr))',
        gap: '1.5rem',
        alignItems: 'start'
      }}>
        
        {/* =========================================================
            COLUMNA IZQUIERDA: IDENTIDAD VISUAL, MORFOLOGÍA Y BIOMETRÍA
           ========================================================= */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Tarjeta 1: Fotografía Oficial con Datos Centrales */}
          <div style={{
            background: 'rgba(15, 23, 42, 0.85)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '14px',
            overflow: 'hidden',
            boxShadow: '0 8px 30px rgba(0, 0, 0, 0.5)'
          }}>
            <div style={{ position: 'relative', height: '380px', background: '#090d16' }}>
              <img
                src={getImageUrl(caso.foto_url)}
                alt={caso.nombre_desaparecido}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                onError={(e) => {
                  e.target.src = 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=600&q=80';
                }}
              />
              <div style={{
                position: 'absolute',
                top: '12px',
                right: '12px',
                padding: '0.25rem 0.65rem',
                borderRadius: '9999px',
                fontSize: '0.72rem',
                fontWeight: 800,
                background: isDesaparecido ? 'rgba(225, 29, 72, 0.95)' : isEnRescate ? 'rgba(217, 119, 6, 0.95)' : 'rgba(5, 150, 105, 0.95)',
                color: '#fff'
              }}>
                {caso.estado}
              </div>

              <div style={{
                position: 'absolute',
                bottom: '12px',
                left: '12px',
                background: 'rgba(2, 6, 23, 0.85)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                padding: '0.3rem 0.75rem',
                borderRadius: '6px',
                fontSize: '0.78rem',
                color: '#38bdf8',
                fontWeight: 700
              }}>
                Registro Fotográfico Oficial • {caso.nombre_desaparecido}
              </div>

              {/* Botón de Zoom */}
              <button
                onClick={() => setSelectedPhotoPreview(getImageUrl(caso.foto_url))}
                title="Ampliar imagen"
                style={{
                  position: 'absolute',
                  bottom: '12px',
                  right: '12px',
                  background: 'rgba(2, 6, 23, 0.85)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  color: '#fff',
                  width: '32px',
                  height: '32px',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer'
                }}
              >
                <ZoomIn size={16} />
              </button>
            </div>

            {/* Acción Comunitaria de Búsqueda */}
            {isDesaparecido && (
              <div style={{ padding: '1.1rem 1.25rem', borderTop: '1px solid rgba(255, 255, 255, 0.06)', background: 'rgba(2, 6, 23, 0.4)' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#f8fafc', marginBottom: '0.25rem' }}>
                  🤝 Brigada de Búsqueda Ciudadana
                </div>
                <p style={{ fontSize: '0.78rem', color: '#94a3b8', margin: '0 0 0.75rem 0' }}>
                  Colabora activamente en recorridos de campo y verificación comunitaria.
                </p>
                {user ? (
                  <button
                    onClick={handleAcceptSearch}
                    disabled={updating}
                    className="btn btn-primary"
                    style={{
                      width: '100%',
                      padding: '0.55rem',
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      background: 'linear-gradient(135deg, #0284c7, #2563eb)'
                    }}
                  >
                    <UserCheck size={15} />
                    <span>{updating ? 'Procesando...' : 'Unirme Oficialmente a la Búsqueda'}</span>
                  </button>
                ) : (
                  <Link
                    to="/login"
                    className="btn btn-secondary"
                    style={{ width: '100%', padding: '0.55rem', fontSize: '0.82rem', textAlign: 'center', display: 'block', textDecoration: 'none' }}
                  >
                    Iniciar Sesión para Unirme
                  </Link>
                )}
              </div>
            )}

            {/* Control de Propietario / Moderador / Administrador / Autoridad */}
            {(canManageCase || user?.rol === 'autoridad') && (
              <div style={{ padding: '1rem 1.25rem', borderTop: '1px solid rgba(255, 255, 255, 0.08)', background: 'rgba(2, 132, 199, 0.06)' }}>
                <span style={{ fontSize: '0.72rem', color: '#38bdf8', fontWeight: 800, textTransform: 'uppercase', display: 'block', marginBottom: '0.5rem' }}>
                  ⚙️ Gestión de Estado del Expediente:
                </span>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {isDesaparecido && (
                    <button
                      onClick={() => handleStatusChange('Encontrado')}
                      disabled={updating}
                      style={{
                        flex: 1,
                        padding: '0.5rem',
                        background: '#10b981',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      Marcar como Localizado
                    </button>
                  )}
                  {isEncontrado && (
                    <button
                      onClick={() => handleStatusChange('Desaparecido')}
                      disabled={updating}
                      style={{
                        flex: 1,
                        padding: '0.5rem',
                        background: '#ef4444',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      Reabrir Búsqueda Activa
                    </button>
                  )}
                  {canManageCase && (
                    <button
                      type="button"
                      onClick={handleDeleteCaseDetail}
                      style={{
                        padding: '0.5rem 0.8rem',
                        background: 'rgba(239, 68, 68, 0.15)',
                        border: '1px solid rgba(239, 68, 68, 0.4)',
                        color: '#f87171',
                        borderRadius: '6px',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      🗑️ Eliminar Expediente
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Tarjeta 2: Ficha Descriptiva y Rasgos Morfológicos */}
          <div style={{
            background: 'rgba(15, 23, 42, 0.85)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '14px',
            padding: '1.25rem 1.5rem',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)'
          }}>
            <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.05rem', color: '#f8fafc', fontWeight: 800 }}>
              Ficha Descriptiva y Rasgos Físicos
            </h3>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '0.75rem',
              marginBottom: '1rem'
            }}>
              <div style={{ background: 'rgba(2, 6, 23, 0.5)', padding: '0.7rem 0.85rem', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                <div style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>Edad al Desaparecer</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#f8fafc', marginTop: '0.1rem' }}>{caso.edad} años</div>
              </div>

              <div style={{ background: 'rgba(2, 6, 23, 0.5)', padding: '0.7rem 0.85rem', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                <div style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>Género</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#f8fafc', marginTop: '0.1rem' }}>{caso.genero || 'No especificado'}</div>
              </div>

              <div style={{ background: 'rgba(2, 6, 23, 0.5)', padding: '0.7rem 0.85rem', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                <div style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>Fecha del Hecho</div>
                <div style={{ fontSize: '0.92rem', fontWeight: 700, color: '#f8fafc', marginTop: '0.1rem' }}>{formatDate(caso.fecha_desaparicion)}</div>
              </div>

              <div style={{ background: 'rgba(2, 6, 23, 0.5)', padding: '0.7rem 0.85rem', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                <div style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>Canal de Contacto Oficial</div>
                <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#38bdf8', marginTop: '0.1rem' }}>
                  {caso.telefono_contacto || 'PNC 911 / 122'}
                </div>
                {caso.telefono_privado && (
                  <div style={{ fontSize: '0.68rem', color: '#10b981', marginTop: '0.2rem', fontWeight: 600 }}>
                    🛡️ Línea resguardada contra extorsiones y estafas
                  </div>
                )}
              </div>
            </div>

            {/* Datos morfológicos específicos */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.65rem',
              background: 'rgba(2, 6, 23, 0.4)',
              padding: '1rem',
              borderRadius: '10px',
              border: '1px solid rgba(255, 255, 255, 0.05)'
            }}>
              {caso.direccion_vivienda && (
                <div style={{ background: 'rgba(52, 211, 153, 0.08)', padding: '0.6rem 0.75rem', borderRadius: '6px', border: '1px solid rgba(52, 211, 153, 0.25)' }}>
                  <strong style={{ color: '#34d399', fontSize: '0.72rem', textTransform: 'uppercase', display: 'block' }}>🏠 Vivienda Habitual (Traslado Seguro PNC):</strong>
                  <span style={{ color: '#e2e8f0', fontSize: '0.85rem', fontWeight: 600 }}>{caso.direccion_vivienda}</span>
                </div>
              )}

              {caso.parentesco_reportante && (
                <div>
                  <strong style={{ color: '#94a3b8', fontSize: '0.72rem', textTransform: 'uppercase', display: 'block' }}>👤 Parentesco o Vínculo del Reportante:</strong>
                  <span style={{ color: '#e2e8f0', fontSize: '0.82rem' }}>{caso.parentesco_reportante} (🛡️ Datos Personales Resguardados por C4I)</span>
                </div>
              )}

              <div>
                <strong style={{ color: '#94a3b8', fontSize: '0.72rem', textTransform: 'uppercase', display: 'block' }}>👕 Vestimenta:</strong>
                <span style={{ color: '#e2e8f0', fontSize: '0.82rem' }}>{caso.vestimenta || 'Ropa civil cotidiana reportada'}</span>
              </div>

              <div>
                <strong style={{ color: '#94a3b8', fontSize: '0.72rem', textTransform: 'uppercase', display: 'block' }}>🔍 Señas Particulares:</strong>
                <span style={{ color: '#e2e8f0', fontSize: '0.82rem' }}>{caso.senas_particulares || 'Sin señas específicas reportadas'}</span>
              </div>

              <div>
                <strong style={{ color: '#94a3b8', fontSize: '0.72rem', textTransform: 'uppercase', display: 'block' }}>📏 Estatura / Complexión:</strong>
                <span style={{ color: '#e2e8f0', fontSize: '0.82rem' }}>
                  {caso.estatura_cm ? `${caso.estatura_cm} cm` : 'Estatura promedio'} {caso.complexion ? `• ${caso.complexion}` : ''}
                </span>
              </div>

              <div>
                <strong style={{ color: '#94a3b8', fontSize: '0.72rem', textTransform: 'uppercase', display: 'block' }}>📍 Última Ubicación Reportada:</strong>
                <span style={{ color: '#38bdf8', fontSize: '0.82rem', fontWeight: 600 }}>{caso.ubicacion_desaparicion || 'El Salvador'}</span>
              </div>

              {caso.condicion_medica && (
                <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.06)', paddingTop: '0.5rem' }}>
                  <strong style={{ color: '#f87171', fontSize: '0.72rem', textTransform: 'uppercase', display: 'block' }}>⚠️ Condición Médica / Tratamiento Requerido:</strong>
                  <span style={{ color: '#fca5a5', fontSize: '0.82rem', fontWeight: 600 }}>{caso.condicion_medica}</span>
                </div>
              )}
            </div>

            {/* Narrativa de circunstancias */}
            <div style={{ marginTop: '1rem' }}>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700, marginBottom: '0.3rem' }}>
                Resumen de Circunstancias:
              </div>
              <p style={{ margin: 0, fontSize: '0.85rem', color: '#cbd5e1', lineHeight: 1.5, background: 'rgba(2, 6, 23, 0.3)', padding: '0.85rem', borderRadius: '8px', borderLeft: '3px solid #0284c7' }}>
                {caso.descripcion || 'Sin narrativa adicional provista al momento del registro.'}
              </p>
            </div>
          </div>

          {/* Tarjeta 3: Identidad Biométrica ArcFace 512-D */}
          <div style={{
            background: 'rgba(15, 23, 42, 0.85)',
            border: '1px solid rgba(2, 132, 199, 0.3)',
            borderRadius: '14px',
            padding: '1.25rem',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.75rem' }}>
              <Shield size={18} color="#00f0ff" />
              <h4 style={{ margin: 0, fontSize: '0.95rem', color: '#f8fafc', fontWeight: 800 }}>
                Identidad Biométrica ArcFace 512-D
              </h4>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.78rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.4rem 0.6rem', background: 'rgba(2, 6, 23, 0.5)', borderRadius: '6px' }}>
                <span style={{ color: '#94a3b8' }}>Modelo Neuronal:</span>
                <span style={{ color: '#00f0ff', fontWeight: 700, fontFamily: 'monospace' }}>InsightFace / SFace ResNet-50</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.4rem 0.6rem', background: 'rgba(2, 6, 23, 0.5)', borderRadius: '6px' }}>
                <span style={{ color: '#94a3b8' }}>Vector de Dispersión:</span>
                <span style={{ color: '#38bdf8', fontWeight: 700, fontFamily: 'monospace' }}>512 dimensiones indexadas</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.4rem 0.6rem', background: 'rgba(2, 6, 23, 0.5)', borderRadius: '6px' }}>
                <span style={{ color: '#94a3b8' }}>Estado en Cámaras:</span>
                <span style={{ color: '#34d399', fontWeight: 700 }}>Activo en Circuito Nacional</span>
              </div>
            </div>
          </div>

        </div>

        {/* =========================================================
            COLUMNA DERECHA: HISTORIAL ESCRITO, DETECCIONES CCTV Y MAPA
           ========================================================= */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Tarjeta 1: Línea de Tiempo / Bitácora Forense Escrita (¡REQUERIMIENTO CLAVE!) */}
          <div style={{
            background: 'rgba(15, 23, 42, 0.85)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '14px',
            padding: '1.25rem 1.5rem',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.15rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  background: 'rgba(14, 165, 233, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#38bdf8'
                }}>
                  <ListOrdered size={18} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.05rem', color: '#f8fafc', fontWeight: 800 }}>
                    Bitácora Cronológica de Investigación ({timelineEvents.length})
                  </h3>
                  <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                    Historial pericial documentado paso a paso por fecha y hora
                  </span>
                </div>
              </div>

              <span style={{
                background: 'rgba(56, 189, 248, 0.12)',
                color: '#38bdf8',
                fontSize: '0.72rem',
                padding: '0.2rem 0.55rem',
                borderRadius: '6px',
                fontWeight: 700
              }}>
                HISTORIAL ESCRITO
              </span>
            </div>

            {/* Lista cronológica con diseño de árbol pericial */}
            <div style={{
              position: 'relative',
              borderLeft: '2px solid rgba(56, 189, 248, 0.35)',
              paddingLeft: '1.25rem',
              marginLeft: '0.75rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.15rem'
            }}>
              {timelineEvents.map((evt, idx) => (
                <div key={idx} style={{ position: 'relative' }}>
                  {/* Nodo circular en la línea */}
                  <div style={{
                    position: 'absolute',
                    left: '-1.85rem',
                    top: '2px',
                    width: '22px',
                    height: '22px',
                    borderRadius: '50%',
                    background: '#0a0f1d',
                    border: '2px solid #38bdf8',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.75rem'
                  }}>
                    {evt.icono || '•'}
                  </div>

                  <div style={{
                    background: 'rgba(2, 6, 23, 0.5)',
                    border: '1px solid rgba(255, 255, 255, 0.06)',
                    borderRadius: '8px',
                    padding: '0.75rem 0.95rem'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.35rem', marginBottom: '0.3rem' }}>
                      <strong style={{ color: '#f8fafc', fontSize: '0.88rem' }}>{evt.titulo}</strong>
                      <span style={{ fontSize: '0.7rem', color: '#94a3b8', background: 'rgba(255, 255, 255, 0.05)', padding: '0.15rem 0.45rem', borderRadius: '4px' }}>
                        {formatDateTime(evt.fecha)}
                      </span>
                    </div>
                    <p style={{ margin: 0, fontSize: '0.8rem', color: '#cbd5e1', lineHeight: 1.45 }}>
                      {evt.descripcion}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Tarjeta 2: Registro de Detecciones en Circuito CCTV (Capturas con IA) */}
          <div style={{
            background: 'rgba(15, 23, 42, 0.85)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '14px',
            padding: '1.25rem 1.5rem',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.05rem', color: '#f8fafc', fontWeight: 800 }}>
                  📹 Capturas Fotográficas en Cámaras CCTV ({cctvAlerts.length})
                </h3>
                <p style={{ margin: '0.15rem 0 0 0', fontSize: '0.78rem', color: '#94a3b8' }}>
                  Fotogramas cotejados por el motor biométrico en tiempo real
                </p>
              </div>
              <span style={{
                background: 'rgba(2, 132, 199, 0.15)',
                color: '#38bdf8',
                fontSize: '0.72rem',
                padding: '0.2rem 0.55rem',
                borderRadius: '6px',
                fontWeight: 700
              }}>
                HISTORIAL VISUAL
              </span>
            </div>

            {cctvAlerts.length === 0 ? (
              <div style={{
                background: 'rgba(2, 6, 23, 0.4)',
                border: '1px dashed rgba(255, 255, 255, 0.1)',
                borderRadius: '10px',
                padding: '1.75rem',
                textAlign: 'center'
              }}>
                <Camera size={32} color="#64748b" style={{ marginBottom: '0.5rem' }} />
                <div style={{ color: '#cbd5e1', fontSize: '0.85rem', fontWeight: 600 }}>Sin detecciones visuales de cámaras aún</div>
                <p style={{ color: '#94a3b8', fontSize: '0.78rem', margin: '0.25rem auto 0', maxWidth: '380px' }}>
                  Las cámaras del circuito nacional escanean activamente. Al detectar coincidencia facial se anexará aquí la evidencia.
                </p>
              </div>
            ) : (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
                gap: '0.75rem'
              }}>
                {cctvAlerts.map((alerta, idx) => {
                  const captureUrl = getImageUrl(alerta.foto_evidencia_url || alerta.captura_url);
                  const simPct = Math.round(alerta.similitud * 100);

                  return (
                    <div
                      key={idx}
                      onClick={() => setSelectedPhotoPreview(captureUrl)}
                      style={{
                        background: 'rgba(2, 6, 23, 0.7)',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        borderRadius: '8px',
                        overflow: 'hidden',
                        cursor: 'pointer',
                        transition: 'transform 0.15s',
                        position: 'relative'
                      }}
                    >
                      <div style={{ height: '95px', position: 'relative' }}>
                        <img
                          src={captureUrl}
                          alt={`Detección CCTV ${idx + 1}`}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          onError={(e) => {
                            e.target.src = 'https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&w=300&q=80';
                          }}
                        />
                        <span style={{
                          position: 'absolute',
                          top: '4px',
                          right: '4px',
                          background: simPct >= 80 ? 'rgba(16, 185, 129, 0.9)' : 'rgba(245, 158, 11, 0.9)',
                          color: '#fff',
                          fontSize: '0.65rem',
                          fontWeight: 800,
                          padding: '0.1rem 0.35rem',
                          borderRadius: '4px'
                        }}>
                          {simPct}%
                        </span>
                      </div>
                      <div style={{ padding: '0.4rem 0.5rem', fontSize: '0.7rem' }}>
                        <div style={{ color: '#38bdf8', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          📹 {alerta.camara_nombre || `Cámara #${alerta.camara_id || idx + 1}`}
                        </div>
                        <div style={{ color: '#94a3b8', fontSize: '0.65rem' }}>
                          {formatDateTime(alerta.created_at || alerta.timestamp)}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Tarjeta 3: Visor Cartográfico Táctico Leaflet */}
          <div style={{
            background: 'rgba(15, 23, 42, 0.85)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '14px',
            padding: '1.25rem 1.5rem',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.05rem', color: '#f8fafc', fontWeight: 800 }}>
                  🗺️ Visor Táctico de Geolocalización
                </h3>
                <p style={{ margin: '0.15rem 0 0 0', fontSize: '0.78rem', color: '#94a3b8' }}>
                  Último punto registrado: <strong>{caso.ubicacion_desaparicion}</strong>
                </p>
              </div>
            </div>

            <div style={{
              height: '280px',
              borderRadius: '10px',
              overflow: 'hidden',
              border: '1px solid rgba(255, 255, 255, 0.1)'
            }}>
              <MapContainer
                center={caseCoords}
                zoom={14}
                style={{ height: '100%', width: '100%' }}
                scrollWheelZoom={false}
              >
                <TileLayer
                  attribution='&copy; OpenStreetMap'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <Marker position={caseCoords}>
                  <Popup>
                    <div style={{ padding: '0.3rem', fontSize: '0.8rem' }}>
                      <strong style={{ color: '#0284c7' }}>{caso.nombre_desaparecido}</strong>
                      <div style={{ marginTop: '0.2rem' }}>
                        {caso.ubicacion_desaparicion}
                      </div>
                    </div>
                  </Popup>
                </Marker>
              </MapContainer>
            </div>
          </div>

        </div>
      </div>

      {/* MODAL LIGHTBOX PARA AMPLIAR FOTOGRAFÍAS */}
      {selectedPhotoPreview && (
        <div
          className="modal-overlay animate-fade-in"
          style={{ zIndex: 13000, background: 'rgba(0,0,0,0.92)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => setSelectedPhotoPreview(null)}
        >
          <div style={{ maxWidth: '850px', width: '90%', textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
            <img
              src={selectedPhotoPreview}
              alt="Evidencia en alta resolución"
              style={{ maxHeight: '82vh', maxWidth: '100%', borderRadius: '12px', border: '2px solid #38bdf8', boxShadow: '0 0 40px rgba(2, 132, 199, 0.5)' }}
            />
            <div style={{ marginTop: '0.75rem', display: 'flex', justifyContent: 'center', gap: '0.75rem' }}>
              <button
                onClick={() => setSelectedPhotoPreview(null)}
                className="btn btn-secondary"
                style={{ fontSize: '0.82rem', padding: '0.4rem 1rem' }}
              >
                Cerrar Visor
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODALES FUNCIONALES */}
      <ReportSightingModal
        isOpen={sightingModalOpen}
        onClose={() => setSightingModalOpen(false)}
        initialCaseId={id}
        onSuccess={() => {
          fetchCaseDetail();
        }}
      />

      <MissingPersonFlyerModal
        isOpen={flyerModalOpen}
        caso={caso}
        onClose={() => setFlyerModalOpen(false)}
      />
    </div>
  );
};

export default CaseDetail;
