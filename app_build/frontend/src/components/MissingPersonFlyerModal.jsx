import React, { useRef, useState } from 'react';

const MissingPersonFlyerModal = ({ isOpen, onClose, caso }) => {
  const printAreaRef = useRef(null);
  const [formatMode, setFormatMode] = useState('a4'); // 'a4' | 'story' | 'square'

  if (!isOpen || !caso) return null;

  const getImageUrl = (path) => {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    return `http://localhost:3001${path}`;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'No especificada';
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat('es-SV', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC'
    }).format(date);
  };

  const handlePrint = () => {
    window.print();
  };

  const caseUrl = `${window.location.origin}/caso/${caso.id}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(caseUrl)}`;

  const handleShareWhatsApp = () => {
    const text = `🚨 *ALERTA DE BÚSQUEDA - LOCALIZASV* 🚨\nAyúdanos a encontrar a *${caso.nombre_desaparecido}* (${caso.edad} años).\n📍 Visto por última vez en: ${caso.ubicacion_desaparicion}\n📅 Fecha: ${formatDate(caso.fecha_desaparicion)}\n📞 Contacto urgente: ${caso.telefono_contacto} o PNC 911.\n\nVer caso completo en: ${caseUrl}`;
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(caseUrl).then(() => {
      alert('¡Enlace directo del caso copiado al portapapeles!');
    });
  };

  return (
    <div className="modal-overlay animate-fade-in" style={{ zIndex: 12000 }}>
      <div 
        className="hud-panel corner-hud" 
        style={{
          width: '100%',
          maxWidth: formatMode === 'story' ? '500px' : formatMode === 'square' ? '640px' : '820px',
          maxHeight: '94vh',
          display: 'flex',
          flexDirection: 'column',
          background: 'rgba(6, 13, 29, 0.98)',
          border: '1px solid rgba(239, 68, 68, 0.45)',
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.95), 0 0 35px rgba(239, 68, 68, 0.25)',
          borderRadius: '16px',
          overflow: 'hidden',
          transition: 'max-width 0.3s ease'
        }}
      >
        {/* Header Modal Bar */}
        <div style={{
          padding: '1rem 1.5rem',
          borderBottom: '1px solid rgba(239, 68, 68, 0.2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'rgba(239, 68, 68, 0.08)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ fontSize: '1.6rem' }}>📲</span>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#fff' }}>
                  Generador Multiformato de Carteles Forenses
                </h3>
                <span className="cyber-badge-cyan">DINÁMICO CON QR</span>
              </div>
              <p style={{ margin: 0, fontSize: '0.8rem', color: '#94a3b8' }}>
                Exporta afiches optimizados para redes sociales (Historias 9:16, Feed 1:1 e Impresión A4)
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="btn btn-secondary"
            style={{ padding: '0.35rem 0.75rem', borderRadius: '8px', cursor: 'pointer' }}
          >
            ✕ Cerrar
          </button>
        </div>

        {/* Format Selector Tabs */}
        <div style={{
          padding: '0.65rem 1.5rem',
          background: 'rgba(15, 23, 42, 0.7)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '0.5rem'
        }}>
          <div style={{ display: 'flex', gap: '0.4rem', background: 'rgba(0,0,0,0.3)', padding: '0.2rem', borderRadius: '8px' }}>
            <button
              onClick={() => setFormatMode('a4')}
              style={{
                background: formatMode === 'a4' ? '#dc2626' : 'transparent',
                color: '#fff',
                border: 'none',
                padding: '0.4rem 0.75rem',
                borderRadius: '6px',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              📄 Imprimible A4
            </button>
            <button
              onClick={() => setFormatMode('story')}
              style={{
                background: formatMode === 'story' ? '#dc2626' : 'transparent',
                color: '#fff',
                border: 'none',
                padding: '0.4rem 0.75rem',
                borderRadius: '6px',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              📱 Historia 9:16 (Stories)
            </button>
            <button
              onClick={() => setFormatMode('square')}
              style={{
                background: formatMode === 'square' ? '#dc2626' : 'transparent',
                color: '#fff',
                border: 'none',
                padding: '0.4rem 0.75rem',
                borderRadius: '6px',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              🟦 Cuadrado 1:1 (Feed)
            </button>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={handleShareWhatsApp}
              className="btn"
              style={{
                background: '#25D366',
                color: '#fff',
                fontSize: '0.8rem',
                padding: '0.4rem 0.8rem',
                fontWeight: '600',
                border: 'none',
                cursor: 'pointer',
                borderRadius: '6px'
              }}
            >
              💬 WhatsApp
            </button>
            <button
              onClick={handleCopyLink}
              className="btn btn-secondary"
              style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem', cursor: 'pointer', borderRadius: '6px' }}
            >
              🔗 Enlace
            </button>
            <button
              onClick={handlePrint}
              className="btn btn-danger"
              style={{ fontSize: '0.8rem', padding: '0.4rem 0.9rem', fontWeight: '700', cursor: 'pointer', borderRadius: '6px' }}
            >
              🖨️ Imprimir / Guardar PDF
            </button>
          </div>
        </div>

        {/* Printable & Social Canvas Container */}
        <div style={{ padding: '1.5rem', overflowY: 'auto', flex: 1, display: 'flex', justifyContent: 'center' }}>
          
          {/* FORMAT 1: A4 Standard Printable */}
          {formatMode === 'a4' && (
            <div 
              ref={printAreaRef}
              id="printable-flyer"
              className="flyer-sheet"
              style={{
                background: '#ffffff',
                color: '#0f172a',
                borderRadius: '12px',
                padding: '2rem',
                boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
                border: '4px solid #dc2626',
                fontFamily: "'Inter', sans-serif",
                width: '100%',
                maxWidth: '720px'
              }}
            >
              {/* Header */}
              <div style={{
                background: '#dc2626',
                color: '#ffffff',
                padding: '1rem',
                textAlign: 'center',
                borderRadius: '8px',
                marginBottom: '1.5rem'
              }}>
                <div style={{ fontSize: '0.85rem', letterSpacing: '2px', fontWeight: '800', textTransform: 'uppercase', opacity: 0.9 }}>
                  🇸🇻 REPÚBLICA DE EL SALVADOR • RED LOCALIZASV
                </div>
                <h1 style={{ 
                  fontSize: '2.5rem', 
                  fontWeight: '900', 
                  margin: '0.25rem 0',
                  letterSpacing: '1px',
                  lineHeight: 1
                }}>
                  ¡SE BUSCA!
                </h1>
                <div style={{ fontSize: '1rem', fontWeight: '700' }}>
                  ALERTA NACIONAL DE PERSONA DESAPARECIDA
                </div>
              </div>

              {/* Layout */}
              <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: '1.75rem', alignItems: 'start' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{
                    border: '3px solid #dc2626',
                    borderRadius: '10px',
                    overflow: 'hidden',
                    background: '#f1f5f9',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                  }}>
                    <img 
                      src={getImageUrl(caso.foto_url || caso.foto_desaparecido_url)} 
                      alt={caso.nombre_desaparecido}
                      style={{
                        width: '100%',
                        height: '260px',
                        objectFit: 'cover',
                        display: 'block'
                      }}
                      onError={(e) => {
                        e.target.src = 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=400&q=80';
                      }}
                    />
                  </div>
                  <div style={{
                    marginTop: '0.75rem',
                    padding: '0.5rem',
                    background: '#fef2f2',
                    border: '1px dashed #ef4444',
                    borderRadius: '6px',
                    fontSize: '0.75rem',
                    color: '#991b1b',
                    fontWeight: '700'
                  }}>
                    CASO REGISTRADO #{caso.id}
                  </div>
                </div>

                <div>
                  <div style={{ borderBottom: '2px solid #e2e8f0', paddingBottom: '0.75rem', marginBottom: '1rem' }}>
                    <div style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: '#64748b', fontWeight: '700' }}>
                      Nombre Completo
                    </div>
                    <h2 style={{ fontSize: '1.75rem', color: '#0f172a', fontWeight: '900', margin: '0.2rem 0' }}>
                      {caso.nombre_desaparecido}
                    </h2>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem 1rem', marginBottom: '1rem' }}>
                    <div>
                      <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Edad</span>
                      <p style={{ margin: 0, fontSize: '1.05rem', fontWeight: '700', color: '#1e293b' }}>{caso.edad} años</p>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Género</span>
                      <p style={{ margin: 0, fontSize: '1.05rem', fontWeight: '700', color: '#1e293b' }}>{caso.genero || 'No especificado'}</p>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Fecha Desaparición</span>
                      <p style={{ margin: 0, fontSize: '0.95rem', fontWeight: '700', color: '#1e293b' }}>{formatDate(caso.fecha_desaparicion)}</p>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Estado</span>
                      <p style={{ margin: 0, fontSize: '0.95rem', fontWeight: '800', color: '#dc2626' }}>
                        {caso.estado?.toUpperCase() || 'DESAPARECIDO'}
                      </p>
                    </div>
                  </div>

                  <div style={{ marginBottom: '1rem' }}>
                    <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Último Lugar Visto</span>
                    <div style={{ 
                      background: '#f8fafc', 
                      border: '1px solid #cbd5e1', 
                      borderRadius: '6px', 
                      padding: '0.5rem 0.75rem',
                      fontSize: '0.95rem',
                      fontWeight: '700',
                      color: '#0f172a',
                      marginTop: '0.25rem'
                    }}>
                      📍 {caso.ubicacion_desaparicion}
                    </div>
                  </div>

                  <div>
                    <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Descripción y Señas Particulares</span>
                    <p style={{ 
                      fontSize: '0.88rem', 
                      color: '#334155', 
                      lineHeight: '1.45', 
                      marginTop: '0.25rem',
                      whiteSpace: 'pre-wrap',
                      background: '#f1f5f9',
                      padding: '0.75rem',
                      borderRadius: '6px'
                    }}>
                      {caso.descripcion || 'Sin descripción adicional registrada.'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Emergency Hotline & Dynamic QR */}
              <div style={{
                marginTop: '1.5rem',
                background: '#0f172a',
                color: '#ffffff',
                borderRadius: '8px',
                padding: '1.25rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '1.5rem'
              }}>
                <div>
                  <div style={{ fontSize: '0.8rem', color: '#fca5a5', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1px' }}>
                    SI TIENE CUALQUIER INFORMACIÓN O AVISTAMIENTO:
                  </div>
                  <div style={{ fontSize: '1.35rem', fontWeight: '900', color: '#fef08a', marginTop: '0.2rem' }}>
                    📞 {caso.telefono_contacto}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.2rem' }}>
                    Líneas de emergencia: <strong>PNC 911</strong> • <strong>FGR 123</strong> • <strong>LocalizaSV</strong>
                  </div>
                </div>

                <div style={{ 
                  borderLeft: '2px solid rgba(255,255,255,0.2)', 
                  paddingLeft: '1.25rem',
                  textAlign: 'center',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center'
                }}>
                  <img
                    src={qrUrl}
                    alt="Código QR del Caso"
                    style={{ width: '80px', height: '80px', borderRadius: '4px', background: '#fff', padding: '3px' }}
                  />
                  <div style={{ fontSize: '0.65rem', color: '#38bdf8', marginTop: '0.25rem', fontWeight: 700 }}>
                    ESCANEAR CASO
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* FORMAT 2: Vertical Story 9:16 */}
          {formatMode === 'story' && (
            <div
              style={{
                width: '380px',
                height: '675px',
                background: 'linear-gradient(180deg, #991b1b 0%, #1e1b4b 50%, #030712 100%)',
                borderRadius: '24px',
                padding: '1.75rem',
                color: '#fff',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                boxShadow: '0 20px 50px rgba(0,0,0,0.8)',
                border: '3px solid #ef4444',
                position: 'relative',
                overflow: 'hidden'
              }}
            >
              {/* Top Banner */}
              <div style={{ textAlign: 'center' }}>
                <div style={{
                  background: '#ef4444',
                  color: '#fff',
                  padding: '0.4rem 1rem',
                  borderRadius: '20px',
                  fontWeight: 900,
                  fontSize: '1rem',
                  letterSpacing: '1px',
                  display: 'inline-block'
                }}>
                  🚨 ¡AYÚDANOS A ENCONTRARLE!
                </div>
                <div style={{ fontSize: '0.75rem', color: '#fca5a5', marginTop: '0.4rem', fontWeight: 600 }}>
                  ALERTA LOCALIZASV • REPÚBLICA DE EL SALVADOR
                </div>
              </div>

              {/* Photo */}
              <div style={{ textAlign: 'center', margin: '1rem 0' }}>
                <div style={{
                  width: '210px',
                  height: '240px',
                  margin: '0 auto',
                  borderRadius: '16px',
                  overflow: 'hidden',
                  border: '4px solid #fff',
                  boxShadow: '0 10px 25px rgba(0,0,0,0.6)'
                }}>
                  <img
                    src={getImageUrl(caso.foto_url || caso.foto_desaparecido_url)}
                    alt={caso.nombre_desaparecido}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    onError={(e) => {
                      e.target.src = 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=400&q=80';
                    }}
                  />
                </div>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 900, margin: '0.75rem 0 0 0', color: '#fff' }}>
                  {caso.nombre_desaparecido}
                </h2>
                <div style={{ fontSize: '0.95rem', color: '#fef08a', fontWeight: 700 }}>
                  {caso.edad} años • {caso.genero}
                </div>
              </div>

              {/* Details & Location */}
              <div style={{
                background: 'rgba(0,0,0,0.4)',
                border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: '12px',
                padding: '0.75rem 1rem',
                fontSize: '0.8rem'
              }}>
                <div style={{ color: '#94a3b8' }}>ÚLTIMA VEZ VISTO EN:</div>
                <div style={{ fontWeight: 800, color: '#38bdf8', fontSize: '0.9rem' }}>
                  📍 {caso.ubicacion_desaparicion}
                </div>
                <div style={{ color: '#cbd5e1', marginTop: '0.35rem', fontSize: '0.75rem' }}>
                  Fecha: <strong>{formatDate(caso.fecha_desaparicion)}</strong>
                </div>
              </div>

              {/* Bottom Hotline & QR */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: 'rgba(0,0,0,0.6)',
                borderRadius: '12px',
                padding: '0.75rem 1rem'
              }}>
                <div>
                  <div style={{ fontSize: '0.7rem', color: '#fca5a5', fontWeight: 700 }}>AVISOS URGENTES AL:</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#fef08a' }}>
                    📞 {caso.telefono_contacto}
                  </div>
                  <div style={{ fontSize: '0.65rem', color: '#94a3b8' }}>PNC 911 / FGR 123</div>
                </div>

                <div style={{ textAlign: 'center' }}>
                  <img
                    src={qrUrl}
                    alt="QR"
                    style={{ width: '60px', height: '60px', borderRadius: '6px', background: '#fff', padding: '2px' }}
                  />
                  <div style={{ fontSize: '0.6rem', color: '#38bdf8', marginTop: '0.15rem' }}>Escanear</div>
                </div>
              </div>
            </div>
          )}

          {/* FORMAT 3: Square 1:1 Feed */}
          {formatMode === 'square' && (
            <div
              style={{
                width: '540px',
                height: '540px',
                background: 'linear-gradient(135deg, #030712 0%, #1e1b4b 60%, #450a0a 100%)',
                borderRadius: '16px',
                padding: '1.5rem',
                color: '#fff',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                border: '3px solid #ef4444',
                boxShadow: '0 15px 40px rgba(0,0,0,0.85)'
              }}
            >
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{
                  background: '#ef4444',
                  color: '#fff',
                  fontWeight: 900,
                  fontSize: '0.85rem',
                  padding: '0.3rem 0.8rem',
                  borderRadius: '6px',
                  letterSpacing: '1px'
                }}>
                  🚨 SE BUSCA • ALERTA NACIONAL
                </span>
                <span style={{ fontSize: '0.75rem', color: '#fca5a5', fontWeight: 700 }}>
                  LOCALIZASV EL SALVADOR
                </span>
              </div>

              {/* Center Body */}
              <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr', gap: '1.25rem', alignItems: 'center' }}>
                <div style={{
                  width: '180px',
                  height: '210px',
                  borderRadius: '12px',
                  overflow: 'hidden',
                  border: '3px solid #fff',
                  boxShadow: '0 8px 20px rgba(0,0,0,0.5)'
                }}>
                  <img
                    src={getImageUrl(caso.foto_url || caso.foto_desaparecido_url)}
                    alt={caso.nombre_desaparecido}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    onError={(e) => {
                      e.target.src = 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=400&q=80';
                    }}
                  />
                </div>

                <div>
                  <h2 style={{ fontSize: '1.45rem', fontWeight: 900, color: '#fff', margin: 0 }}>
                    {caso.nombre_desaparecido}
                  </h2>
                  <div style={{ color: '#fef08a', fontWeight: 700, fontSize: '0.95rem', marginTop: '0.2rem' }}>
                    {caso.edad} años • {caso.genero}
                  </div>
                  <div style={{ color: '#38bdf8', fontSize: '0.85rem', marginTop: '0.5rem', fontWeight: 600 }}>
                    📍 Visto: {caso.ubicacion_desaparicion}
                  </div>
                  <div style={{ color: '#94a3b8', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                    Fecha: {formatDate(caso.fecha_desaparicion)}
                  </div>
                  <p style={{
                    fontSize: '0.75rem',
                    color: '#cbd5e1',
                    background: 'rgba(255,255,255,0.06)',
                    padding: '0.5rem',
                    borderRadius: '6px',
                    marginTop: '0.5rem',
                    maxHeight: '60px',
                    overflow: 'hidden'
                  }}>
                    {caso.descripcion || 'Favor reportar cualquier avistamiento de inmediato.'}
                  </p>
                </div>
              </div>

              {/* Bottom bar */}
              <div style={{
                background: 'rgba(0,0,0,0.6)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '10px',
                padding: '0.75rem 1rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div>
                  <div style={{ fontSize: '0.7rem', color: '#fca5a5', fontWeight: 700 }}>CONTACTO INMEDIATO:</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#fef08a' }}>
                    📞 {caso.telefono_contacto} • PNC 911
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <img
                    src={qrUrl}
                    alt="QR"
                    style={{ width: '50px', height: '50px', borderRadius: '4px', background: '#fff', padding: '2px' }}
                  />
                  <div style={{ fontSize: '0.65rem', color: '#38bdf8' }}>
                    Escanea para<br />más detalles
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default MissingPersonFlyerModal;
