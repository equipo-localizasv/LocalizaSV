import React, { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Search, Upload, Shield, CheckCircle, AlertTriangle, User, Calendar, MapPin, X, ArrowRight, Sparkles } from 'lucide-react';
import api, { getServerBaseUrl, getImageUrl } from '../services/api';

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
      setError('Seleccione una imagen con rostro visible para escanear.');
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


  return (
    <div className="modal-overlay animate-fade-in" style={{ zIndex: 12000, overflowY: 'auto', padding: '1.5rem 1rem' }}>
      <div 
        className="glass-panel"
        style={{
          maxWidth: '820px',
          width: '100%',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          background: 'rgba(10, 16, 32, 0.98)',
          border: '1px solid rgba(2, 132, 199, 0.35)',
          boxShadow: '0 25px 65px rgba(0, 0, 0, 0.9), 0 0 25px rgba(2, 132, 199, 0.15)',
          borderRadius: '16px',
          overflow: 'hidden',
          margin: 'auto'
        }}
      >
        {/* Header GovTech */}
        <div style={{
          padding: '1.25rem 1.75rem',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'linear-gradient(90deg, rgba(15, 23, 42, 0.98) 0%, rgba(2, 132, 199, 0.18) 100%)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #0284c7, #0369a1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              boxShadow: '0 0 15px rgba(2, 132, 199, 0.4)'
            }}>
              <Search size={22} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#f8fafc', fontWeight: 800 }}>
                  Búsqueda Biométrica Facial Inversa
                </h3>
                <span style={{
                  background: 'rgba(2, 132, 199, 0.2)',
                  border: '1px solid #0284c7',
                  color: '#38bdf8',
                  padding: '0.15rem 0.55rem',
                  borderRadius: '9999px',
                  fontSize: '0.7rem',
                  fontWeight: 700
                }}>
                  MOTOR 1:N
                </span>
              </div>
              <p style={{ margin: '0.15rem 0 0 0', fontSize: '0.8rem', color: '#94a3b8' }}>
                Coteja cualquier captura o fotografía ciudadana contra la base nacional de personas desaparecidas
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '8px',
              color: '#94a3b8',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div style={{ padding: '1.75rem', overflowY: 'auto', flex: 1 }}>
          <div style={{ display: 'grid', gridTemplateColumns: preview ? '280px 1fr' : '1fr', gap: '1.5rem', alignItems: 'start' }}>
            
            {/* Input & Preview Zone */}
            <div style={{
              background: 'rgba(15, 23, 42, 0.7)',
              border: '2px dashed rgba(2, 132, 199, 0.35)',
              borderRadius: '12px',
              padding: '1.25rem',
              textAlign: 'center',
              position: 'relative'
            }}>
              {preview ? (
                <div style={{ position: 'relative', borderRadius: '8px', overflow: 'hidden' }}>
                  <img
                    src={preview}
                    alt="Fotografía objetivo"
                    style={{ width: '100%', maxHeight: '250px', objectFit: 'cover', borderRadius: '8px' }}
                  />
                  {searching && (
                    <div style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      background: 'rgba(6, 13, 29, 0.85)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.65rem'
                    }}>
                      <div style={{
                        border: '3px solid rgba(255, 255, 255, 0.15)',
                        borderTop: '3px solid #38bdf8',
                        borderRadius: '50%',
                        width: '42px',
                        height: '42px',
                        animation: 'spin 0.8s linear infinite'
                      }} />
                      <span style={{ fontSize: '0.75rem', color: '#38bdf8', fontWeight: 700, letterSpacing: '0.04em' }}>
                        EXTRAYENDO VECTORES FACIALES...
                      </span>
                    </div>
                  )}
                  <button
                    onClick={() => { setFile(null); setPreview(null); setResults(null); }}
                    style={{
                      position: 'absolute',
                      top: '8px',
                      right: '8px',
                      background: 'rgba(0,0,0,0.75)',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '50%',
                      width: '26px',
                      height: '26px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  style={{ cursor: 'pointer', padding: '2rem 1rem' }}
                >
                  <div style={{
                    width: '56px',
                    height: '56px',
                    borderRadius: '12px',
                    background: 'rgba(2, 132, 199, 0.12)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 1rem auto',
                    color: '#38bdf8'
                  }}>
                    <Upload size={28} />
                  </div>
                  <div style={{ fontWeight: 700, color: '#f8fafc', fontSize: '0.95rem' }}>
                    Haz clic o arrastra una fotografía
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '0.35rem' }}>
                    Formatos JPG, PNG, WebP • Detección automática multirrostro
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

              <div style={{ marginTop: '1.25rem', display: 'flex', gap: '0.6rem', justifyContent: 'center' }}>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="btn btn-secondary"
                  style={{ fontSize: '0.82rem', padding: '0.45rem 0.85rem' }}
                >
                  Seleccionar Otra
                </button>
                <button
                  type="button"
                  onClick={handleSearch}
                  disabled={searching || !file}
                  className="btn btn-primary"
                  style={{
                    fontSize: '0.82rem',
                    padding: '0.45rem 1rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    background: 'linear-gradient(135deg, #0284c7, #0369a1)',
                    cursor: searching || !file ? 'not-allowed' : 'pointer'
                  }}
                >
                  <Sparkles size={14} />
                  <span>{searching ? 'Analizando...' : 'Escanear Biometría'}</span>
                </button>
              </div>
            </div>

            {/* Results Section */}
            <div>
              {error && (
                <div style={{
                  background: 'rgba(239, 68, 68, 0.12)',
                  border: '1px solid #ef4444',
                  color: '#fca5a5',
                  padding: '0.85rem 1rem',
                  borderRadius: '8px',
                  fontSize: '0.85rem',
                  marginBottom: '1rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  <AlertTriangle size={18} />
                  <span>{error}</span>
                </div>
              )}

              {searching && !results && (
                <div style={{ textAlign: 'center', padding: '3.5rem 1rem' }}>
                  <div style={{
                    width: '45px',
                    height: '45px',
                    border: '3px solid rgba(255, 255, 255, 0.1)',
                    borderTop: '3px solid #0284c7',
                    borderRadius: '50%',
                    animation: 'spin 0.8s linear infinite',
                    margin: '0 auto 1.25rem auto'
                  }} />
                  <div style={{ color: '#f8fafc', fontWeight: 700, fontSize: '1rem' }}>
                    Consultando Red Neuronal SFace...
                  </div>
                  <div style={{ color: '#94a3b8', fontSize: '0.82rem', marginTop: '0.35rem' }}>
                    Calculando similitud coseno euclidiana contra casos en base de datos nacional
                  </div>
                </div>
              )}

              {!searching && !results && !error && (
                <div style={{
                  padding: '2.5rem 1.5rem',
                  textAlign: 'center',
                  background: 'rgba(15, 23, 42, 0.5)',
                  borderRadius: '12px',
                  border: '1px solid rgba(255, 255, 255, 0.06)'
                }}>
                  <div style={{ fontSize: '2.2rem', marginBottom: '0.75rem' }}>🛡️</div>
                  <div style={{ color: '#f8fafc', fontWeight: 700, fontSize: '1rem' }}>
                    Esperando Fotografía de Comparación
                  </div>
                  <p style={{ color: '#94a3b8', fontSize: '0.82rem', maxWidth: '400px', margin: '0.5rem auto 0 auto', lineHeight: 1.5 }}>
                    Sube una captura de cámara de seguridad, fotografía de testigo o recorte facial para identificar de forma instantánea a la persona.
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
                    paddingBottom: '0.65rem',
                    flexWrap: 'wrap',
                    gap: '0.5rem'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
                        Casos evaluados: <strong style={{ color: '#f8fafc' }}>{results.total_compared}</strong>
                      </span>
                      {results.multi_face_query && (
                        <span style={{ fontSize: '0.72rem', color: '#38bdf8', background: 'rgba(2, 132, 199, 0.15)', border: '1px solid rgba(2, 132, 199, 0.3)', padding: '0.15rem 0.5rem', borderRadius: '4px' }}>
                          👥 {results.total_faces_in_query} rostros detectados
                        </span>
                      )}
                    </div>
                    <span style={{
                      background: 'rgba(16, 185, 129, 0.15)',
                      border: '1px solid #10b981',
                      color: '#34d399',
                      padding: '0.15rem 0.55rem',
                      borderRadius: '9999px',
                      fontSize: '0.72rem',
                      fontWeight: 700
                    }}>
                      COINCIDENCIAS RANKING
                    </span>
                  </div>

                  {results.top_matches && results.top_matches.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                      {results.top_matches.map((match, idx) => {
                        const pct = Math.round(match.similarity * 100);
                        const isHigh = pct >= 80;
                        const isMid = pct >= 65 && pct < 80;
                        const barColor = isHigh ? '#10b981' : isMid ? '#f59e0b' : '#ef4444';

                        return (
                          <div
                            key={match.caso_id || idx}
                            style={{
                              background: 'rgba(15, 23, 42, 0.8)',
                              border: `1px solid ${isHigh ? 'rgba(16, 185, 129, 0.4)' : 'rgba(255, 255, 255, 0.08)'}`,
                              borderRadius: '10px',
                              padding: '0.9rem',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: '1rem',
                              transition: 'all 0.2s ease'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                              {/* Thumbnail */}
                              <div style={{
                                width: '56px',
                                height: '56px',
                                borderRadius: '8px',
                                overflow: 'hidden',
                                background: '#020617',
                                border: '1px solid rgba(255,255,255,0.1)',
                                flexShrink: 0
                              }}>
                                <img
                                  src={getImageUrl(match.foto_url)}
                                  alt={match.nombre_desaparecido}
                                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                  onError={(e) => {
                                    e.target.src = 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=150&q=80';
                                  }}
                                />
                              </div>

                              <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                  <h4 style={{ margin: 0, fontSize: '0.98rem', color: '#f8fafc', fontWeight: 700 }}>
                                    {match.nombre_desaparecido}
                                  </h4>
                                  <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                                    (Caso #{match.caso_id})
                                  </span>
                                </div>
                                <div style={{ fontSize: '0.76rem', color: '#94a3b8', display: 'flex', gap: '0.75rem', marginTop: '3px' }}>
                                  <span>📍 {match.ubicacion_desaparicion || 'El Salvador'}</span>
                                  {match.edad && <span>🎂 {match.edad} años</span>}
                                </div>

                                {/* Barra de Coincidencia */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '6px' }}>
                                  <div style={{
                                    width: '120px',
                                    height: '6px',
                                    background: 'rgba(255,255,255,0.1)',
                                    borderRadius: '9999px',
                                    overflow: 'hidden'
                                  }}>
                                    <div style={{
                                      width: `${pct}%`,
                                      height: '100%',
                                      background: barColor,
                                      borderRadius: '9999px'
                                    }} />
                                  </div>
                                  <span style={{ fontSize: '0.76rem', fontWeight: 800, color: barColor }}>
                                    {pct}% de similitud
                                  </span>
                                </div>
                              </div>
                            </div>

                            <Link
                              to={`/caso/${match.caso_id}`}
                              onClick={onClose}
                              className="btn btn-primary"
                              style={{
                                fontSize: '0.78rem',
                                padding: '0.45rem 0.85rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.35rem',
                                textDecoration: 'none',
                                whiteSpace: 'nowrap'
                              }}
                            >
                              <span>Ver Caso</span>
                              <ArrowRight size={13} />
                            </Link>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div style={{
                      textAlign: 'center',
                      padding: '2rem 1rem',
                      background: 'rgba(15, 23, 42, 0.4)',
                      borderRadius: '10px'
                    }}>
                      <div style={{ fontSize: '1.8rem', marginBottom: '0.5rem' }}>🔍</div>
                      <div style={{ color: '#f8fafc', fontWeight: 600, fontSize: '0.9rem' }}>
                        Sin coincidencias concluyentes
                      </div>
                      <p style={{ color: '#94a3b8', fontSize: '0.78rem', margin: '0.25rem 0 0 0' }}>
                        No se encontraron personas en la base de datos con un umbral superior al 60% de similitud.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: '0.9rem 1.75rem',
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'rgba(15, 23, 42, 0.95)',
          fontSize: '0.78rem',
          color: '#94a3b8'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Shield size={14} color="#38bdf8" />
            <span>Sistema Homologado de Cotejo Biométrico • Policía Nacional Civil</span>
          </div>
          <button
            onClick={onClose}
            className="btn btn-secondary"
            style={{ fontSize: '0.8rem', padding: '0.35rem 0.85rem' }}
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReversePhotoSearchModal;
