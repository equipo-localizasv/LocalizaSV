import React, { useState, useRef } from 'react';
import api from '../services/api';

const ReportSightingModal = ({ isOpen, onClose, initialCaseId, cases = [], onSuccess }) => {
  const fileInputRef = useRef(null);
  const [selectedCaseId, setSelectedCaseId] = useState(initialCaseId || (cases[0]?.id || ''));
  const [foto, setFoto] = useState(null);
  const [fotoPreview, setFotoPreview] = useState('');
  const [ubicacionTexto, setUbicacionTexto] = useState('');
  const [ubicacionLat, setUbicacionLat] = useState('');
  const [ubicacionLng, setUbicacionLng] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [informanteNombre, setInformanteNombre] = useState('');
  const [informanteTelefono, setInformanteTelefono] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [geoLoading, setGeoLoading] = useState(false);

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
      setError('Por favor adjunta una fotografía o evidencia del avistamiento.');
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
                Envía una foto de evidencia para alertar a moderadores y rescatistas
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
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

          {/* Subida de foto de evidencia */}
          <div className="form-group" style={{ marginBottom: '1.25rem' }}>
            <label className="form-label" style={{ fontWeight: 600 }}>
              Fotografía de Evidencia <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <div
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: '2px dashed rgba(14, 165, 233, 0.5)',
                borderRadius: '8px',
                padding: '1.5rem',
                textAlign: 'center',
                cursor: 'pointer',
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
                      maxHeight: '180px',
                      borderRadius: '6px',
                      objectFit: 'contain',
                      marginBottom: '0.75rem'
                    }}
                  />
                  <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--primary)' }}>
                    ✓ Imagen seleccionada: {foto.name} (Clic para cambiar)
                  </p>
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
