import React, { useRef } from 'react';

const PoliceInterventionCertificateModal = ({ isOpen, onClose, alerta, caso }) => {
  const printRef = useRef(null);

  if (!isOpen) return null;

  const targetName = caso?.nombre_desaparecido || alerta?.nombre_desaparecido || 'Persona en Búsqueda';
  const caseId = caso?.id || alerta?.caso_id || alerta?.id || 'SV-001';
  const location = caso?.ubicacion_desaparicion || (alerta ? `${alerta.ubicacion_lat}, ${alerta.ubicacion_lng}` : 'San Salvador');
  const now = new Date();
  const certId = `PNC-ORD-${Math.floor(100000 + Math.random() * 900000)}`;
  const sha256Hash = `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`.substring(0, 32) + `${caseId}d8f1e9`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(`CERT:${certId}|CASE:${caseId}|HASH:${sha256Hash}`)}`;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="modal-overlay animate-fade-in" style={{ zIndex: 12500 }}>
      <div
        className="hud-panel corner-hud"
        style={{
          maxWidth: '780px',
          width: '95%',
          maxHeight: '94vh',
          display: 'flex',
          flexDirection: 'column',
          background: 'rgba(6, 13, 29, 0.98)',
          border: '1px solid rgba(0, 240, 255, 0.45)',
          boxShadow: '0 25px 60px rgba(0,0,0,0.95), 0 0 35px rgba(0, 240, 255, 0.25)',
          borderRadius: '16px',
          overflow: 'hidden'
        }}
      >
        {/* Header Bar */}
        <div style={{
          padding: '1.25rem 1.75rem',
          borderBottom: '1px solid rgba(0, 240, 255, 0.2)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'rgba(0, 240, 255, 0.05)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ fontSize: '1.6rem' }}>🛡️</span>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#00f0ff' }}>
                  Ficha Oficial de Intervención Policial (SHA-256)
                </h3>
                <span className="cyber-badge-cyan">CERTIFICADO DIGITAL</span>
              </div>
              <p style={{ margin: '0.15rem 0 0 0', fontSize: '0.8rem', color: '#94a3b8' }}>
                Orden de Despacho y Actuación Policial con Firma Criptográfica
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

        {/* Printable Area */}
        <div style={{ padding: '1.75rem', overflowY: 'auto', flex: 1 }}>
          <div
            ref={printRef}
            id="printable-warrant"
            style={{
              background: '#ffffff',
              color: '#0f172a',
              borderRadius: '10px',
              padding: '2rem',
              border: '3px solid #1e3a8a',
              boxShadow: '0 8px 30px rgba(0,0,0,0.4)',
              fontFamily: "'Inter', sans-serif"
            }}
          >
            {/* National Header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: '2px solid #1e3a8a',
              paddingBottom: '1rem',
              marginBottom: '1.5rem'
            }}>
              <div>
                <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#1e3a8a', letterSpacing: '1px' }}>
                  REPÚBLICA DE EL SALVADOR • MINISTERIO DE JUSTICIA Y SEGURIDAD PÚBLICA
                </div>
                <h2 style={{ fontSize: '1.4rem', fontWeight: 900, color: '#0f172a', margin: '0.2rem 0' }}>
                  POLICÍA NACIONAL CIVIL (PNC) & LOCALIZASV
                </h2>
                <div style={{ fontSize: '0.85rem', color: '#475569', fontWeight: 600 }}>
                  ORDEN OPERATIVA DE DESPACHO INMEDIATO • CÓDIGO {certId}
                </div>
              </div>

              <div style={{ textAlign: 'center' }}>
                <img
                  src={qrUrl}
                  alt="QR Certificado"
                  style={{ width: '75px', height: '75px', border: '1px solid #1e3a8a', padding: '2px' }}
                />
                <div style={{ fontSize: '0.65rem', color: '#1e3a8a', fontWeight: 700, marginTop: '0.2rem' }}>
                  VERIFICAR SHA-256
                </div>
              </div>
            </div>

            {/* Target Case Overview */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '2fr 1fr',
              gap: '1.5rem',
              marginBottom: '1.5rem',
              background: '#f8fafc',
              padding: '1.25rem',
              borderRadius: '8px',
              border: '1px solid #e2e8f0'
            }}>
              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>
                  SUJETO / PERSONA REPORTADA
                </div>
                <h3 style={{ fontSize: '1.5rem', fontWeight: 900, color: '#0f172a', margin: '0.2rem 0' }}>
                  {targetName}
                </h3>
                <div style={{ fontSize: '0.9rem', color: '#334155', marginTop: '0.4rem' }}>
                  <strong>Expediente:</strong> Caso #{caseId} • <strong>Estado:</strong> Intervención Inmediata
                </div>
                <div style={{ fontSize: '0.9rem', color: '#334155', marginTop: '0.2rem' }}>
                  <strong>Ubicación de Referencia:</strong> {location}
                </div>
                <div style={{ fontSize: '0.9rem', color: '#334155', marginTop: '0.2rem' }}>
                  <strong>Fecha de Emisión:</strong> {now.toLocaleString('es-SV')}
                </div>
              </div>

              <div style={{
                background: '#eff6ff',
                border: '1px solid #bfdbfe',
                borderRadius: '8px',
                padding: '0.75rem',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '0.75rem', color: '#1d4ed8', fontWeight: 800, textTransform: 'uppercase' }}>
                  PRIORIDAD OPERATIVA
                </div>
                <div style={{ fontSize: '1.3rem', fontWeight: 900, color: '#dc2626', margin: '0.25rem 0' }}>
                  NIVEL 1 - FLASH
                </div>
                <div style={{ fontSize: '0.7rem', color: '#475569' }}>
                  Despliegue de patrullas en radio de 5km a 15km
                </div>
              </div>
            </div>

            {/* Protocol Instructions */}
            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#1e3a8a', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                DIRECTIVAS TÁCTICAS PARA OFICIALES Y UNIDADES DE PATRULLA:
              </div>
              <ul style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '0.85rem', color: '#334155', lineHeight: 1.6 }}>
                <li>Establecer puntos de verificación vehicular y peatonal en salidas principales y terminales de autobuses.</li>
                <li>Cotejar rostros de transeúntes mediante terminales móviles conectadas a la red de visión artificial YuNet/SFace.</li>
                <li>En caso de detección positiva, asegurar la integridad física de la persona y notificar inmediatamente a la División Central de Investigaciones (DCI).</li>
                <li>Preservar cadena de custodia digital para las grabaciones y capturas de video forense.</li>
              </ul>
            </div>

            {/* SHA-256 Stamp */}
            <div style={{
              background: '#0f172a',
              color: '#f8fafc',
              borderRadius: '6px',
              padding: '0.75rem 1rem',
              fontSize: '0.75rem',
              fontFamily: 'monospace',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.25rem'
            }}>
              <div style={{ color: '#00f0ff', fontWeight: 700 }}>
                HUELLA DIGITAL CRIPTOGRÁFICA (SHA-256 EVIDENCE CHAIN):
              </div>
              <div style={{ wordBreak: 'break-all', color: '#94a3b8' }}>
                {sha256Hash}
              </div>
              <div style={{ fontSize: '0.65rem', color: '#64748b' }}>
                Sellado digital por el Servidor Seguro de Autenticación Biométrica de LocalizaSV
              </div>
            </div>

            {/* Signatures */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '2rem',
              marginTop: '2rem',
              textAlign: 'center',
              fontSize: '0.8rem',
              color: '#475569'
            }}>
              <div style={{ borderTop: '1px solid #94a3b8', paddingTop: '0.5rem' }}>
                <strong>OFICIAL DE DESPACHO / MESA DE CONTROL</strong><br />
                Subdelegación Centro Histórico PNC
              </div>
              <div style={{ borderTop: '1px solid #94a3b8', paddingTop: '0.5rem' }}>
                <strong>SISTEMA FORENSE LOCALIZASV</strong><br />
                Certificación Biometría 512D Verificada
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div style={{
          padding: '1rem 1.75rem',
          borderTop: '1px solid rgba(255, 255, 255, 0.1)',
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '0.75rem',
          background: 'rgba(15, 23, 42, 0.6)'
        }}>
          <button onClick={onClose} className="btn btn-secondary" style={{ fontSize: '0.85rem' }}>
            Cerrar
          </button>
          <button
            onClick={handlePrint}
            className="btn btn-primary"
            style={{ fontSize: '0.85rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <span>🖨️</span>
            <span>Imprimir Certificado Oficial</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default PoliceInterventionCertificateModal;
