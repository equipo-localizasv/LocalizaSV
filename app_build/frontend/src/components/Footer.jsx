import React from 'react';

const Footer = () => {
  return (
    <footer style={{
      background: 'rgba(2, 6, 23, 0.98)',
      borderTop: '1px solid rgba(56, 189, 248, 0.15)',
      marginTop: '4rem',
      padding: '3rem 1.5rem 2rem',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Luz ambiental sutil */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: '50%',
        transform: 'translateX(-50%)',
        width: '60%',
        height: '1px',
        background: 'linear-gradient(90deg, transparent 0%, #38bdf8 50%, transparent 100%)',
        boxShadow: '0 0 12px rgba(56, 189, 248, 0.4)'
      }} />

      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '2.5rem',
        marginBottom: '2.5rem'
      }}>
        {/* Columna 1: Identidad Institucional y Criptográfica */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1rem' }}>
            <span style={{ fontSize: '1.6rem' }}>🛡️</span>
            <span style={{
              fontFamily: "'Outfit', sans-serif",
              fontSize: '1.3rem',
              fontWeight: 900,
              background: 'linear-gradient(135deg, #38bdf8 0%, #818cf8 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>
              LocalizaSV
            </span>
            <span style={{
              fontSize: '0.65rem',
              background: 'rgba(56, 189, 248, 0.12)',
              border: '1px solid rgba(56, 189, 248, 0.35)',
              color: '#38bdf8',
              padding: '0.1rem 0.4rem',
              borderRadius: '4px',
              fontFamily: 'monospace'
            }}>
              v2.5.0-C4I
            </span>
          </div>

          <p style={{ fontSize: '0.85rem', color: '#94a3b8', lineHeight: 1.6, marginBottom: '1.25rem' }}>
            Plataforma digital unificada de búsqueda solidaria, videovigilancia institucional y verificación forense para la República de El Salvador.
          </p>

          <div style={{
            background: 'rgba(15, 23, 42, 0.8)',
            border: '1px solid rgba(16, 185, 129, 0.25)',
            borderRadius: '8px',
            padding: '0.75rem',
            fontSize: '0.72rem',
            color: '#34d399',
            fontFamily: 'monospace',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <span>🔒</span>
            <div>
              <div style={{ fontWeight: 800 }}>CADENA DE CUSTODIA DIGITAL</div>
              <div style={{ color: '#64748b' }}>SHA-256 HASH VERIFICADO • REGISTRO FORENSE INMUTABLE</div>
            </div>
          </div>
        </div>

        {/* Columna 2: Marco Legal, Transparencia y Protocolos */}
        <div>
          <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.75rem' }}>
            Marco Legal y Protocolos Operativos
          </div>

          <div style={{
            background: 'rgba(15, 23, 42, 0.6)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '10px',
            padding: '1rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.65rem',
            fontSize: '0.8rem',
            color: '#cbd5e1'
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
              <span style={{ color: '#38bdf8', marginTop: '2px' }}>✓</span>
              <span><strong>Protocolo Alba-Keneth / Amber SV:</strong> Difusión inmediata de alertas tempranas.</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
              <span style={{ color: '#38bdf8', marginTop: '2px' }}>✓</span>
              <span><strong>Ley de Protección de Datos Personales:</strong> Encriptación de domicilios familiares.</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
              <span style={{ color: '#38bdf8', marginTop: '2px' }}>✓</span>
              <span><strong>Interconexión C4I:</strong> Coordinación operativa con PNC y Fiscalía General.</span>
            </div>
          </div>
        </div>

        {/* Columna 3: Números de Asistencia y Emergencia SV */}
        <div>
          <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#f87171', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.75rem' }}>
            Líneas de Asistencia Rápida 24/7
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            <a
              href="tel:911"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                padding: '0.6rem 0.85rem',
                borderRadius: '8px',
                color: '#fca5a5',
                textDecoration: 'none',
                transition: 'all 0.2s ease'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '1.1rem' }}>🚔</span>
                <div>
                  <div style={{ fontWeight: 800, fontSize: '0.85rem' }}>PNC Emergencias</div>
                  <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Policía Nacional Civil</div>
                </div>
              </div>
              <span style={{ fontFamily: 'monospace', fontWeight: 900, fontSize: '1rem', color: '#ef4444' }}>911</span>
            </a>

            <a
              href="tel:127"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: 'rgba(56, 189, 248, 0.1)',
                border: '1px solid rgba(56, 189, 248, 0.3)',
                padding: '0.6rem 0.85rem',
                borderRadius: '8px',
                color: '#93c5fd',
                textDecoration: 'none',
                transition: 'all 0.2s ease'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '1.1rem' }}>⚖️</span>
                <div>
                  <div style={{ fontWeight: 800, fontSize: '0.85rem' }}>Fiscalía General (FGR)</div>
                  <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Unidad de Personas Desaparecidas</div>
                </div>
              </div>
              <span style={{ fontFamily: 'monospace', fontWeight: 900, fontSize: '0.95rem', color: '#38bdf8' }}>127</span>
            </a>

            <a
              href="tel:22225155"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: 'rgba(16, 185, 129, 0.1)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                padding: '0.6rem 0.85rem',
                borderRadius: '8px',
                color: '#6ee7b7',
                textDecoration: 'none',
                transition: 'all 0.2s ease'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '1.1rem' }}>🚑</span>
                <div>
                  <div style={{ fontWeight: 800, fontSize: '0.85rem' }}>Cruz Roja Salvadoreña</div>
                  <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Búsqueda y Rescate Humanitario</div>
                </div>
              </div>
              <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '0.85rem', color: '#10b981' }}>2222-5155</span>
            </a>
          </div>
        </div>
      </div>

      {/* Barra Inferior de Copyright */}
      <div style={{
        borderTop: '1px solid rgba(255, 255, 255, 0.08)',
        paddingTop: '1.5rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1rem',
        fontSize: '0.75rem',
        color: '#64748b'
      }}>
        <div>
          © {new Date().getFullYear()} <strong>LocalizaSV</strong> — Red de Vigilancia e Inteligencia Forense de El Salvador.
        </div>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <span>Privacidad Biométrica Encriptada</span>
          <span>•</span>
          <span>Protocolo SV</span>
          <span>•</span>
          <span>Conforme Ley de Protección de Datos</span>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
