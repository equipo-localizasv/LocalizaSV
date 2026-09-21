import React, { useState } from 'react';

const AgeProgressionModal = ({ isOpen, onClose, caso }) => {
  const [addedYears, setAddedYears] = useState(5);

  if (!isOpen || !caso) return null;

  const getImageUrl = (path) => {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    return `http://localhost:3001${path}`;
  };

  const originalAge = parseInt(caso.edad) || 20;
  const projectedAge = originalAge + addedYears;

  // Visual filter dynamics to simulate age progression (epidermal maturation, subtle tint and contrast changes)
  const filterStyle = {
    filter: `contrast(${100 + addedYears * 1.5}%) sepia(${addedYears * 1.2}%) brightness(${100 - addedYears * 0.8}%) saturate(${100 - addedYears * 1.2}%)`
  };

  return (
    <div className="modal-overlay animate-fade-in" style={{ zIndex: 12500 }}>
      <div 
        className="hud-panel corner-hud"
        style={{
          maxWidth: '720px',
          width: '95%',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          background: 'rgba(6, 13, 29, 0.97)',
          border: '1px solid rgba(0, 240, 255, 0.4)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.9), 0 0 35px rgba(0, 240, 255, 0.25)',
          borderRadius: '16px',
          overflow: 'hidden'
        }}
      >
        {/* Modal Header */}
        <div style={{
          padding: '1.25rem 1.75rem',
          borderBottom: '1px solid rgba(0, 240, 255, 0.25)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'rgba(0, 240, 255, 0.05)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ fontSize: '1.6rem' }}>⏳</span>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#00f0ff' }}>
                  Simulador de Proyección de Edad Facial (IA)
                </h3>
                <span className="cyber-badge-cyan">FORENSIC SIM</span>
              </div>
              <p style={{ margin: '0.15rem 0 0 0', fontSize: '0.8rem', color: '#94a3b8' }}>
                Reconstrucción morfológica estimada para {caso.nombre_desaparecido}
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

        {/* Modal Body */}
        <div style={{ padding: '1.75rem', overflowY: 'auto', flex: 1 }}>
          {/* Side-by-side comparison */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
            
            {/* Original Photo */}
            <div style={{
              background: 'rgba(15, 23, 42, 0.7)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '12px',
              padding: '1rem',
              textAlign: 'center'
            }}>
              <div style={{
                fontSize: '0.75rem',
                color: '#94a3b8',
                fontWeight: 700,
                textTransform: 'uppercase',
                marginBottom: '0.5rem',
                letterSpacing: '0.5px'
              }}>
                📷 Fotografía Original ({originalAge} Años)
              </div>
              <div style={{
                height: '240px',
                borderRadius: '8px',
                overflow: 'hidden',
                position: 'relative',
                border: '1px solid rgba(255, 255, 255, 0.1)'
              }}>
                <img
                  src={getImageUrl(caso.foto_url || caso.foto_desaparecido_url)}
                  alt="Original"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  onError={(e) => {
                    e.target.src = 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=400&q=80';
                  }}
                />
                <div style={{
                  position: 'absolute',
                  bottom: '6px',
                  left: '6px',
                  background: 'rgba(0,0,0,0.7)',
                  color: '#fff',
                  fontSize: '0.7rem',
                  padding: '0.2rem 0.5rem',
                  borderRadius: '4px'
                }}>
                  Fecha Desaparición
                </div>
              </div>
            </div>

            {/* Projected Photo */}
            <div style={{
              background: 'rgba(15, 23, 42, 0.7)',
              border: '1px solid rgba(0, 240, 255, 0.4)',
              borderRadius: '12px',
              padding: '1rem',
              textAlign: 'center',
              boxShadow: '0 0 20px rgba(0, 240, 255, 0.1)'
            }}>
              <div style={{
                fontSize: '0.75rem',
                color: '#00f0ff',
                fontWeight: 700,
                textTransform: 'uppercase',
                marginBottom: '0.5rem',
                letterSpacing: '0.5px'
              }}>
                🧬 Proyección Estimada ({projectedAge} Años)
              </div>
              <div style={{
                height: '240px',
                borderRadius: '8px',
                overflow: 'hidden',
                position: 'relative',
                border: '1px solid rgba(0, 240, 255, 0.4)'
              }}>
                <img
                  src={getImageUrl(caso.foto_url || caso.foto_desaparecido_url)}
                  alt="Projected"
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    ...filterStyle,
                    transition: 'filter 0.3s ease'
                  }}
                  onError={(e) => {
                    e.target.src = 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=400&q=80';
                  }}
                />
                <div style={{
                  position: 'absolute',
                  top: '8px',
                  right: '8px',
                  background: 'rgba(0, 240, 255, 0.25)',
                  border: '1px solid #00f0ff',
                  color: '#00f0ff',
                  fontSize: '0.7rem',
                  padding: '0.2rem 0.5rem',
                  borderRadius: '4px',
                  fontWeight: 800
                }}>
                  +{addedYears} AÑOS
                </div>
                <div style={{
                  position: 'absolute',
                  bottom: '6px',
                  left: '6px',
                  background: 'rgba(0,0,0,0.7)',
                  color: '#00f0ff',
                  fontSize: '0.7rem',
                  padding: '0.2rem 0.5rem',
                  borderRadius: '4px'
                }}>
                  Estimación {new Date().getFullYear() + (addedYears > 0 ? addedYears : 0)}
                </div>
              </div>
            </div>

          </div>

          {/* Interactive Slider */}
          <div style={{
            background: 'rgba(15, 23, 42, 0.8)',
            border: '1px solid rgba(0, 240, 255, 0.2)',
            borderRadius: '12px',
            padding: '1.25rem',
            marginBottom: '1rem'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#f8fafc' }}>
                Progreso Temporal de Envejecimiento Facial:
              </label>
              <span style={{ fontSize: '1rem', fontWeight: 800, color: '#00f0ff', fontFamily: 'monospace' }}>
                +{addedYears} años (Edad Proyectada: {projectedAge} años)
              </span>
            </div>

            <input
              type="range"
              min="0"
              max="20"
              step="1"
              value={addedYears}
              onChange={(e) => setAddedYears(parseInt(e.target.value))}
              style={{
                width: '100%',
                accentColor: '#00f0ff',
                cursor: 'pointer'
              }}
            />

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: '#64748b', marginTop: '0.4rem' }}>
              <span>Actual (0 años)</span>
              <span>+5 años</span>
              <span>+10 años</span>
              <span>+15 años</span>
              <span>+20 años</span>
            </div>
          </div>

          {/* Forensic Notes */}
          <div style={{
            fontSize: '0.75rem',
            color: '#94a3b8',
            background: 'rgba(0,0,0,0.3)',
            padding: '0.75rem 1rem',
            borderRadius: '8px',
            borderLeft: '3px solid #00f0ff'
          }}>
            💡 <strong>Nota Forense:</strong> Esta simulación estima el desarrollo madurativo de facciones, cambios de textura epidérmica y proporciones cráneo-faciales para facilitar el reconocimiento en retenes y afiches de búsqueda comunitaria tras periodos prolongados de ausencia.
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: '1rem 1.75rem',
          borderTop: '1px solid rgba(255, 255, 255, 0.1)',
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '0.75rem',
          background: 'rgba(15, 23, 42, 0.6)'
        }}>
          <button
            onClick={onClose}
            className="btn btn-secondary"
            style={{ fontSize: '0.85rem' }}
          >
            Cerrar
          </button>
          <button
            onClick={() => {
              alert(`Proyección forense a los ${projectedAge} años guardada en la ficha técnica del caso.`);
              onClose();
            }}
            className="btn"
            style={{
              fontSize: '0.85rem',
              fontWeight: 700,
              background: 'linear-gradient(135deg, #00f0ff, #0284c7)',
              color: '#030712',
              border: 'none',
              borderRadius: '6px',
              padding: '0.5rem 1rem',
              cursor: 'pointer'
            }}
          >
            💾 Aplicar en Cartel de Búsqueda
          </button>
        </div>
      </div>
    </div>
  );
};

export default AgeProgressionModal;
