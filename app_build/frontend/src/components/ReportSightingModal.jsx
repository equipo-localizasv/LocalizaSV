import React, { useState, useRef } from 'react';
import { Camera, MapPin, Navigation, User, Phone, Shield, X, AlertCircle, CheckCircle, Upload, Crosshair } from 'lucide-react';
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
    <div className="modal-overlay animate-fade-in" style={{ zIndex: 12000, overflowY: 'auto', padding: '1.5rem 1rem' }}>
      <div
        className="glass-panel"
        style={{
          width: '100%',
          maxWidth: '620px',
          maxHeight: '92vh',
          overflowY: 'auto',
          background: 'rgba(10, 16, 32, 0.98)',
          border: '1px solid rgba(2, 132, 199, 0.35)',
          borderRadius: '16px',
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.9), 0 0 25px rgba(2, 132, 199, 0.15)',
          display: 'flex',
          flexDirection: 'column',
          margin: 'auto'
        }}
      >
        {/* Header Modal */}
        <div style={{
          padding: '1.25rem 1.75rem',
          background: 'linear-gradient(90deg, rgba(15, 23, 42, 0.98) 0%, rgba(2, 132, 199, 0.18) 100%)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
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
              <Camera size={22} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#f8fafc', fontWeight: 800 }}>
                  Aportar Pista o Avistamiento
                </h3>
                <span style={{
                  background: 'rgba(16, 185, 129, 0.15)',
                  border: '1px solid #10b981',
                  color: '#34d399',
                  padding: '0.15rem 0.55rem',
                  borderRadius: '9999px',
                  fontSize: '0.7rem',
                  fontWeight: 700
                }}>
                  COLABORACIÓN
                </span>
              </div>
              <p style={{ margin: '0.15rem 0 0 0', fontSize: '0.8rem', color: '#94a3b8' }}>
                Tu evidencia fotográfica y ubicación se integrarán al Expediente Oficial del caso
              </p>
            </div>
          </div>
          <button
            onClick={handleCloseModal}
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

        {/* Form Body */}
        <div style={{ padding: '1.5rem 1.75rem', overflowY: 'auto', flex: 1 }}>
          {error && (
            <div style={{
              background: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid #ef4444',
              color: '#fca5a5',
              padding: '0.85rem 1rem',
              borderRadius: '8px',
              fontSize: '0.85rem',
              marginBottom: '1.25rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Selección del caso si no está predefinido */}
            {!initialCaseId && cases.length > 0 && (
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontWeight: 600, fontSize: '0.85rem' }}>
                  ¿A qué persona desaparecida viste? <span style={{ color: '#ef4444' }}>*</span>
                </label>
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
            <div className="form-group" style={{ marginBottom: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem' }}>
                <label className="form-label" style={{ fontWeight: 600, fontSize: '0.85rem', margin: 0 }}>
                  Fotografía de Evidencia <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <div style={{ display: 'flex', gap: '0.35rem', background: 'rgba(255,255,255,0.06)', padding: '3px', borderRadius: '8px' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setPhotoSourceMode('upload');
                      stopLiveCamera();
                    }}
                    style={{
                      background: photoSourceMode === 'upload' ? '#0284c7' : 'transparent',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '0.3rem 0.75rem',
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem'
                    }}
                  >
                    <Upload size={13} />
                    <span>Subir Foto</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPhotoSourceMode('camera');
                      startLiveCamera();
                    }}
                    style={{
                      background: photoSourceMode === 'camera' ? '#0284c7' : 'transparent',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '0.3rem 0.75rem',
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem'
                    }}
                  >
                    <Camera size={13} />
                    <span>Cámara en Vivo</span>
                  </button>
                </div>
              </div>

              {/* MODO CÁMARA EN VIVO */}
              {photoSourceMode === 'camera' && !fotoPreview && (
                <div style={{
                  background: '#020617',
                  border: '2px solid rgba(2, 132, 199, 0.4)',
                  borderRadius: '12px',
                  overflow: 'hidden',
                  position: 'relative',
                  textAlign: 'center',
                  padding: isCameraActive ? '0' : '2rem 1.5rem'
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
                      {/* Retícula de Enfoque */}
                      <div style={{
                        position: 'absolute',
                        inset: '20px',
                        border: '2px dashed rgba(2, 132, 199, 0.6)',
                        borderRadius: '8px',
                        pointerEvents: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#38bdf8', fontSize: '0.75rem', background: 'rgba(0,0,0,0.65)', padding: '3px 10px', borderRadius: '4px' }}>
                          <Crosshair size={14} />
                          <span>Encuadra el rostro de la persona</span>
                        </div>
                      </div>

                      {/* Botones de control sobre el video */}
                      <div style={{
                        position: 'absolute',
                        bottom: '14px',
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
                            background: 'linear-gradient(135deg, #0284c7, #0369a1)',
                            color: '#fff',
                            fontWeight: 700,
                            padding: '0.55rem 1.5rem',
                            borderRadius: '9999px',
                            boxShadow: '0 0 20px rgba(2, 132, 199, 0.6)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.4rem'
                          }}
                        >
                          <Camera size={16} />
                          <span>Capturar Foto</span>
                        </button>
                        <button
                          type="button"
                          onClick={stopLiveCamera}
                          className="btn btn-secondary"
                          style={{ padding: '0.55rem 1rem', fontSize: '0.78rem', borderRadius: '9999px' }}
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div style={{
                        width: '52px',
                        height: '52px',
                        borderRadius: '12px',
                        background: 'rgba(2, 132, 199, 0.12)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 1rem auto',
                        color: '#38bdf8'
                      }}>
                        <Camera size={26} />
                      </div>
                      <p style={{ margin: '0 0 0.5rem 0', color: '#f8fafc', fontWeight: 600, fontSize: '0.92rem' }}>
                        Captura directa desde la cámara de tu teléfono o computadora
                      </p>
                      <button
                        type="button"
                        onClick={startLiveCamera}
                        disabled={cameraLoading}
                        className="btn btn-primary"
                        style={{ padding: '0.55rem 1.35rem', fontWeight: 700, background: 'linear-gradient(135deg, #0284c7, #0369a1)' }}
                      >
                        {cameraLoading ? 'Activando cámara...' : 'Activar Cámara del Dispositivo'}
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
                    border: fotoPreview ? '2px solid rgba(16, 185, 129, 0.5)' : '2px dashed rgba(2, 132, 199, 0.4)',
                    borderRadius: '12px',
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
                          maxHeight: '210px',
                          borderRadius: '8px',
                          objectFit: 'contain',
                          marginBottom: '0.85rem',
                          boxShadow: '0 4px 20px rgba(0,0,0,0.6)'
                        }}
                      />
                      <div style={{ display: 'flex', justifyContent: 'center', gap: '0.6rem', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.82rem', color: '#10b981', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <CheckCircle size={15} />
                          <span>Evidencia Lista ({foto?.name || 'Captura en vivo'})</span>
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
                          style={{ padding: '0.25rem 0.65rem', fontSize: '0.74rem' }}
                        >
                          Cambiar Foto
                        </button>
                      </div>
                      <div style={{ marginTop: '0.5rem', fontSize: '0.74rem', color: '#94a3b8' }}>
                        Se procesará automáticamente con cotejo facial InsightFace y se añadirá a la línea de tiempo.
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div style={{
                        width: '52px',
                        height: '52px',
                        borderRadius: '12px',
                        background: 'rgba(2, 132, 199, 0.12)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 0.85rem auto',
                        color: '#38bdf8'
                      }}>
                        <Upload size={26} />
                      </div>
                      <p style={{ margin: '0 0 0.25rem 0', fontWeight: 700, color: '#f8fafc', fontSize: '0.92rem' }}>
                        Toca para subir foto desde tu galería o archivos
                      </p>
                      <span style={{ fontSize: '0.76rem', color: '#94a3b8' }}>
                        Formatos JPG, PNG, WebP hasta 5MB
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
            <div className="form-group" style={{ marginBottom: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <label className="form-label" style={{ margin: 0, fontWeight: 600, fontSize: '0.85rem' }}>
                  Lugar o Dirección donde lo viste <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <button
                  type="button"
                  onClick={handleGetCurrentLocation}
                  disabled={geoLoading}
                  className="btn btn-secondary"
                  style={{ padding: '0.25rem 0.65rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                >
                  <Navigation size={13} color="#38bdf8" />
                  <span>{geoLoading ? 'Obteniendo GPS...' : 'Usar mi GPS actual'}</span>
                </button>
              </div>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  className="form-control"
                  style={{ paddingLeft: '2.4rem' }}
                  placeholder="Ej. Parada de buses frente a Metrocentro, 4ta calle poniente"
                  value={ubicacionTexto}
                  onChange={(e) => setUbicacionTexto(e.target.value)}
                  required
                />
                <MapPin size={17} style={{ position: 'absolute', left: '0.8rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              </div>
              {ubicacionLat && ubicacionLng && (
                <span style={{ fontSize: '0.74rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: '0.3rem', marginTop: '0.35rem' }}>
                  <CheckCircle size={13} />
                  <span>Coordenadas GPS fijadas: {ubicacionLat}, {ubicacionLng}</span>
                </span>
              )}
            </div>

            {/* Descripción / Detalles */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontWeight: 600, fontSize: '0.85rem' }}>
                Detalles del Avistamiento
              </label>
              <textarea
                className="form-control"
                rows="3"
                placeholder="¿Qué ropa vestía? ¿Hacia dónde se dirigía? ¿Iba acompañado(a)? Cualquier detalle es vital..."
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
              />
            </div>

            {/* Contacto opcional */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.85rem' }}>
              <div>
                <label className="form-label" style={{ fontSize: '0.82rem' }}>Tu Nombre (Opcional)</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    className="form-control"
                    style={{ paddingLeft: '2.3rem' }}
                    placeholder="Nombre o Anónimo"
                    value={informanteNombre}
                    onChange={(e) => setInformanteNombre(e.target.value)}
                  />
                  <User size={15} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                </div>
              </div>

              <div>
                <label className="form-label" style={{ fontSize: '0.82rem' }}>Tu Teléfono (Opcional)</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    className="form-control"
                    style={{ paddingLeft: '2.3rem' }}
                    placeholder="7000-0000"
                    value={informanteTelefono}
                    onChange={(e) => setInformanteTelefono(e.target.value)}
                  />
                  <Phone size={15} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                </div>
              </div>
            </div>

            {/* Botones de acción */}
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '1.25rem' }}>
              <button
                type="button"
                onClick={handleCloseModal}
                className="btn btn-secondary"
                disabled={loading}
                style={{ padding: '0.55rem 1.25rem', fontSize: '0.88rem' }}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading}
                style={{
                  padding: '0.55rem 1.5rem',
                  fontWeight: 700,
                  fontSize: '0.88rem',
                  background: 'linear-gradient(135deg, #0284c7, #0369a1)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
              >
                {loading ? (
                  <>
                    <div style={{ border: '2px solid rgba(255,255,255,0.3)', borderTop: '2px solid #fff', borderRadius: '50%', width: '16px', height: '16px', animation: 'spin 0.8s linear infinite' }} />
                    <span>Enviando evidencia...</span>
                  </>
                ) : (
                  <>
                    <Shield size={16} />
                    <span>Enviar Reporte a la Autoridad</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ReportSightingModal;
