import React, { useRef } from 'react';

const MissingPersonFlyerModal = ({ isOpen, onClose, caso }) => {
  const printAreaRef = useRef(null);

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

  const handleShareWhatsApp = () => {
    const text = `🚨 *ALERTA DE BÚSQUEDA - LOCALIZASV* 🚨\nAyúdanos a encontrar a *${caso.nombre_desaparecido}* (${caso.edad} años).\n📍 Visto por última vez en: ${caso.ubicacion_desaparicion}\n📅 Fecha: ${formatDate(caso.fecha_desaparicion)}\n📞 Contacto urgente: ${caso.telefono_contacto} o PNC 911.\n\nVer caso completo en: ${window.location.origin}/casos/${caso.id}`;
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const handleCopyLink = () => {
    const url = `${window.location.origin}/casos/${caso.id}`;
    navigator.clipboard.writeText(url).then(() => {
      alert('¡Enlace del caso copiado al portapapeles!');
    });
  };

  return (
    <div className="modal-overlay animate-fade-in" style={{ zIndex: 12000 }}>
      <div 
        className="glass-panel" 
        style={{
          width: '100%',
          maxWidth: '750px',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          background: 'rgba(15, 23, 42, 0.98)',
          border: '1px solid rgba(56, 189, 248, 0.3)',
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.9), 0 0 35px rgba(14, 165, 233, 0.2)',
          borderRadius: '16px',
          overflow: 'hidden'
        }}
      >
        {/* Header Modal Bar */}
        <div style={{
          padding: '1rem 1.5rem',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'rgba(30, 41, 59, 0.6)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ fontSize: '1.5rem' }}>📄</span>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#fff' }}>
                Boletín Oficial de Búsqueda Solidaria
              </h3>
              <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                Formato oficial de alta visibilidad para impresión y difusión comunitaria
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="btn btn-secondary"
            style={{ padding: '0.4rem 0.8rem', borderRadius: '8px', cursor: 'pointer' }}
          >
            ✕ Cerrar
          </button>
        </div>

        {/* Action Toolbar */}
        <div style={{
          padding: '0.75rem 1.5rem',
          background: 'rgba(15, 23, 42, 0.8)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '0.75rem',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            💡 Puedes imprimirlo directamente o compartirlo en redes sociales.
          </span>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={handleShareWhatsApp}
              className="btn"
              style={{
                background: '#25D366',
                color: '#fff',
                fontSize: '0.85rem',
                padding: '0.5rem 0.9rem',
                fontWeight: '600',
                border: 'none',
                cursor: 'pointer'
              }}
            >
              💬 WhatsApp
            </button>
            <button
              onClick={handleCopyLink}
              className="btn btn-secondary"
              style={{ fontSize: '0.85rem', padding: '0.5rem 0.9rem', cursor: 'pointer' }}
            >
              🔗 Copiar Enlace
            </button>
            <button
              onClick={handlePrint}
              className="btn btn-primary"
              style={{ fontSize: '0.85rem', padding: '0.5rem 1rem', fontWeight: '700', cursor: 'pointer' }}
            >
              🖨️ Imprimir Afiche
            </button>
          </div>
        </div>

        {/* Printable Area Container */}
        <div style={{ padding: '1.5rem', overflowY: 'auto', flex: 1 }}>
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
              fontFamily: "'Inter', sans-serif"
            }}
          >
            {/* Flyer Header Banner */}
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

            {/* Main Content Layout */}
            <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: '1.75rem', alignItems: 'start' }}>
              {/* Photo Box */}
              <div style={{ textAlign: 'center' }}>
                <div style={{
                  border: '3px solid #dc2626',
                  borderRadius: '10px',
                  overflow: 'hidden',
                  background: '#f1f5f9',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                }}>
                  <img 
                    src={getImageUrl(caso.foto_desaparecido_url)} 
                    alt={caso.nombre_desaparecido}
                    style={{
                      width: '100%',
                      height: '270px',
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
                  fontWeight: '600'
                }}>
                  CASO REGISTRADO #{caso.id}
                </div>
              </div>

              {/* Trait & Event Info */}
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
                    <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Fecha de Desaparición</span>
                    <p style={{ margin: 0, fontSize: '0.95rem', fontWeight: '700', color: '#1e293b' }}>{formatDate(caso.fecha_desaparicion)}</p>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Estado de Búsqueda</span>
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

            {/* Emergency Hotline Banner */}
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
                  Líneas oficiales: <strong>PNC 911</strong> • <strong>Fiscalía General FGR 123</strong> • <strong>LocalizaSV</strong>
                </div>
              </div>

              <div style={{ 
                borderLeft: '2px solid rgba(255,255,255,0.2)', 
                paddingLeft: '1.25rem',
                textAlign: 'center',
                minWidth: '130px'
              }}>
                <div style={{
                  background: '#ffffff',
                  color: '#000',
                  padding: '0.4rem',
                  borderRadius: '6px',
                  fontWeight: '800',
                  fontSize: '0.75rem',
                  display: 'inline-block',
                  marginBottom: '0.25rem'
                }}>
                  SCAN QR / WEB
                </div>
                <div style={{ fontSize: '0.65rem', color: '#cbd5e1' }}>
                  localizasv.org/casos/{caso.id}
                </div>
              </div>
            </div>

            {/* Footer notice */}
            <div style={{ textAlign: 'center', marginTop: '1rem', fontSize: '0.7rem', color: '#64748b' }}>
              Documento emitido por la Plataforma de Monitoreo Comunitario y Búsqueda Solidaria LocalizaSV • El Salvador
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MissingPersonFlyerModal;
