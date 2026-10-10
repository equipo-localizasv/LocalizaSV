import React, { useState, useEffect, useRef } from 'react';
import { 
  Clock, 
  Sparkles, 
  Printer, 
  X, 
  Download, 
  Sliders, 
  RefreshCw, 
  CheckCircle2,
  Columns,
  SplitSquareVertical
} from 'lucide-react';

const AgeProgressionModal = ({ isOpen, onClose, caso }) => {
  const [addedYears, setAddedYears] = useState(10);
  const [agingIntensity, setAgingIntensity] = useState('moderado'); // 'sutil' | 'moderado' | 'avanzado'
  const [environmentalExposure, setEnvironmentalExposure] = useState(true);
  const [splitPosition, setSplitPosition] = useState(50);
  const [isDraggingSplit, setIsDraggingSplit] = useState(false);
  const [viewMode, setViewMode] = useState('split'); // 'split' | 'sideBySide'
  const [rendering, setRendering] = useState(false);
  const [projectedDataUrl, setProjectedDataUrl] = useState('');
  const [imgError, setImgError] = useState(false);

  const containerRef = useRef(null);

  if (!isOpen || !caso) return null;

  const originalAge = parseInt(caso.edad) || 20;
  const projectedAge = originalAge + addedYears;

  const getImageUrl = (path) => {
    if (!path) return 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=600&q=80';
    if (path.startsWith('http')) return path;
    const hostname = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
    return `http://${hostname}:3001${path}`;
  };

  const rawImageSrc = caso.foto_url || caso.foto_desaparecido_url;
  const imageSrc = getImageUrl(rawImageSrc);

  // Motor Anatómico de Envejecimiento en Canvas
  useEffect(() => {
    if (!isOpen || !imageSrc) return;

    let isMounted = true;
    setRendering(true);

    const generateAgingProjection = (useCors = true) => {
      const img = new Image();
      if (useCors) {
        img.crossOrigin = 'anonymous';
      }

      img.onload = () => {
        if (!isMounted) return;
        try {
          const canvas = document.createElement('canvas');
          const w = img.naturalWidth || 600;
          const h = img.naturalHeight || 800;
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');

          // 1. Dibujar fotografía base
          ctx.drawImage(img, 0, 0, w, h);

          // Posicionamiento facial anatómico
          const bio = caso.biometria_insightface;
          const bbox = bio?.bbox;
          let faceX = w * 0.5;
          let faceY = h * 0.44;
          let faceW = w * 0.46;
          let faceH = h * 0.54;

          if (bbox && bbox.length >= 4) {
            faceX = bbox[0] + bbox[2] * 0.5;
            faceY = bbox[1] + bbox[3] * 0.5;
            faceW = bbox[2];
            faceH = bbox[3];
          }

          const progressFactor = Math.min(Math.max(addedYears / 30, 0.1), 1.0);
          const intensityMult = agingIntensity === 'avanzado' ? 1.4 : agingIntensity === 'sutil' ? 0.7 : 1.0;

          // 2. Tono y pigmentación dérmica
          ctx.save();
          ctx.globalCompositeOperation = 'multiply';
          ctx.fillStyle = `rgba(175, 155, 140, ${0.1 * progressFactor * intensityMult})`;
          ctx.fillRect(0, 0, w, h);
          ctx.restore();

          // 3. Surcos nasogenianos (pliegues de la sonrisa)
          ctx.save();
          ctx.strokeStyle = `rgba(30, 18, 12, ${0.32 * progressFactor * intensityMult})`;
          ctx.lineWidth = Math.max(2, faceW * 0.007 * intensityMult);
          ctx.lineCap = 'round';
          ctx.shadowColor = `rgba(0, 0, 0, ${0.3 * progressFactor})`;
          ctx.shadowBlur = 4;

          const leftNoseX = faceX - faceW * 0.17;
          const leftNoseY = faceY + faceH * 0.08;
          const leftMouthX = faceX - faceW * 0.22;
          const leftMouthY = faceY + faceH * 0.28;

          ctx.beginPath();
          ctx.moveTo(leftNoseX, leftNoseY);
          ctx.quadraticCurveTo(leftNoseX - faceW * 0.05, (leftNoseY + leftMouthY) * 0.5, leftMouthX, leftMouthY);
          ctx.stroke();

          const rightNoseX = faceX + faceW * 0.17;
          const rightNoseY = faceY + faceH * 0.08;
          const rightMouthX = faceX + faceW * 0.22;
          const rightMouthY = faceY + faceH * 0.28;

          ctx.beginPath();
          ctx.moveTo(rightNoseX, rightNoseY);
          ctx.quadraticCurveTo(rightNoseX + faceW * 0.05, (rightNoseY + rightMouthY) * 0.5, rightMouthX, rightMouthY);
          ctx.stroke();

          // Resalte tridimensional adyacente al surco
          ctx.strokeStyle = `rgba(255, 250, 240, ${0.14 * progressFactor * intensityMult})`;
          ctx.lineWidth = Math.max(1.2, faceW * 0.005);
          ctx.beginPath();
          ctx.moveTo(leftNoseX - 2, leftNoseY);
          ctx.quadraticCurveTo(leftNoseX - faceW * 0.05 - 2, (leftNoseY + leftMouthY) * 0.5, leftMouthX - 2, leftMouthY);
          ctx.moveTo(rightNoseX + 2, rightNoseY);
          ctx.quadraticCurveTo(rightNoseX + faceW * 0.05 + 2, (rightNoseY + rightMouthY) * 0.5, rightMouthX + 2, rightMouthY);
          ctx.stroke();
          ctx.restore();

          // 4. Líneas perioculares (patas de gallo)
          if (addedYears >= 5) {
            ctx.save();
            ctx.strokeStyle = `rgba(35, 20, 15, ${0.25 * progressFactor * intensityMult})`;
            ctx.lineWidth = Math.max(1.3, faceW * 0.004);
            ctx.lineCap = 'round';

            const eyeLeftOuterX = faceX - faceW * 0.32;
            const eyeLeftOuterY = faceY - faceH * 0.08;
            ctx.beginPath();
            ctx.moveTo(eyeLeftOuterX, eyeLeftOuterY);
            ctx.lineTo(eyeLeftOuterX - faceW * 0.07, eyeLeftOuterY - faceH * 0.03);
            ctx.moveTo(eyeLeftOuterX, eyeLeftOuterY + 2);
            ctx.lineTo(eyeLeftOuterX - faceW * 0.08, eyeLeftOuterY + faceH * 0.01);
            ctx.moveTo(eyeLeftOuterX, eyeLeftOuterY + 4);
            ctx.lineTo(eyeLeftOuterX - faceW * 0.06, eyeLeftOuterY + faceH * 0.04);
            ctx.stroke();

            const eyeRightOuterX = faceX + faceW * 0.32;
            const eyeRightOuterY = faceY - faceH * 0.08;
            ctx.beginPath();
            ctx.moveTo(eyeRightOuterX, eyeRightOuterY);
            ctx.lineTo(eyeRightOuterX + faceW * 0.07, eyeRightOuterY - faceH * 0.03);
            ctx.moveTo(eyeRightOuterX, eyeRightOuterY + 2);
            ctx.lineTo(eyeRightOuterX + faceW * 0.08, eyeRightOuterY + faceH * 0.01);
            ctx.moveTo(eyeRightOuterX, eyeRightOuterY + 4);
            ctx.lineTo(eyeRightOuterX + faceW * 0.06, eyeRightOuterY + faceH * 0.04);
            ctx.stroke();
            ctx.restore();
          }

          // 5. Surcos frontales (líneas de la frente)
          if (addedYears >= 10) {
            ctx.save();
            ctx.strokeStyle = `rgba(35, 20, 15, ${0.2 * progressFactor * intensityMult})`;
            ctx.lineWidth = Math.max(1.4, faceW * 0.005);
            ctx.lineCap = 'round';

            const foreheadY1 = faceY - faceH * 0.28;
            const foreheadY2 = faceY - faceH * 0.21;
            const foreheadW = faceW * 0.28;

            ctx.beginPath();
            ctx.moveTo(faceX - foreheadW, foreheadY1);
            ctx.quadraticCurveTo(faceX, foreheadY1 - 2, faceX + foreheadW, foreheadY1);
            ctx.moveTo(faceX - foreheadW * 0.85, foreheadY2);
            ctx.quadraticCurveTo(faceX, foreheadY2 - 2, faceX + foreheadW * 0.85, foreheadY2);
            ctx.stroke();
            ctx.restore();
          }

          // 6. Líneas de marioneta y descolgamiento submandibular
          if (addedYears >= 14) {
            ctx.save();
            ctx.strokeStyle = `rgba(30, 20, 15, ${0.24 * progressFactor * intensityMult})`;
            ctx.lineWidth = Math.max(1.5, faceW * 0.005);
            ctx.lineCap = 'round';

            ctx.beginPath();
            ctx.moveTo(leftMouthX, leftMouthY + 4);
            ctx.lineTo(leftMouthX - faceW * 0.02, leftMouthY + faceH * 0.15);
            ctx.moveTo(rightMouthX, rightMouthY + 4);
            ctx.lineTo(rightMouthX + faceW * 0.02, rightMouthY + faceH * 0.15);
            ctx.stroke();
            ctx.restore();
          }

          // 7. Decoloración capilar / canas fisiológicas en sienes si supera los 38 años
          if ((environmentalExposure || addedYears >= 12) && projectedAge >= 38) {
            ctx.save();
            const hairGlow = ctx.createRadialGradient(faceX, faceY - faceH * 0.45, faceW * 0.2, faceX, faceY - faceH * 0.45, faceW * 0.7);
            hairGlow.addColorStop(0, `rgba(225, 225, 235, ${0.22 * progressFactor})`);
            hairGlow.addColorStop(1, 'rgba(255, 255, 255, 0)');
            ctx.fillStyle = hairGlow;
            ctx.fillRect(faceX - faceW * 0.8, faceY - faceH * 0.8, faceW * 1.6, faceH * 0.8);
            ctx.restore();
          }

          try {
            const dataUrl = canvas.toDataURL('image/png');
            setProjectedDataUrl(dataUrl);
          } catch (secErr) {
            console.warn('Canvas toDataURL SecurityError (tinte de origen), usando fallback visual:', secErr);
            setProjectedDataUrl(imageSrc);
          }
          setRendering(false);
        } catch (err) {
          console.error('Error procesando canvas forense:', err);
          setProjectedDataUrl(imageSrc);
          setRendering(false);
        }
      };

      img.onerror = () => {
        if (useCors) {
          // Reintentar sin crossOrigin si CORS del servidor no respondió
          generateAgingProjection(false);
        } else {
          setImgError(true);
          setProjectedDataUrl(imageSrc);
          setRendering(false);
        }
      };

      img.src = imageSrc;
    };

    generateAgingProjection(true);

    return () => {
      isMounted = false;
    };
  }, [isOpen, imageSrc, addedYears, agingIntensity, environmentalExposure]);

  // Manejo del Split Curtain
  const handleSplitMouseMove = (e) => {
    if (!isDraggingSplit || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const clientX = e.clientX || (e.touches && e.touches[0]?.clientX);
    if (!clientX) return;
    const pos = Math.max(5, Math.min(95, ((clientX - rect.left) / rect.width) * 100));
    setSplitPosition(pos);
  };

  const handleDownload = () => {
    const srcToDownload = projectedDataUrl || imageSrc;
    if (!srcToDownload) return;
    const link = document.createElement('a');
    link.href = srcToDownload;
    link.download = `Proyeccion_Edad_${(caso.nombre_desaparecido || 'Caso').replace(/\s+/g, '_')}_${projectedAge}_anos.png`;
    link.click();
  };

  return (
    <div 
      className="modal-overlay animate-fade-in" 
      style={{ zIndex: 12500, overflowY: 'auto', padding: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onMouseMove={handleSplitMouseMove}
      onTouchMove={handleSplitMouseMove}
      onMouseUp={() => setIsDraggingSplit(false)}
      onTouchEnd={() => setIsDraggingSplit(false)}
    >
      <div 
        className="glass-panel"
        style={{
          maxWidth: '960px',
          width: '100%',
          maxHeight: '94vh',
          display: 'flex',
          flexDirection: 'column',
          background: 'rgba(10, 16, 32, 0.98)',
          border: '1px solid rgba(2, 132, 199, 0.4)',
          boxShadow: '0 25px 70px rgba(0, 0, 0, 0.95), 0 0 35px rgba(2, 132, 199, 0.2)',
          borderRadius: '16px',
          overflow: 'hidden'
        }}
      >
        {/* Encabezado C4I */}
        <div style={{
          padding: '1.1rem 1.5rem',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'linear-gradient(90deg, rgba(15, 23, 42, 0.98) 0%, rgba(2, 132, 199, 0.22) 100%)'
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
              <Clock size={22} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#f8fafc', fontWeight: 800 }}>
                  Proyección Forense de Maduración Facial (IA)
                </h3>
                <span style={{
                  background: 'rgba(16, 185, 129, 0.15)',
                  border: '1px solid #10b981',
                  color: '#34d399',
                  padding: '0.15rem 0.55rem',
                  borderRadius: '9999px',
                  fontSize: '0.68rem',
                  fontWeight: 800
                }}>
                  MOTOR ANATÓMICO
                </span>
              </div>
              <p style={{ margin: '0.15rem 0 0 0', fontSize: '0.8rem', color: '#94a3b8' }}>
                Simulación pericial para <strong>{caso.nombre_desaparecido}</strong> • Estimación a {projectedAge} años (+{addedYears} años)
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {/* Conmutador de Modo de Visualización */}
            <div style={{ display: 'flex', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '8px', padding: '2px', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
              <button
                type="button"
                onClick={() => setViewMode('split')}
                title="Modo Cortina Deslizante"
                style={{
                  padding: '0.35rem 0.6rem',
                  borderRadius: '6px',
                  border: 'none',
                  background: viewMode === 'split' ? '#0284c7' : 'transparent',
                  color: viewMode === 'split' ? '#fff' : '#94a3b8',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.3rem'
                }}
              >
                <SplitSquareVertical size={13} />
                <span>Cortina</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('sideBySide')}
                title="Modo Comparativo Lado a Lado"
                style={{
                  padding: '0.35rem 0.6rem',
                  borderRadius: '6px',
                  border: 'none',
                  background: viewMode === 'sideBySide' ? '#0284c7' : 'transparent',
                  color: viewMode === 'sideBySide' ? '#fff' : '#94a3b8',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.3rem'
                }}
              >
                <Columns size={13} />
                <span>Lado a Lado</span>
              </button>
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
        </div>

        {/* Cuerpo del Visor */}
        <div style={{ padding: '1.25rem 1.5rem', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
          
          {/* MODO 1: CORTINA DESLIZANTE CON CLIP-PATH ROBUSTO */}
          {viewMode === 'split' ? (
            <div style={{
              background: '#020617',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '12px',
              overflow: 'hidden',
              position: 'relative'
            }}>
              <div 
                ref={containerRef}
                style={{
                  position: 'relative',
                  height: '380px',
                  width: '100%',
                  overflow: 'hidden',
                  userSelect: 'none',
                  cursor: 'ew-resize',
                  background: '#060913'
                }}
                onMouseDown={() => setIsDraggingSplit(true)}
                onTouchStart={() => setIsDraggingSplit(true)}
              >
                {/* 1. Capa Fondo: Imagen Original */}
                <img
                  src={imageSrc}
                  alt="Original"
                  style={{
                    position: 'absolute',
                    inset: 0,
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain'
                  }}
                  onError={(e) => {
                    e.target.src = 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=600&q=80';
                  }}
                />

                {/* 2. Capa Superior: Imagen Proyectada con Máscara clipPath */}
                <img
                  src={projectedDataUrl || imageSrc}
                  alt="Proyectada"
                  style={{
                    position: 'absolute',
                    inset: 0,
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain',
                    clipPath: `polygon(${splitPosition}% 0, 100% 0, 100% 100%, ${splitPosition}% 100%)`,
                    filter: (!projectedDataUrl || projectedDataUrl === imageSrc) 
                      ? `contrast(${100 + addedYears * 1.5}%) saturate(${Math.max(60, 100 - addedYears * 1.2)}%) sepia(${addedYears * 1.2}%)` 
                      : 'none'
                  }}
                />

                {/* 3. Barra Divisoria de la Cortina */}
                <div style={{
                  position: 'absolute',
                  top: 0,
                  bottom: 0,
                  left: `${splitPosition}%`,
                  width: '3px',
                  background: '#00f0ff',
                  boxShadow: '0 0 10px #00f0ff',
                  transform: 'translateX(-50%)',
                  zIndex: 10,
                  pointerEvents: 'none'
                }}>
                  <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: '#00f0ff',
                    color: '#020617',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 900,
                    fontSize: '0.85rem',
                    boxShadow: '0 0 15px rgba(0, 240, 255, 0.7)'
                  }}>
                    ↔
                  </div>
                </div>

                {/* Etiquetas Superiores */}
                <div style={{
                  position: 'absolute',
                  top: '12px',
                  left: '12px',
                  background: 'rgba(0, 0, 0, 0.8)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  color: '#fff',
                  padding: '0.25rem 0.65rem',
                  borderRadius: '6px',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  zIndex: 5
                }}>
                  ORIGINAL: {originalAge} AÑOS
                </div>

                <div style={{
                  position: 'absolute',
                  top: '12px',
                  right: '12px',
                  background: 'rgba(2, 132, 199, 0.9)',
                  border: '1px solid #38bdf8',
                  color: '#fff',
                  padding: '0.25rem 0.65rem',
                  borderRadius: '6px',
                  fontSize: '0.75rem',
                  fontWeight: 800,
                  zIndex: 5
                }}>
                  PROYECCIÓN: {projectedAge} AÑOS (+{addedYears} AÑOS)
                </div>

                <div style={{
                  position: 'absolute',
                  bottom: '10px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  background: 'rgba(0, 0, 0, 0.75)',
                  padding: '0.2rem 0.75rem',
                  borderRadius: '20px',
                  fontSize: '0.72rem',
                  color: '#cbd5e1',
                  pointerEvents: 'none',
                  zIndex: 5
                }}>
                  ↔ Arrastra la barra para comparar el avance anatómico
                </div>
              </div>
            </div>
          ) : (
            /* MODO 2: COMPARATIVA LADO A LADO */
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '1rem'
            }}>
              {/* Fotografía Original */}
              <div style={{
                background: '#020617',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '12px',
                padding: '0.75rem',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center'
              }}>
                <div style={{
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  color: '#94a3b8',
                  marginBottom: '0.5rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  width: '100%'
                }}>
                  <span>📷 Fotografía Original</span>
                  <span style={{ color: '#fff' }}>{originalAge} años</span>
                </div>
                <div style={{ width: '100%', height: '330px', position: 'relative', borderRadius: '8px', overflow: 'hidden', background: '#090d16' }}>
                  <img
                    src={imageSrc}
                    alt="Original"
                    style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                    onError={(e) => {
                      e.target.src = 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=600&q=80';
                    }}
                  />
                </div>
              </div>

              {/* Fotografía Proyectada IA */}
              <div style={{
                background: '#020617',
                border: '1px solid rgba(2, 132, 199, 0.4)',
                borderRadius: '12px',
                padding: '0.75rem',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center'
              }}>
                <div style={{
                  fontSize: '0.8rem',
                  fontWeight: 800,
                  color: '#38bdf8',
                  marginBottom: '0.5rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  width: '100%'
                }}>
                  <span>🧬 Proyección Forense IA</span>
                  <span style={{ color: '#38bdf8' }}>{projectedAge} años (+{addedYears}a)</span>
                </div>
                <div style={{ width: '100%', height: '330px', position: 'relative', borderRadius: '8px', overflow: 'hidden', background: '#090d16' }}>
                  <img
                    src={projectedDataUrl || imageSrc}
                    alt="Proyección IA"
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'contain',
                      filter: (!projectedDataUrl || projectedDataUrl === imageSrc) 
                        ? `contrast(${100 + addedYears * 1.5}%) saturate(${Math.max(60, 100 - addedYears * 1.2)}%) sepia(${addedYears * 1.2}%)` 
                        : 'none'
                    }}
                  />
                  {rendering && (
                    <div style={{
                      position: 'absolute',
                      inset: 0,
                      background: 'rgba(2, 6, 23, 0.6)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem',
                      color: '#38bdf8',
                      fontSize: '0.8rem'
                    }}>
                      <RefreshCw size={16} className="spin" />
                      <span>Calculando tejido dérmico...</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Panel de Controles Forenses */}
          <div style={{
            background: 'rgba(15, 23, 42, 0.8)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '12px',
            padding: '1.1rem 1.25rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.9rem'
          }}>
            {/* Control 1: Rango de Años */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.45rem' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#f8fafc' }}>
                  Lapso de Proyección Temporal:
                </span>
                <span style={{
                  background: 'linear-gradient(135deg, #0284c7, #0369a1)',
                  color: '#fff',
                  fontSize: '0.85rem',
                  fontWeight: 800,
                  padding: '0.2rem 0.7rem',
                  borderRadius: '6px'
                }}>
                  +{addedYears} años (Edad proyectada: {projectedAge} años)
                </span>
              </div>

              <input
                type="range"
                min="1"
                max="30"
                step="1"
                value={addedYears}
                onChange={(e) => setAddedYears(parseInt(e.target.value))}
                style={{ width: '100%', accentColor: '#0284c7', cursor: 'pointer' }}
              />

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: '#94a3b8', marginTop: '0.3rem' }}>
                <span>+1 año (Corto Plazo)</span>
                <span>+10 años (Surcos y Microtextura)</span>
                <span>+20 años (Pliegues Profundos)</span>
                <span>+30 años (Adultez Mayor)</span>
              </div>
            </div>

            {/* Control 2: Parámetros Biomecánicos */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '0.85rem',
              paddingTop: '0.75rem',
              borderTop: '1px solid rgba(255, 255, 255, 0.06)'
            }}>
              <div>
                <label style={{ fontSize: '0.76rem', color: '#94a3b8', fontWeight: 600, display: 'block', marginBottom: '0.35rem' }}>
                  Intensidad de Pliegues y Surcos:
                </label>
                <div style={{ display: 'flex', gap: '0.35rem' }}>
                  {['sutil', 'moderado', 'avanzado'].map((lvl) => (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => setAgingIntensity(lvl)}
                      style={{
                        flex: 1,
                        padding: '0.35rem 0.5rem',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        borderRadius: '6px',
                        border: agingIntensity === lvl ? '1px solid #38bdf8' : '1px solid rgba(255, 255, 255, 0.1)',
                        background: agingIntensity === lvl ? 'rgba(56, 189, 248, 0.2)' : 'rgba(255, 255, 255, 0.03)',
                        color: agingIntensity === lvl ? '#38bdf8' : '#94a3b8',
                        cursor: 'pointer',
                        textTransform: 'capitalize'
                      }}
                    >
                      {lvl}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.76rem', color: '#94a3b8', fontWeight: 600, display: 'block', marginBottom: '0.35rem' }}>
                  Factores Ambientales / Intemperie:
                </label>
                <button
                  type="button"
                  onClick={() => setEnvironmentalExposure(!environmentalExposure)}
                  style={{
                    width: '100%',
                    padding: '0.35rem 0.65rem',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    borderRadius: '6px',
                    border: environmentalExposure ? '1px solid #10b981' : '1px solid rgba(255, 255, 255, 0.1)',
                    background: environmentalExposure ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                    color: environmentalExposure ? '#34d399' : '#94a3b8',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.4rem'
                  }}
                >
                  <CheckCircle2 size={13} />
                  <span>{environmentalExposure ? 'Simular Exposición Solar y Desgaste' : 'Sin Exposición Ambiental'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Pie del Modal */}
        <div style={{
          padding: '0.9rem 1.5rem',
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '0.75rem',
          background: 'rgba(15, 23, 42, 0.95)'
        }}>
          <div style={{ display: 'flex', gap: '0.6rem' }}>
            <button
              onClick={handleDownload}
              className="btn btn-secondary"
              style={{
                fontSize: '0.82rem',
                padding: '0.45rem 0.95rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                borderColor: 'rgba(56, 189, 248, 0.4)',
                color: '#38bdf8'
              }}
            >
              <Download size={14} />
              <span>Descargar Proyección (.PNG)</span>
            </button>

            <button
              onClick={() => window.print()}
              className="btn btn-secondary"
              style={{ fontSize: '0.82rem', padding: '0.45rem 0.85rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
            >
              <Printer size={14} />
              <span>Imprimir Ficha</span>
            </button>
          </div>

          <button
            onClick={onClose}
            className="btn btn-primary"
            style={{ fontSize: '0.82rem', padding: '0.45rem 1.35rem', background: 'linear-gradient(135deg, #0284c7, #0369a1)', fontWeight: 700 }}
          >
            Cerrar Visor
          </button>
        </div>
      </div>
    </div>
  );
};

export default AgeProgressionModal;
