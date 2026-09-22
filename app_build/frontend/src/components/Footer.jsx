import React from 'react';
import soundEffects from '../services/soundEffects';

const Footer = () => {
  return (
    <footer style={{
      background: 'rgba(2, 6, 23, 0.98)',
      borderTop: '1px solid rgba(0, 240, 255, 0.25)',
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
        background: 'linear-gradient(90deg, transparent 0%, #00f0ff 50%, transparent 100%)',
        boxShadow: '0 0 15px #00f0ff'
      }} />

      <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2.5rem', marginBottom: '2.5rem' }}>
        {/* Columna 1: Identidad Institucional y Criptográfica */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1rem' }}>
            <span style={{ fontSize: '1.6rem' }}>🛡️</span>
            <span style={{
              fontFamily: "'Outfit', sans-serif",
              fontSize: '1.3rem',
              fontWeight: 900,
              background: 'linear-gradient(135deg, #00f0ff 0%, #a855f7 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>
              LocalizaSV
            </span>
            <span style={{
              fontSize: '0.65rem',
              background: 'rgba(0, 240, 255, 0.15)',
              border: '1px solid rgba(0, 240, 255, 0.4)',
              color: '#38bdf8',
              padding: '0.1rem 0.4rem',
              borderRadius: '4px',
              fontFamily: 'monospace'
            }}>
              v2.5.0-C4I
            </span>
          </div>

          <p style={{ fontSize: '0.85rem', color: '#94a3b8', lineHeight: 1.6, marginBottom: '1.25rem' }}>
            Plataforma digital unificada de videovigilancia y búsqueda forense solidaria para la República de El Salvador. Interconexión en tiempo real con Inteligencia Artificial autónoma.
          </p>

          <div style={{
            background: 'rgba(15, 23, 42, 0.8)',
            border: '1px solid rgba(0, 255, 157, 0.3)',
            borderRadius: '8px',
            padding: '0.75rem',
            fontSize: '0.72rem',
            color: '#00ff9d',
            fontFamily: 'monospace',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <span>🔒</span>
            <div>
              <div style={{ fontWeight: 800 }}>CADENA DE CUSTODIA DIGITAL</div>
              <div style={{ color: '#64748b' }}>SHA-256 HASH VERIFICADO • BASE FORENSE RESGUARDADA</div>
            </div>
          </div>
        </div>

        {/* Columna 2: Red Departamental SVG de El Salvador */}
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.75rem' }}>
            Cobertura Nacional Activa (14 Departamentos)
          </div>

          {/* Mapa SVG Minimalista de El Salvador con Nodos Pulsantes */}
          <div style={{
            background: 'rgba(15, 23, 42, 0.6)',
            border: '1px solid rgba(0, 240, 255, 0.2)',
            borderRadius: '12px',
            padding: '1rem',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center'
          }}>
            <svg viewBox="0 0 320 160" style={{ width: '100%', maxHeight: '120px' }}>
              {/* Contorno estilizado de El Salvador */}
              <path
                d="M 25,65 Q 50,45 95,45 Q 160,35 220,55 Q 280,65 305,95 Q 295,125 250,135 Q 170,140 100,120 Q 40,110 25,85 Z"
                fill="rgba(14, 165, 233, 0.08)"
                stroke="rgba(0, 240, 255, 0.4)"
                strokeWidth="1.5"
                strokeDasharray="4 2"
              />

              {/* Nodos Departamentales Clave */}
              {[
                { name: 'San Salvador', cx: 155, cy: 80, pulse: true },
                { name: 'Santa Ana', cx: 90, cy: 60, pulse: true },
                { name: 'San Miguel', cx: 235, cy: 95, pulse: true },
                { name: 'La Libertad', cx: 130, cy: 100, pulse: true },
                { name: 'Sonsonate', cx: 70, cy: 85, pulse: false },
                { name: 'Usulután', cx: 200, cy: 115, pulse: false },
                { name: 'Ahuachapán', cx: 45, cy: 65, pulse: false },
                { name: 'Chalatenango', cx: 145, cy: 45, pulse: false },
                { name: 'La Paz', cx: 175, cy: 105, pulse: false },
                { name: 'La Unión', cx: 285, cy: 105, pulse: false }
              ].map((node) => (
                <g key={node.name}>
                  {node.pulse && (
                    <circle cx={node.cx} cy={node.cy} r="7" fill="none" stroke="#00ff9d" strokeWidth="1" opacity="0.6">
                      <animate attributeName="r" values="3;10;3" dur="2s" repeatCount="indefinite" />
                      <animate attributeName="opacity" values="0.8;0.1;0.8" dur="2s" repeatCount="indefinite" />
                    </circle>
                  )}
                  <circle cx={node.cx} cy={node.cy} r="3" fill={node.pulse ? '#00ff9d' : '#00f0ff'} />
                </g>
              ))}
            </svg>
            <span style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '0.4rem', fontFamily: 'monospace' }}>
              🟢 Matriz CCTV e Interconexión Satelital Sincronizada
            </span>
          </div>
        </div>

        {/* Columna 3: Números de Emergencia Oficiales SV */}
        <div>
          <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#f87171', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.75rem' }}>
            Líneas de Asistencia Rápida 24/7
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            <a
              href="tel:911"
              onClick={() => soundEffects.playClickSound()}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: 'rgba(239, 68, 68, 0.12)',
                border: '1px solid rgba(239, 68, 68, 0.35)',
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
              onClick={() => soundEffects.playClickSound()}
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
              onClick={() => soundEffects.playClickSound()}
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
          © {new Date().getFullYear()} <strong>LocalizaSV</strong> — Red de Vigilancia Solidaria e Inteligencia Artificial Forense de El Salvador.
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <span>Privacidad Biométrica Encriptada</span>
          <span>•</span>
          <span>Protocolo Amber SV</span>
          <span>•</span>
          <span>Conforme Ley de Protección de Datos</span>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
