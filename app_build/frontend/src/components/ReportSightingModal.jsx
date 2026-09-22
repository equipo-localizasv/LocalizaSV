import React, { useState, useRef } from 'react';
import api from '../services/api';

const ReportSightingModal = ({ isOpen, onClose, initialCaseId, cases = [], onSuccess }) => {
  const fileInputRef = useRef(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const [selectedCaseId, setSelectedCaseId] = useState(initialCaseId || (cases[0]?.id || ''));
  const [foto, setFoto] = useState(null);
  const [fotoPreview, setFotoPreview] = useState('');
  const [photoSourceMode, setPhotoSourceMode] = useState('upload'); // 'upload' | 'camera'
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraLoading, setCameraLoading] = useState(false);
  const [ubicacionTexto, setUbicacionTexto] = useState('');
  const [ubicacionLat, setUbicacionLat] = useState('');
  const [ubicacionLng, setUbicacionLng] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [informanteNombre, setInformanteNombre] = useState('');
  const [informanteTelefono, setInformanteTelefono] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [geoLoading, setGeoLoading] = useState(false);

  // Detener cámara al desmontar o cerrar
  const stopLiveCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
    setCameraLoading(false);
  };

  const startLiveCamera = async () => {
    setError('');
    setCameraLoading(true);
    try {
      if (streamRef.current) {
        stopLiveCamera();
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      });
      streamRef.current = stream;
      setIsCameraActive(true);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error('Error accediendo a cámara:', err);
      setError('No se pudo acceder a la cámara del dispositivo. Permita los permisos del navegador o use la opción de subir archivo.');
    } finally {
      setCameraLoading(false);
    }
  };

  const handleCaptureSnapshot = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob((blob) => {
      if (!blob) {
        setError('Error al generar captura fotográfica.');
        return;
      }
      const fileName = `avistamiento_cam_${Date.now()}.jpg`;
      const capturedFile = new File([blob], fileName, { type: 'image/jpeg' });
      setFoto(capturedFile);
      setFotoPreview(URL.createObjectURL(blob));
      stopLiveCamera();
    }, 'image/jpeg', 0.92);
  };

  const handleCloseModal = () => {
    stopLiveCamera();
    onClose();
  };

  if (!isOpen) return null;

  const handleFileChange = (e) => {
    setError('');
    const file = e.target.files[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setError('El archivo debe ser una imagen válida (JPG, PNG, WebP).');
        return;
      }
      setFoto(file);
      setFotoPreview(URL.createObjectURL(file));
      stopLiveCamera();
    }
  };

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError('Tu navegador no soporta geolocalización GPS.');
      return;
    }
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUbicacionLat(position.coords.latitude.toFixed(6));
        setUbicacionLng(position.coords.longitude.toFixed(6));
        if (!ubicacionTexto) {
          setUbicacionTexto('Ubicación captada por GPS móvil');
        }
        setGeoLoading(false);
      },
      (err) => {
        console.warn('Error GPS:', err);
        setError('No se pudo obtener la ubicación GPS automática. Por favor ingresa la dirección manualmente.');
        setGeoLoading(false);
      }
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const targetCaseId = initialCaseId || selectedCaseId;
    if (!targetCaseId) {
      setError('Por favor selecciona la persona que has visto.');
      return;
    }

    if (!foto) {
      setError('Por favor toma una foto o adjunta una evidencia fotográfica del avistamiento.');
      return;
    }

    if (!ubicacionTexto.trim()) {
      setError('Por favor indica el lugar o dirección donde viste a la persona.');
      return;
    }

    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('caso_id', String(targetCaseId));
      formData.append('foto', foto);
      formData.append('ubicacion_texto', ubicacionTexto.trim());
      if (ubicacionLat) formData.append('ubicacion_lat', String(ubicacionLat));
      if (ubicacionLng) formData.append('ubicacion_lng', String(ubicacionLng));
      if (descripcion) formData.append('descripcion', descripcion.trim());
      if (informanteNombre) formData.append('informante_nombre', informanteNombre.trim());
      if (informanteTelefono) formData.append('informante_telefono', informanteTelefono.trim());

      const response = await api.post('/avistamientos', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      stopLiveCamera();

      if (onSuccess) {
        onSuccess(response.data.alerta || response.data);
      }

      onClose();
    } catch (err) {
      console.error('Error enviando avistamiento:', err);
      setError(err.response?.data?.error || 'No se pudo enviar el reporte de avistamiento.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(3, 7, 18, 0.85)',
        backdropFilter: 'blur(8px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
        overflowY: 'auto'
      }}
    >
      <div
        className="glass-panel animate-fade-in"
        style={{
          width: '100%',
          maxWidth: '560px',
          maxHeight: '90vh',
          overflowY: 'auto',
          padding: '2rem',
          border: '1px solid rgba(14, 165, 233, 0.4)',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.7)'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <span style={{ fontSize: '1.75rem' }}>📸</span>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.3rem', color: '#f8fafc' }}>
                Reportar Avistamiento Ciudadano
              </h3>
              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Envía una foto de evidencia que se incorporará al <strong>Expediente Forense</strong> del caso
              </p>
            </div>
          </div>
          <button
            onClick={handleCloseModal}
            style={{
              background: 'none',
              border: 'none',
              color: '#94a3b8',
              fontSize: '1.5rem',
              cursor: 'pointer',
              padding: '0.2rem'
            }}
          >
            ✕
          </button>
        </div>

        {error && (
          <div className="auth-error" style={{ marginBottom: '1.25rem' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Selección del caso si no está predefinido */}
          {!initialCaseId && cases.length > 0 && (
            <div className="form-group" style={{ marginBottom: '1.25rem' }}>
              <label className="form-label" style={{ fontWeight: 600 }}>¿A quién viste?</label>
              <select
                className="form-control"
                value={selectedCaseId}
                onChange={(e) => setSelectedCaseId(e.target.value)}
                required
              >
                {cases.map((c) => (
                  <option key={c.id} value={c.id}>
                    Caso #{c.id}: {c.nombre_desaparecido} (Visto en: {c.ubicacion_desaparicion})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Selector de Método de Evidencia: Galería vs Cámara en Vivo */}
          <div className="form-group" style={{ marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <label className="form-label" style={{ fontWeight: 600, margin: 0 }}>
                Fotografía de Evidencia <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <div style={{ display: 'flex', gap: '0.35rem', background: 'rgba(255,255,255,0.06)', padding: '2px', borderRadius: '6px' }}>
                <button
                  type="button"
                  onClick={() => {
                    setPhotoSourceMode('upload');
                    stopLiveCamera();
                  }}
                  style={{
                    background: photoSourceMode === 'upload' ? '#0ea5e9' : 'transparent',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '4px',
                    padding: '0.25rem 0.6rem',
                    fontSize: '0.75rem',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  📁 Subir Archivo
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPhotoSourceMode('camera');
                    startLiveCamera();
                  }}
                  style={{
                    background: photoSourceMode === 'camera' ? '#0ea5e9' : 'transparent',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '4px',
                    padding: '0.25rem 0.6rem',
                    fontSize: '0.75rem',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  📸 Tomar Foto en Vivo
                </button>
              </div>
            </div>

            {/* MODO CÁMARA EN VIVO */}
            {photoSourceMode === 'camera' && !fotoPreview && (
              <div style={{
                background: '#020617',
                border: '2px solid rgba(0, 240, 255, 0.4)',
                borderRadius: '10px',
                overflow: 'hidden',
                position: 'relative',
                textAlign: 'center',
                padding: isCameraActive ? '0' : '1.5rem'
              }}>
                {isCameraActive ? (
                  <div style={{ position: 'relative', width: '100%', minHeight: '260px', background: '#000' }}>
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      style={{ width: '100%', maxHeight: '320px', objectFit: 'cover', display: 'block' }}
                    />
                    {/* Retícula HUD */}
                    <div style={{
                      position: 'absolute',
                      inset: '20px',
                      border: '1px dashed rgba(0, 240, 255, 0.6)',
                      borderRadius: '8px',
                      pointerEvents: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <span style={{ color: 'rgba(0, 240, 255, 0.8)', fontSize: '0.72rem', background: 'rgba(0,0,0,0.6)', padding: '2px 8px', borderRadius: '4px' }}>
                        Encuadre el rostro o persona
                      </span>
                    </div>

                    {/* Botones de control sobre el video */}
                    <div style={{
                      position: 'absolute',
                      bottom: '12px',
                      left: 0,
                      right: 0,
                      display: 'flex',
                      justifyContent: 'center',
                      gap: '0.75rem'
                    }}>
                      <button
                        type="button"
                        onClick={handleCaptureSnapshot}
                        className="btn btn-primary"
                        style={{
                          background: 'linear-gradient(135deg, #00f0ff, #0284c7)',
                          color: '#020617',
                          fontWeight: '800',
                          padding: '0.5rem 1.25rem',
                          borderRadius: '25px',
                          boxShadow: '0 0 15px rgba(0, 240, 255, 0.6)'
                        }}
                      >
                        📸 Disparar Captura
                      </button>
                      <button
                        type="button"
                        onClick={stopLiveCamera}
                        className="btn btn-secondary"
                        style={{ padding: '0.5rem 0.9rem', fontSize: '0.75rem', borderRadius: '20px' }}
                      >
                        ✕ Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <span style={{ fontSize: '2.5rem', display: 'block', marginBottom: '0.5rem' }}>📷</span>
                    <p style={{ margin: '0 0 0.5rem 0', color: '#f8fafc', fontWeight: '600' }}>
                      Captura directa desde la cámara de tu teléfono o laptop
                    </p>
                    <button
                      type="button"
                      onClick={startLiveCamera}
                      disabled={cameraLoading}
                      className="btn btn-primary"
                      style={{ padding: '0.5rem 1.25rem', fontWeight: '700' }}
                    >
                      {cameraLoading ? 'Activando cámara...' : '⚡ Iniciar Cámara del Dispositivo'}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* MODO ARCHIVO / PREVIEW DE CAPTURA */}
            {(photoSourceMode === 'upload' || fotoPreview) && (
              <div
                onClick={() => {
                  if (!fotoPreview) fileInputRef.current?.click();
                }}
                style={{
                  border: fotoPreview ? '2px solid rgba(16, 185, 129, 0.5)' : '2px dashed rgba(14, 165, 233, 0.5)',
                  borderRadius: '10px',
                  padding: '1.5rem',
                  textAlign: 'center',
                  cursor: fotoPreview ? 'default' : 'pointer',
                  background: 'rgba(15, 23, 42, 0.6)',
                  transition: 'all 0.2s ease'
                }}
              >
                {fotoPreview ? (
                  <div>
                    <img
                      src={fotoPreview}
                      alt="Evidencia"
                      style={{
                        maxHeight: '200px',
                        borderRadius: '8px',
                        objectFit: 'contain',
                        marginBottom: '0.75rem',
                        boxShadow: '0 4px 15px rgba(0,0,0,0.5)'
                      }}
                    />
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.8rem', color: '#10b981', fontWeight: '700' }}>
                        ✓ Evidencia Lista ({foto?.name || 'Captura en vivo'})
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setFoto(null);
                          setFotoPreview('');
                          if (photoSourceMode === 'camera') {
                            startLiveCamera();
                          }
                        }}
                        className="btn btn-secondary"
                        style={{ padding: '0.2rem 0.6rem', fontSize: '0.72rem' }}
                      >
                        🔄 Tomar o Elegir Otra
                      </button>
                    </div>
                    <div style={{ marginTop: '0.4rem', fontSize: '0.72rem', color: '#38bdf8' }}>
                      🔬 Se cotejará automáticamente con InsightFace ArcFace y se añadirá al Expediente Forense.
                    </div>
                  </div>
                ) : (
                  <div>
                    <span style={{ fontSize: '2.5rem', display: 'block', marginBottom: '0.5rem' }}>📷</span>
                    <p style={{ margin: '0 0 0.25rem 0', fontWeight: 600, color: '#f8fafc' }}>
                      Toca para subir foto desde tu galería o cámara
                    </p>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      Formatos JPG, PNG, WEBP hasta 5MB
                    </span>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  style={{ display: 'none' }}
                />
              </div>
            )}
          </div>

          {/* Ubicación y coordenadas */}
          <div className="form-group" style={{ marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
              <label className="form-label" style={{ margin: 0, fontWeight: 600 }}>
                Lugar o Dirección donde lo viste <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <button
                type="button"
                onClick={handleGetCurrentLocation}
                disabled={geoLoading}
                className="btn btn-secondary"
                style={{ padding: '0.2rem 0.6rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
              >
                <span>📍</span>
                <span>{geoLoading ? 'Obteniendo GPS...' : 'Usar mi GPS actual'}</span>
              </button>
            </div>
            <input
              type="text"
              className="form-control"
              placeholder="Ej. Parada de autobuses frente a Metrocentro, 4ta calle poniente"
              value={ubicacionTexto}
              onChange={(e) => setUbicacionTexto(e.target.value)}
              required
            />
            {ubicacionLat && ubicacionLng && (
              <span style={{ fontSize: '0.75rem', color: '#10b981', display: 'block', marginTop: '0.3rem' }}>
                ✓ Coordenadas GPS fijadas: {ubicacionLat}, {ubicacionLng}
              </span>
            )}
          </div>

          {/* Descripción / Detalles */}
          <div className="form-group" style={{ marginBottom: '1.25rem' }}>
            <label className="form-label" style={{ fontWeight: 600 }}>Detalles del Avistamiento</label>
            <textarea
              className="form-control"
              rows="3"
              placeholder="¿Qué ropa vestía? ¿Hacia dónde se dirigía? ¿Iba acompañado(a)?"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
            />
          </div>

          {/* Contacto opcional */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.5rem' }}>
            <div>
              <label className="form-label" style={{ fontSize: '0.85rem' }}>Tu Nombre (Opcional)</label>
              <input
                type="text"
                className="form-control"
                placeholder="Nombre o anónimo"
                value={informanteNombre}
                onChange={(e) => setInformanteNombre(e.target.value)}
              />
            </div>
            <div>
              <label className="form-label" style={{ fontSize: '0.85rem' }}>Tu Teléfono (Opcional)</label>
              <input
                type="text"
                className="form-control"
                placeholder="Para contacto de autoridades"
                value={informanteTelefono}
                onChange={(e) => setInformanteTelefono(e.target.value)}
              />
            </div>
          </div>

          {/* Botones de acción */}
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary"
              disabled={loading}
              style={{ padding: '0.6rem 1.25rem' }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
              style={{
                padding: '0.6rem 1.5rem',
                fontWeight: 700,
                background: 'linear-gradient(135deg, #0ea5e9, #0284c7)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
            >
              {loading ? (
                <>
                  <div style={{ border: '2px solid #fff', borderTop: '2px solid transparent', borderRadius: '50%', width: '16px', height: '16px', animation: 'spin 1s linear infinite' }} />
                  <span>Enviando evidencia...</span>
                </>
              ) : (
                <>
                  <span>🚀</span>
                  <span>Enviar Reporte de Avistamiento</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ReportSightingModal;
