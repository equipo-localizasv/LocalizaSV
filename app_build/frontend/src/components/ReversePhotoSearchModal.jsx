import React, { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';

const ReversePhotoSearchModal = ({ isOpen, onClose }) => {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      setFile(selected);
      setPreview(URL.createObjectURL(selected));
      setResults(null);
      setError('');
    }
  };

  const handleSearch = async () => {
    if (!file) {
      setError('Seleccione una imagen para escanear.');
      return;
    }

    setSearching(true);
    setError('');
    setResults(null);

    try {
      const formData = new FormData();
      formData.append('foto', file);

      const response = await api.post('/biometria/search', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setResults(response.data);
    } catch (err) {
      console.error('Error en búsqueda biométrica:', err);
      setError(err.response?.data?.error || 'No se pudo completar el escaneo biométrico.');
    } finally {
      setSearching(false);
    }
  };

  const getImageUrl = (path) => {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    return `http://localhost:3001${path}`;
  };

  return (
    <div className="modal-overlay animate-fade-in" style={{ zIndex: 12000 }}>
      <div 
        className="hud-panel corner-hud"
        style={{
          maxWidth: '780px',
          width: '95%',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          background: 'rgba(6, 13, 29, 0.96)',
          border: '1px solid rgba(0, 240, 255, 0.4)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.9), 0 0 35px rgba(0, 240, 255, 0.25)',
          borderRadius: '16px',
          overflow: 'hidden'
        }}
      >
        {/* Header HUD */}
        <div style={{
          padding: '1.25rem 1.75rem',
          borderBottom: '1px solid rgba(0, 240, 255, 0.25)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'rgba(0, 240, 255, 0.05)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ fontSize: '1.6rem' }}>🧬</span>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#00f0ff', letterSpacing: '0.5px' }}>
                  Búsqueda Inversa Biométrica (IA InsightFace)
                </h3>
                <span className="cyber-badge-cyan">1:N ENGINE</span>
              </div>
              <p style={{ margin: '0.15rem 0 0 0', fontSize: '0.8rem', color: '#94a3b8' }}>
                Coteja cualquier fotografía contra la base nacional de personas desaparecidas en milisegundos
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="btn btn-secondary"
            style={{ padding: '0.35rem 0.75rem', borderRadius: '6px', fontSize: '0.85rem' }}
          >
            ✕ Cerrar
          </button>
        </div>

        {/* Content Body */}
        <div style={{ padding: '1.5rem', overflowY: 'auto', flex: 1 }}>
          <div style={{ display: 'grid', gridTemplateColumns: preview ? '260px 1fr' : '1fr', gap: '1.5rem', alignItems: 'start' }}>
            
            {/* Input & Preview Zone */}
            <div style={{
              background: 'rgba(15, 23, 42, 0.6)',
              border: '2px dashed rgba(0, 240, 255, 0.35)',
              borderRadius: '12px',
              padding: '1.25rem',
              textAlign: 'center',
              position: 'relative'
            }}>
              {preview ? (
                <div style={{ position: 'relative', borderRadius: '8px', overflow: 'hidden' }}>
                  <img
                    src={preview}
                    alt="Target query"
                    style={{ width: '100%', maxHeight: '240px', objectFit: 'cover', borderRadius: '8px' }}
                  />
                  {searching && (
                    <div style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      background: 'rgba(6, 13, 29, 0.75)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem'
                    }}>
                      <div className="radar-sweep" style={{ width: '80px', height: '80px' }} />
                      <span style={{ fontSize: '0.75rem', color: '#00f0ff', fontWeight: 600 }}>
                        EXTRAYENDO EMBEDDING 512D...
                      </span>
                    </div>
                  )}
                  <button
                    onClick={() => { setFile(null); setPreview(null); setResults(null); }}
                    style={{
                      position: 'absolute',
                      top: '6px',
                      right: '6px',
                      background: 'rgba(0,0,0,0.7)',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '50%',
                      width: '24px',
                      height: '24px',
                      cursor: 'pointer',
                      fontSize: '0.75rem'
                    }}
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  style={{ cursor: 'pointer', padding: '1.5rem 1rem' }}
                >
                  <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>📷</div>
                  <div style={{ fontWeight: 600, color: '#00f0ff', fontSize: '0.95rem' }}>
                    Arrastra o haz clic para subir foto
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.25rem' }}>
                    Formatos JPG, PNG • Detección automática de rostro
                  </div>
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                style={{ display: 'none' }}
              />

              <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="btn btn-secondary"
                  style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}
                >
                  📁 Seleccionar
                </button>
                <button
                  type="button"
                  onClick={handleSearch}
                  disabled={searching || !file}
                  className="btn"
                  style={{
                    fontSize: '0.8rem',
                    padding: '0.4rem 0.9rem',
                    background: 'linear-gradient(135deg, #00f0ff, #0284c7)',
                    color: '#030712',
                    fontWeight: 700,
                    border: 'none',
                    borderRadius: '6px',
                    cursor: searching || !file ? 'not-allowed' : 'pointer'
                  }}
                >
                  {searching ? 'Analizando...' : '⚡ Comparar Biometría'}
                </button>
              </div>
            </div>

            {/* Results Section */}
            <div>
              {error && (
                <div style={{
                  background: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid #ef4444',
                  color: '#fca5a5',
                  padding: '0.75rem 1rem',
                  borderRadius: '8px',
                  fontSize: '0.85rem',
                  marginBottom: '1rem'
                }}>
                  ⚠️ {error}
                </div>
              )}

              {searching && !results && (
                <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
                  <div style={{
                    width: '50px',
                    height: '50px',
                    border: '3px solid rgba(0, 240, 255, 0.2)',
                    borderTop: '3px solid #00f0ff',
                    borderRadius: '50%',
                    animation: 'spin 0.8s linear infinite',
                    margin: '0 auto 1rem auto'
                  }} />
                  <div style={{ color: '#00f0ff', fontWeight: 600, fontSize: '0.95rem' }}>
                    Consultando Red Neuronal SFace...
                  </div>
                  <div style={{ color: '#64748b', fontSize: '0.8rem', marginTop: '0.25rem' }}>
                    Calculando similitud coseno euclidiana contra casos en base de datos
                  </div>
                </div>
              )}

              {!searching && !results && !error && (
                <div style={{
                  padding: '2.5rem 1.5rem',
                  textAlign: 'center',
                  background: 'rgba(15, 23, 42, 0.4)',
                  borderRadius: '12px',
                  border: '1px solid rgba(255, 255, 255, 0.05)'
                }}>
                  <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🛡️</div>
                  <div style={{ color: '#f1f5f9', fontWeight: 600, fontSize: '0.95rem' }}>
                    Esperando Fotografía Objetivo
                  </div>
                  <p style={{ color: '#94a3b8', fontSize: '0.8rem', maxWidth: '380px', margin: '0.5rem auto 0 auto' }}>
                    Sube una captura de cámara de seguridad, fotografía ciudadana o recorte facial para identificar de forma instantánea a la persona.
                  </p>
                </div>
              )}

              {results && (
                <div>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '1rem',
                    borderBottom: '1px solid rgba(255,255,255,0.08)',
                    paddingBottom: '0.5rem',
                    flexWrap: 'wrap',
                    gap: '0.5rem'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
                        Casos comparados: <strong style={{ color: '#fff' }}>{results.total_compared}</strong>
                      </span>
                      {results.multi_face_query && (
                        <span style={{ fontSize: '0.72rem', color: '#00f0ff', background: 'rgba(0, 240, 255, 0.1)', border: '1px solid rgba(0, 240, 255, 0.3)', padding: '0.15rem 0.5rem', borderRadius: '4px' }}>
                          👥 {results.total_faces_in_query} rostros evaluados
                        </span>
                      )}
                    </div>
                    <span className="cyber-badge-cyan">
                      TOP COINCIDENCIAS
                    </span>
                  </div>

                  {results.top_matches && results.top_matches.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      {results.top_matches.map((match, idx) => {
                        const isHigh = match.similarity_percentage >= 70;
                        const isModerate = match.similarity_percentage >= 50 && match.similarity_percentage < 70;
                        const badgeColor = isHigh ? '#10b981' : isModerate ? '#f59e0b' : '#64748b';
                        const badgeBg = isHigh ? 'rgba(16, 185, 129, 0.15)' : isModerate ? 'rgba(245, 158, 11, 0.15)' : 'rgba(100, 116, 139, 0.15)';

                        return (
                          <div
                            key={match.caso_id}
                            style={{
                              background: 'rgba(15, 23, 42, 0.7)',
                              border: `1px solid ${isHigh ? 'rgba(16, 185, 129, 0.5)' : 'rgba(255, 255, 255, 0.1)'}`,
                              borderRadius: '10px',
                              padding: '0.85rem',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '1rem'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                              <img
                                src={getImageUrl(match.foto_url)}
                                alt={match.nombre_desaparecido}
                                style={{
                                  width: '54px',
                                  height: '54px',
                                  borderRadius: '8px',
                                  objectFit: 'cover',
                                  border: `2px solid ${badgeColor}`
                                }}
                              />
                              <div>
                                <div style={{ fontWeight: 700, color: '#f8fafc', fontSize: '0.95rem' }}>
                                  #{match.caso_id} • {match.nombre_desaparecido}
                                </div>
                                <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.15rem' }}>
                                  📍 {match.departamento || 'El Salvador'} • {match.edad} años • Estado: {match.estado}
                                  {results.multi_face_query && match.matched_query_face_index !== undefined && (
                                    <span style={{ marginLeft: '0.5rem', color: '#38bdf8' }}>
                                      (Match en Rostro #{match.matched_query_face_index + 1})
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                              <div style={{ textAlign: 'right' }}>
                                <div style={{
                                  fontSize: '1.25rem',
                                  fontWeight: 800,
                                  color: badgeColor,
                                  fontFamily: 'monospace'
                                }}>
                                  {match.similarity_percentage}%
                                </div>
                                <div style={{
                                  fontSize: '0.65rem',
                                  padding: '0.15rem 0.4rem',
                                  borderRadius: '4px',
                                  background: badgeBg,
                                  color: badgeColor,
                                  fontWeight: 700,
                                  textTransform: 'uppercase'
                                }}>
                                  {match.confidence_label || (isHigh ? 'Match Biométrico' : 'Baja Coincidencia')}
                                </div>
                              </div>

                              <Link
                                to={`/caso/${match.caso_id}`}
                                onClick={onClose}
                                className="btn btn-primary"
                                style={{
                                  padding: '0.4rem 0.75rem',
                                  fontSize: '0.8rem',
                                  borderRadius: '6px'
                                }}
                              >
                                Ver Caso
                              </Link>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8', fontSize: '0.85rem' }}>
                      No se encontraron coincidencias biométricas en la base de datos actual.
                    </div>
                  )}
                </div>
              )}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default ReversePhotoSearchModal;
