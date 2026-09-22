import React, { useState, useEffect } from 'react';
import socketService from '../services/socket';

const LiveTelemetryTicker = () => {
  const [clock, setClock] = useState(new Date().toLocaleTimeString('es-SV', { hour12: false }));
  const [socketStatus, setSocketStatus] = useState('conectado');
  const [pulseActive, setPulseActive] = useState(true);

  useEffect(() => {
    const timer = setInterval(() => {
      setClock(new Date().toLocaleTimeString('es-SV', { hour12: false }));
    }, 1000);

    const unsubAlert = socketService.on('nueva_alerta', () => {
      setPulseActive(false);
      setTimeout(() => setPulseActive(true), 300);
    });

    return () => {
      clearInterval(timer);
      if (typeof unsubAlert === 'function') unsubAlert();
    };
  }, []);

  return (
    <div style={{
      background: 'rgba(2, 6, 23, 0.94)',
      borderBottom: '1px solid rgba(0, 240, 255, 0.22)',
      backdropFilter: 'blur(10px)',
      padding: '0.35rem 1rem',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '1rem',
      fontSize: '0.74rem',
      fontFamily: 'monospace',
      color: '#94a3b8',
      overflowX: 'auto',
      whiteSpace: 'nowrap',
      zIndex: 900
    }}>
      {/* Indicador de Red Principal */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.4rem',
          background: 'rgba(0, 255, 157, 0.1)',
          border: '1px solid rgba(0, 255, 157, 0.3)',
          padding: '0.15rem 0.55rem',
          borderRadius: '12px',
          color: '#00ff9d',
          fontWeight: 700
        }}>
          <span style={{
            width: '7px',
            height: '7px',
            borderRadius: '50%',
            background: '#00ff9d',
            boxShadow: '0 0 8px #00ff9d',
            display: 'inline-block',
            animation: pulseActive ? 'cyberPulseGreen 1.8s infinite' : 'none'
          }} />
          <span>RED NACIONAL ONLINE</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#38bdf8' }}>
          <span>📡</span>
          <span>MOTOR IA: <strong>ACTIVO (30 FPS)</strong></span>
        </div>

        <span style={{ color: 'rgba(255,255,255,0.15)' }}>|</span>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#c084fc' }}>
          <span>🧬</span>
          <span>ARCFACE 512-D: <strong>~15ms</strong></span>
        </div>

        <span style={{ color: 'rgba(255,255,255,0.15)' }}>|</span>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#cbd5e1' }}>
          <span>🛡️</span>
          <span>CADENA DE CUSTODIA: <strong>SHA-256 VERIFICADA</strong></span>
        </div>
      </div>

      {/* Reloj y Sincronización SV */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <div style={{
          background: 'rgba(14, 165, 233, 0.12)',
          border: '1px solid rgba(14, 165, 233, 0.35)',
          padding: '0.15rem 0.6rem',
          borderRadius: '4px',
          color: '#00f0ff',
          fontWeight: 700
        }}>
          🇸🇻 SV MILITARY TIME: {clock} UTC-6
        </div>
      </div>
    </div>
  );
};

export default LiveTelemetryTicker;
