import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import { AuthContext } from '../App';
import ReportSightingModal from '../components/ReportSightingModal';
import MissingPersonFlyerModal from '../components/MissingPersonFlyerModal';
import AgeProgressionModal from '../components/AgeProgressionModal';

const CaseDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);

  const [caso, setCaso] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updating, setUpdating] = useState(false);
  const [sightingModalOpen, setSightingModalOpen] = useState(false);
  const [flyerModalOpen, setFlyerModalOpen] = useState(false);
  const [ageProgressionOpen, setAgeProgressionOpen] = useState(false);


  const fetchCaseDetail = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get(`/cases/${id}`);
      setCaso(response.data);
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
        : 'Aviso: El caso se ha reabierto como Desaparecido.');
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

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '6rem', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
        <div style={{ border: '3px solid rgba(255,255,255,0.1)', borderTop: '3px solid #0ea5e9', borderRadius: '50%', width: '40px', height: '40px', animation: 'spin 1s linear infinite' }} />
        <span style={{ color: 'var(--text-secondary)' }}>Cargando ficha del caso...</span>
      </div>
    );
  }

  if (error && !caso) {
    return (
      <div className="glass-panel text-center animate-fade-in" style={{ padding: '3rem 2rem' }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚠️</div>
        <h3>Error al cargar</h3>
        <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem', marginBottom: '2rem' }}>{error}</p>
        <Link to="/" className="btn btn-primary">Volver al Dashboard</Link>
      </div>
    );
  }

  const isOwner = user && caso && user.id === caso.usuario_id;

  return (
    <div className="animate-fade-in">
      <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', fontSize: '0.95rem' }}>
        ← Volver a la lista de casos
      </Link>

      {error && <div className="auth-error mb-4">{error}</div>}

      {/* Banner de Rescate en Detalle de Caso */}
      {caso && caso.estado === 'En Proceso de Rescate' && (
        <div
          className="glass-panel animate-fade-in"
          style={{
            background: 'linear-gradient(90deg, rgba(239, 68, 68, 0.2), rgba(245, 158, 11, 0.2))',
            border: '1px solid #f59e0b',
            borderRadius: '12px',
            padding: '1.25rem 1.5rem',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem'
          }}
        >
          <span style={{ fontSize: '2.5rem' }}>🚨</span>
          <div>
            <h3 style={{ margin: 0, color: '#fbbf24', fontSize: '1.2rem' }}>
              OPERATIVO DE RESCATE EN PROCESO
            </h3>
            <p style={{ margin: '0.35rem 0 0 0', color: '#f1f5f9', fontSize: '0.95rem' }}>
              Este caso cuenta con búsqueda solidaria activa en curso.{' '}
              {caso.rescatista_nombre && (
                <strong>Voluntario líder: {caso.rescatista_nombre}</strong>
              )}
            </p>
          </div>
        </div>
      )}

      {caso && (
        <div className="glass-panel case-detail-grid" style={{ padding: '2rem' }}>
          <div>
            <div style={{ position: 'relative' }}>
              <img 
                src={getImageUrl(caso.foto_url)} 
                alt={caso.nombre_desaparecido} 
                className="detail-img"
                onError={(e) => {
                  e.target.src = 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=600&q=80';
                }}
              />
              <span className={`status-badge ${caso.estado === 'En Proceso de Rescate' ? 'warning' : caso.estado.toLowerCase()}`} style={{ top: '1.5rem', right: '1.5rem', fontSize: '0.85rem', padding: '0.5rem 1rem' }}>
                {caso.estado}
              </span>
            </div>

            {/* Acción Comunitaria: Botón Ayudar en la Búsqueda */}
            {caso.estado === 'Desaparecido' && (
              <div className="glass-panel" style={{ marginTop: '1.5rem', padding: '1.25rem', textAlign: 'center', background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
                <h4 style={{ margin: '0 0 0.5rem 0', color: '#f59e0b', fontSize: '1.05rem' }}>
                  🤝 Colaboración Solidaria
                </h4>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                  ¿Estás cerca del área o puedes participar en la búsqueda de {caso.nombre_desaparecido}?
                </p>
                {user ? (
                  <button
                    onClick={handleAcceptSearch}
                    disabled={updating}
                    className="btn btn-warning w-100"
                    style={{
                      padding: '0.75rem',
                      fontWeight: '700',
                      fontSize: '0.95rem',
                      background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer'
                    }}
                  >
                    {updating ? 'Procesando...' : '🤝 Aceptar y Ayudar en la Búsqueda'}
                  </button>
                ) : (
                  <Link to="/login" className="btn btn-secondary w-100">
                    Inicia sesión para ayudar
                  </Link>
                )}

                <div style={{ marginTop: '0.75rem' }}>
                  <button
                    onClick={() => setSightingModalOpen(true)}
                    className="btn w-100"
                    style={{
                      padding: '0.75rem',
                      fontWeight: '700',
                      fontSize: '0.95rem',
                      background: 'linear-gradient(135deg, #0284c7, #0369a1)',
                      color: '#fff',
                      border: '1px solid rgba(56, 189, 248, 0.4)',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem',
                      boxShadow: '0 4px 12px rgba(2, 132, 199, 0.25)'
                    }}
                  >
                    📸 Subir Foto de Evidencia / Avistamiento
                  </button>
                </div>
              </div>
            )}

            {/* Herramientas de Difusión Solidaria */}
            <div className="glass-panel" style={{ marginTop: '1.25rem', padding: '1rem', textAlign: 'center' }}>
              <div style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: '700', marginBottom: '0.75rem' }}>
                Difusión Comunitaria
              </div>
              <button
                onClick={() => setFlyerModalOpen(true)}
                className="btn btn-danger w-100"
                style={{
                  marginBottom: '0.5rem',
                  padding: '0.65rem',
                  fontSize: '0.9rem',
                  fontWeight: '700',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.45rem'
                }}
              >
                <span>📄</span>
                <span>Generar Cartel Forense (Multiformato)</span>
              </button>

              <button
                onClick={() => setAgeProgressionOpen(true)}
                className="btn w-100"
                style={{
                  marginBottom: '0.5rem',
                  padding: '0.6rem',
                  fontSize: '0.85rem',
                  fontWeight: '700',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.45rem',
                  background: 'rgba(0, 240, 255, 0.12)',
                  border: '1px solid rgba(0, 240, 255, 0.4)',
                  color: '#00f0ff',
                  borderRadius: '6px'
                }}
              >
                <span>⏳</span>
                <span>Proyección de Edad Facial (IA)</span>
              </button>

              <button
                onClick={() => {
                  const text = `🚨 *ALERTA LOCALIZASV*: Ayúdanos a encontrar a *${caso.nombre_desaparecido}* (${caso.edad} años). Visto en: ${caso.ubicacion_desaparicion}. Teléfono de emergencia: ${caso.telefono_contacto} o PNC 911.\n\nVer caso completo: ${window.location.href}`;
                  window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
                }}
                className="btn w-100"
                style={{
                  background: 'rgba(37, 211, 102, 0.15)',
                  border: '1px solid rgba(37, 211, 102, 0.4)',
                  color: '#4ade80',
                  padding: '0.55rem',
                  fontSize: '0.85rem',
                  fontWeight: '600',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.45rem'
                }}
              >
                <span>💬</span>
                <span>Compartir por WhatsApp</span>
              </button>
            </div>

            {isOwner && (
              <div className="glass-panel" style={{ marginTop: '1.5rem', padding: '1.25rem', textAlign: 'center', background: 'rgba(255, 255, 255, 0.01)' }}>
                <h4 style={{ marginBottom: '0.75rem', fontSize: '1rem' }}>Gestión de Propietario</h4>
                {caso.estado !== 'Encontrado' ? (
                  <button 
                    onClick={() => handleStatusChange('Encontrado')} 
                    className="btn btn-success w-100"
                    disabled={updating}
                  >
                    {updating ? 'Actualizando...' : '✓ Marcar como Localizado(a)'}
                  </button>
                ) : (
                  <button 
                    onClick={() => handleStatusChange('Desaparecido')} 
                    className="btn btn-danger w-100"
                    disabled={updating}
                  >
                    {updating ? 'Actualizando...' : '⚠ Reabrir caso (Desaparecido)'}
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="detail-info">
            <div className="detail-section">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                <h1 className="detail-title" style={{ margin: 0 }}>{caso.nombre_desaparecido}</h1>
                <span className="cyber-badge-cyan">CASO #{caso.id} • BIO 512D</span>
              </div>
              <p style={{ color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                Expediente digital registrado en la red nacional el {formatDate(caso.created_at)}
              </p>
            </div>

            {/* Forensic Investigation Milestone Roadmap */}
            <div style={{
              background: 'rgba(15, 23, 42, 0.75)',
              border: '1px solid rgba(0, 240, 255, 0.25)',
              borderRadius: '12px',
              padding: '1.25rem',
              marginBottom: '1.5rem'
            }}>
              <div style={{
                fontSize: '0.8rem',
                fontWeight: 800,
                color: '#00f0ff',
                textTransform: 'uppercase',
                letterSpacing: '1px',
                marginBottom: '1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                <span>📍</span>
                <span>Hoja de Ruta Forense y Estado del Operativo</span>
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                gap: '0.75rem',
                position: 'relative'
              }}>
                <div style={{
                  padding: '0.75rem',
                  borderRadius: '8px',
                  background: 'rgba(16, 185, 129, 0.15)',
                  border: '1px solid #10b981',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '1.2rem', marginBottom: '0.2rem' }}>📋</div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#10b981' }}>1. Registro</div>
                  <div style={{ fontSize: '0.65rem', color: '#94a3b8' }}>Ficha activada</div>
                </div>

                <div style={{
                  padding: '0.75rem',
                  borderRadius: '8px',
                  background: 'rgba(16, 185, 129, 0.15)',
                  border: '1px solid #10b981',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '1.2rem', marginBottom: '0.2rem' }}>🧬</div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#10b981' }}>2. Biometría</div>
                  <div style={{ fontSize: '0.65rem', color: '#94a3b8' }}>Vector 512D OK</div>
                </div>

                <div style={{
                  padding: '0.75rem',
                  borderRadius: '8px',
                  background: caso.estado === 'Encontrado' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(0, 240, 255, 0.15)',
                  border: `1px solid ${caso.estado === 'Encontrado' ? '#10b981' : '#00f0ff'}`,
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '1.2rem', marginBottom: '0.2rem' }}>📡</div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 800, color: caso.estado === 'Encontrado' ? '#10b981' : '#00f0ff' }}>
                    3. Red YuiCam
                  </div>
                  <div style={{ fontSize: '0.65rem', color: '#94a3b8' }}>CCTV Activo 1s</div>
                </div>

                <div style={{
                  padding: '0.75rem',
                  borderRadius: '8px',
                  background: caso.estado === 'En Proceso de Rescate' 
                    ? 'rgba(245, 158, 11, 0.25)' 
                    : caso.estado === 'Encontrado' 
                    ? 'rgba(16, 185, 129, 0.15)' 
                    : 'rgba(255, 255, 255, 0.05)',
                  border: `1px solid ${caso.estado === 'En Proceso de Rescate' ? '#f59e0b' : caso.estado === 'Encontrado' ? '#10b981' : 'rgba(255,255,255,0.1)'}`,
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '1.2rem', marginBottom: '0.2rem' }}>🤝</div>
                  <div style={{
                    fontSize: '0.75rem',
                    fontWeight: 800,
                    color: caso.estado === 'En Proceso de Rescate' ? '#fbbf24' : caso.estado === 'Encontrado' ? '#10b981' : '#94a3b8'
                  }}>
                    4. Búsqueda
                  </div>
                  <div style={{ fontSize: '0.65rem', color: '#94a3b8' }}>
                    {caso.estado === 'En Proceso de Rescate' ? 'Rescate en curso' : caso.estado === 'Encontrado' ? 'Culminado' : 'Pendiente apoyo'}
                  </div>
                </div>

                <div style={{
                  padding: '0.75rem',
                  borderRadius: '8px',
                  background: caso.estado === 'Encontrado' ? 'rgba(16, 185, 129, 0.25)' : 'rgba(255, 255, 255, 0.05)',
                  border: `1px solid ${caso.estado === 'Encontrado' ? '#10b981' : 'rgba(255,255,255,0.1)'}`,
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '1.2rem', marginBottom: '0.2rem' }}>✅</div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 800, color: caso.estado === 'Encontrado' ? '#10b981' : '#64748b' }}>
                    5. Localizado
                  </div>
                  <div style={{ fontSize: '0.65rem', color: '#94a3b8' }}>
                    {caso.estado === 'Encontrado' ? 'Caso Resuelto' : 'En Búsqueda'}
                  </div>
                </div>
              </div>
            </div>

            <div className="detail-section meta-grid">
              <div>
                <div className="detail-label">Edad Aprox.</div>
                <div className="detail-value">{caso.edad} años</div>
              </div>
              <div>
                <div className="detail-label">Género</div>
                <div className="detail-value">{caso.genero}</div>
              </div>
              <div>
                <div className="detail-label">Fecha de Desaparición</div>
                <div className="detail-value">{formatDate(caso.fecha_desaparicion)}</div>
              </div>
              <div>
                <div className="detail-label">Teléfono de Emergencia</div>
                <div className="detail-value" style={{ color: 'var(--primary)', fontWeight: '700' }}>
                  {caso.telefono_contacto}
                </div>
              </div>
            </div>

            <div className="detail-section">
              <div className="detail-label">Último lugar conocido</div>
              <div className="detail-value" style={{ fontSize: '1.05rem', color: '#38bdf8' }}>
                📍 {caso.ubicacion_desaparicion}
              </div>
            </div>

            <div className="detail-section">
              <div className="detail-label">Descripción del caso y señas particulares</div>
              <p style={{ color: 'var(--text-secondary)', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
                {caso.descripcion}
              </p>
            </div>

            <div className="detail-section">
              <div className="detail-label" style={{ marginBottom: '0.75rem' }}>Usuario Reportante</div>
              <div className="reporter-card">
                <img 
                  src={getImageUrl(caso.creador_selfie_url)} 
                  alt={caso.creador_nombre} 
                  className="reporter-avatar"
                  onError={(e) => {
                    e.target.src = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&q=85';
                  }}
                />
                <div>
                  <div style={{ fontWeight: '600' }}>{caso.creador_nombre}</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    Contacto: {caso.creador_telefono} | {caso.creador_email}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

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

      <AgeProgressionModal
        isOpen={ageProgressionOpen}
        caso={caso}
        onClose={() => setAgeProgressionOpen(false)}
      />
    </div>
  );
};

export default CaseDetail;
