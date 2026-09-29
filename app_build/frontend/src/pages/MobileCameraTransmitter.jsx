import React, { useState, useEffect, useRef } from 'react';
import api, { getServerBaseUrl } from '../services/api';

const MobileCameraTransmitter = () => {
  const [transmitting, setTransmitting] = useState(false);
  const [facingMode, setFacingMode] = useState('environment'); // 'user' | 'environment'
  const [selectedCamId, setSelectedCamId] = useState(1);
  const [cameras, setCameras] = useState([]);
  const [fps, setFps] = useState(0);
  const [statusMsg, setStatusMsg] = useState('Listo para iniciar transmisión táctica');
  const [geoCoords, setGeoCoords] = useState(null);
  const [lastLatency, setLastLatency] = useState(null);
  const [framesSent, setFramesSent] = useState(0);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const intervalRef = useRef(null);
  const frameCountRef = useRef(0);

  // Cargar lista de cámaras
  useEffect(() => {
    api.get('/camaras')
      .then(res => {
        if (res.data && res.data.length > 0) {
          setCameras(res.data);
          setSelectedCamId(res.data[0].id);
        }
      })
      .catch(() => {});

    // Geolocalización táctica
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setGeoCoords({ lat: pos.coords.latitude.toFixed(5), lng: pos.coords.longitude.toFixed(5) }),
        () => {}
      );
    }
  }, []);

  // Calcular FPS cada segundo
  useEffect(() => {
    const fpsTimer = setInterval(() => {
      setFps(frameCountRef.current);
      frameCountRef.current = 0;
    }, 1000);
    return () => clearInterval(fpsTimer);
  }, []);

  const startTransmission = async () => {
    try {
      setStatusMsg('Accediendo a la cámara...');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }

      setTransmitting(true);
      setStatusMsg('Transmisión C4I Activa en Tiempo Real');

      // Bucle de captura y envío de fotogramas (cada 400ms = 2.5 FPS suficiente para reconocimiento facial C4I ultra fluido)
      intervalRef.current = setInterval(captureAndSendFrame, 400);
    } catch (err) {
      console.error('Error al abrir cámara:', err);
      setStatusMsg('Error: No se pudo acceder a la cámara. Permita el acceso en el navegador.');
    }
  };

  const stopTransmission = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    setTransmitting(false);
    setStatusMsg('Transmisión pausada');
  };

  const switchCamera = () => {
    const newMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(newMode);
    if (transmitting) {
      stopTransmission();
      setTimeout(() => startTransmission(), 300);
    }
  };

  const captureAndSendFrame = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (video.videoWidth === 0 || video.videoHeight === 0) return;

    canvas.width = 640;
    canvas.height = Math.round((640 * video.videoHeight) / video.videoWidth);

    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Comprimir en JPEG calidad 0.65 (rápido y liviano)
    const base64Data = canvas.toDataURL('image/jpeg', 0.65);

    const startT = Date.now();
    try {
      await api.post(`/camaras/${selectedCamId}/frame`, { image: base64Data });
      const lat = Date.now() - startT;
      setLastLatency(lat);
      frameCountRef.current += 1;
      setFramesSent(prev => prev + 1);
    } catch (err) {
      // Error silencioso en transmisión
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#090d16',
      color: '#f8fafc',
      fontFamily: 'Inter, system-ui, sans-serif',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '16px'
    }}>
      {/* Header Táctico */}
      <div style={{
        width: '100%',
        maxWidth: '540px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '12px 18px',
        background: 'rgba(15, 23, 42, 0.9)',
        borderRadius: '12px',
        border: '1px solid rgba(0, 240, 255, 0.3)',
        marginBottom: '16px',
        boxShadow: '0 4px 20px rgba(0, 240, 255, 0.15)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '1.4rem' }}>📹</span>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#38bdf8', letterSpacing: '0.05em' }}>
              TRANSMISOR C4I MÓVIL
            </h1>
            <p style={{ margin: 0, fontSize: '0.75rem', color: '#94a3b8' }}>
              Bodycam / Patrulla en Tiempo Real
            </p>
          </div>
        </div>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          background: transmitting ? 'rgba(239, 68, 68, 0.2)' : 'rgba(100, 116, 139, 0.2)',
          padding: '6px 12px',
          borderRadius: '999px',
          border: transmitting ? '1px solid #ef4444' : '1px solid #475569'
        }}>
          <span style={{
            width: '10px',
            height: '10px',
            borderRadius: '50%',
            background: transmitting ? '#ef4444' : '#64748b',
            boxShadow: transmitting ? '0 0 10px #ef4444' : 'none',
            animation: transmitting ? 'pulse 1.2s infinite' : 'none'
          }} />
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: transmitting ? '#f87171' : '#94a3b8' }}>
            {transmitting ? 'EN VIVO' : 'PAUSADO'}
          </span>
        </div>
      </div>

      {/* Visor de Video con Retícula Táctica */}
      <div style={{
        position: 'relative',
        width: '100%',
        maxWidth: '540px',
        aspectRatio: '16/9',
        background: '#020617',
        borderRadius: '16px',
        overflow: 'hidden',
        border: transmitting ? '2px solid #00f0ff' : '1px solid #1e293b',
        boxShadow: transmitting ? '0 0 35px rgba(0, 240, 255, 0.25)' : 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <video
          ref={videoRef}
          playsInline
          muted
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            display: transmitting ? 'block' : 'none'
          }}
        />

        {!transmitting && (
          <div style={{ textAlign: 'center', padding: '20px' }}>
            <span style={{ fontSize: '3rem', opacity: 0.6 }}>📷</span>
            <p style={{ marginTop: '12px', color: '#94a3b8', fontSize: '0.9rem' }}>
              Cámara inactiva. Pulsa "Iniciar Transmisión" abajo para enlazar en vivo con el centro de mando C4I.
            </p>
          </div>
        )}

        {/* Retícula Táctica y HUD */}
        {transmitting && (
          <>
            <div style={{
              position: 'absolute',
              top: '12px',
              left: '12px',
              background: 'rgba(0, 0, 0, 0.65)',
              padding: '4px 10px',
              borderRadius: '6px',
              fontSize: '0.75rem',
              fontFamily: 'monospace',
              color: '#38bdf8'
            }}>
              FPS: {fps} | Latencia: {lastLatency ? `${lastLatency}ms` : '--'}
            </div>

            {geoCoords && (
              <div style={{
                position: 'absolute',
                top: '12px',
                right: '12px',
                background: 'rgba(0, 0, 0, 0.65)',
                padding: '4px 10px',
                borderRadius: '6px',
                fontSize: '0.75rem',
                fontFamily: 'monospace',
                color: '#4ade80'
              }}>
                GPS: {geoCoords.lat}, {geoCoords.lng}
              </div>
            )}

            <div style={{
              position: 'absolute',
              bottom: '12px',
              left: '12px',
              background: 'rgba(0, 0, 0, 0.65)',
              padding: '4px 10px',
              borderRadius: '6px',
              fontSize: '0.75rem',
              color: '#e2e8f0'
            }}>
              Fotogramas: {framesSent}
            </div>

            {/* Escáner Retícula Central */}
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '140px',
              height: '140px',
              border: '2px dashed rgba(0, 240, 255, 0.4)',
              borderRadius: '12px',
              pointerEvents: 'none'
            }}>
              <div style={{
                position: 'absolute',
                top: '-2px',
                left: '-2px',
                width: '16px',
                height: '16px',
                borderTop: '3px solid #00f0ff',
                borderLeft: '3px solid #00f0ff'
              }} />
              <div style={{
                position: 'absolute',
                top: '-2px',
                right: '-2px',
                width: '16px',
                height: '16px',
                borderTop: '3px solid #00f0ff',
                borderRight: '3px solid #00f0ff'
              }} />
              <div style={{
                position: 'absolute',
                bottom: '-2px',
                left: '-2px',
                width: '16px',
                height: '16px',
                borderBottom: '3px solid #00f0ff',
                borderLeft: '3px solid #00f0ff'
              }} />
              <div style={{
                position: 'absolute',
                bottom: '-2px',
                right: '-2px',
                width: '16px',
                height: '16px',
                borderBottom: '3px solid #00f0ff',
                borderRight: '3px solid #00f0ff'
              }} />
            </div>
          </>
        )}
      </div>

      <canvas ref={canvasRef} style={{ display: 'none' }} />

      {/* Controles de Transmisión */}
      <div style={{
        width: '100%',
        maxWidth: '540px',
        marginTop: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
      }}>
        {/* Selector de Canal / Cámara */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          background: 'rgba(15, 23, 42, 0.8)',
          padding: '10px 14px',
          borderRadius: '10px',
          border: '1px solid rgba(255, 255, 255, 0.08)'
        }}>
          <label style={{ fontSize: '0.85rem', color: '#94a3b8', whiteSpace: 'nowrap' }}>
            Canal C4I:
          </label>
          <select
            value={selectedCamId}
            onChange={(e) => setSelectedCamId(Number(e.target.value))}
            style={{
              flex: 1,
              background: '#090d16',
              color: '#f8fafc',
              border: '1px solid rgba(0, 240, 255, 0.3)',
              borderRadius: '6px',
              padding: '8px',
              fontSize: '0.85rem'
            }}
          >
            {cameras.map(c => (
              <option key={c.id} value={c.id}>
                Cam {c.id}: {c.nombre}
              </option>
            ))}
          </select>
        </div>

        {/* Botones Principales */}
        <div style={{ display: 'flex', gap: '10px' }}>
          {!transmitting ? (
            <button
              onClick={startTransmission}
              style={{
                flex: 1,
                padding: '16px',
                background: 'linear-gradient(135deg, #0284c7 0%, #00f0ff 100%)',
                color: '#020617',
                border: 'none',
                borderRadius: '12px',
                fontWeight: 800,
                fontSize: '1rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: '0 8px 24px rgba(0, 240, 255, 0.35)'
              }}
            >
              <span>🔴</span> INICIAR TRANSMISIÓN C4I
            </button>
          ) : (
            <button
              onClick={stopTransmission}
              style={{
                flex: 1,
                padding: '16px',
                background: 'linear-gradient(135deg, #e11d48 0%, #f43f5e 100%)',
                color: '#ffffff',
                border: 'none',
                borderRadius: '12px',
                fontWeight: 800,
                fontSize: '1rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: '0 8px 24px rgba(244, 63, 94, 0.35)'
              }}
            >
              <span>⏹️</span> DETENER TRANSMISIÓN
            </button>
          )}

          <button
            onClick={switchCamera}
            style={{
              padding: '16px 20px',
              background: 'rgba(30, 41, 59, 0.8)',
              color: '#38bdf8',
              border: '1px solid rgba(0, 240, 255, 0.3)',
              borderRadius: '12px',
              fontSize: '1.2rem',
              cursor: 'pointer'
            }}
            title="Cambiar Cámara Frontal / Trasera"
          >
            🔄
          </button>
        </div>

        {/* Mensaje de Estado */}
        <div style={{
          textAlign: 'center',
          fontSize: '0.85rem',
          color: transmitting ? '#38bdf8' : '#64748b',
          marginTop: '6px'
        }}>
          {statusMsg}
        </div>
      </div>
    </div>
  );
};

export default MobileCameraTransmitter;
