import React, { useState, useEffect } from 'react';
import { PhoneCall, ShieldCheck, Clock, AlertCircle } from 'lucide-react';
import socketService from '../services/socket';

const LiveTelemetryTicker = () => {
  const [clock, setClock] = useState(
    new Date().toLocaleTimeString('es-SV', { hour12: false })
  );
  const [activeAlertCount, setActiveAlertCount] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setClock(new Date().toLocaleTimeString('es-SV', { hour12: false }));
    }, 1000);

    const unsubAlert = socketService.on('nueva_alerta', () => {
      setActiveAlertCount((prev) => prev + 1);
    });

    return () => {
      clearInterval(timer);
      if (typeof unsubAlert === 'function') unsubAlert();
    };
  }, []);

  return (
    <aside aria-label="Líneas de Asistencia y Estado Oficial" style={{
      background: 'rgba(15, 23, 42, 0.95)',
      borderBottom: '1px solid rgba(255, 255, 255, 0.07)',
      padding: '0.4rem 1.25rem',
      fontSize: '0.75rem',
      color: '#94a3b8',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '1rem',
      flexWrap: 'wrap'
    }}>
      {/* Estado del Sistema */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.35rem',
          color: '#10b981',
          fontWeight: 600
        }}>
          <span style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            background: '#10b981',
            display: 'inline-block'
          }} />
          <span>Red Nacional en Vigilancia Activa</span>
        </div>

        <span style={{ color: '#334155' }}>|</span>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#cbd5e1' }}>
          <ShieldCheck size={14} color="#38bdf8" />
          <span>Protocolo Oficial de Cadena de Custodia</span>
        </div>
      </div>

      {/* Líneas de Emergencia Nacionales */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <PhoneCall size={13} color="#f43f5e" />
          <span style={{ color: '#f8fafc', fontWeight: 600 }}>Emergencias PNC:</span>
          <a href="tel:911" style={{ color: '#f43f5e', fontWeight: 700, textDecoration: 'none' }}>
            911
          </a>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <span style={{ color: '#cbd5e1', fontWeight: 500 }}>Fiscalía (FGR):</span>
          <a href="tel:116" style={{ color: '#38bdf8', fontWeight: 700, textDecoration: 'none' }}>
            116
          </a>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <span style={{ color: '#cbd5e1', fontWeight: 500 }}>Denuncia Anónima:</span>
          <span style={{ color: '#fbbf24', fontWeight: 700 }}>123</span>
        </div>

        <span style={{ color: '#334155' }}>|</span>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#94a3b8' }}>
          <Clock size={13} />
          <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{clock} SV</span>
        </div>
      </div>
    </aside>
  );
};

export default LiveTelemetryTicker;
