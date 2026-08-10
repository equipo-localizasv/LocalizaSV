import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import { AuthContext } from '../App';

const CaseDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);

  const [caso, setCaso] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updating, setUpdating] = useState(false);

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
              <span className={`status-badge ${caso.estado.toLowerCase()}`} style={{ top: '1.5rem', right: '1.5rem', fontSize: '0.85rem', padding: '0.5rem 1rem' }}>
                {caso.estado}
              </span>
            </div>

            {isOwner && (
              <div className="glass-panel" style={{ marginTop: '1.5rem', padding: '1.25rem', textAlign: 'center', background: 'rgba(255, 255, 255, 0.01)' }}>
                <h4 style={{ marginBottom: '0.75rem', fontSize: '1rem' }}>Gestión de Propietario</h4>
                {caso.estado === 'Desaparecido' ? (
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
              <h1 className="detail-title">{caso.nombre_desaparecido}</h1>
              <p style={{ color: 'var(--text-secondary)' }}>
                Caso registrado el {formatDate(caso.created_at)}
              </p>
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
              <div className="detail-value" style={{ fontSize: '1.05rem', color: 'var(--text-primary)' }}>
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
    </div>
  );
};

export default CaseDetail;
