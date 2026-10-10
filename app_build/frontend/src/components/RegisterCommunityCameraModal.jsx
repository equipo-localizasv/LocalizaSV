import React, { useState } from 'react';
import { Camera, Shield, MapPin, Video, CheckCircle, AlertCircle, Phone, User, Info, X } from 'lucide-react';
import api from '../services/api';

const DEPARTAMENTOS_SV = [
  'San Salvador',
  'La Libertad',
  'Santa Ana',
  'San Miguel',
  'Sonsonate',
  'Ahuachapán',
  'Usulután',
  'La Paz',
  'Chalatenango',
  'Cuscatlán',
  'Morazán',
  'San Vicente',
  'Cabañas',
  'La Unión'
];

const RegisterCommunityCameraModal = ({ isOpen, onClose, user, onSuccess }) => {
  const [nombre, setNombre] = useState('');
  const [tipo, setTipo] = useState('Cámara Residencial / Hogar');
  const [departamento, setDepartamento] = useState('San Salvador');
  const [ubicacion, setUbicacion] = useState('');
  const [ipAddress, setIpAddress] = useState('');
  const [streamUrl, setStreamUrl] = useState('');
  const [propietarioNombre, setPropietarioNombre] = useState(user?.nombre || '');
  const [propietarioTelefono, setPropietarioTelefono] = useState(user?.telefono || '');
  const [propietarioDui, setPropietarioDui] = useState(user?.dui || '');
  const [descripcion, setDescripcion] = useState('');
  const [consentimiento, setConsentimiento] = useState(false);
  const [resolucion, setResolucion] = useState('1080p FHD');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (!nombre.trim()) {
      setError('Por favor ingrese un nombre o referencia para identificar la cámara.');
      return;
    }

    if (!ubicacion.trim()) {
      setError('Por favor ingrese la dirección o ubicación física donde está instalada.');
      return;
    }

    const cleanTarget = (ipAddress || streamUrl).trim();
    if (!cleanTarget) {
      setError('Por favor ingrese la dirección IP local (ej. 192.168.1.50:8080) o URL de stream de la cámara.');
      return;
    }

    if (!consentimiento) {
      setError('Debe aceptar el consentimiento de colaboración para integrar la cámara a la red de búsqueda.');
      return;
    }

    setLoading(true);

    try {
      const payload = {
        nombre: nombre.trim(),
        ubicacion: `${ubicacion.trim()}, ${departamento}`,
        departamento,
        ip_address: cleanTarget,
        stream_url: streamUrl.trim() || undefined,
        tipo,
        resolucion,
        fps: 30,
        es_comunitaria: true,
        propietario_nombre: propietarioNombre.trim() || user?.nombre || 'Ciudadano Registrado',
        propietario_telefono: propietarioTelefono.trim() || user?.telefono || '',
        propietario_dui: propietarioDui.trim() || user?.dui || '',
        descripcion: descripcion.trim() || 'Cámara privada registrada voluntariamente por ciudadano colaborador'
      };

      const res = await api.post('/camaras', payload);

      setSuccessMsg('¡Cámara comunitaria registrada exitosamente! El centro de monitoreo ahora puede acceder al feed para búsquedas de personas.');

      if (onSuccess) {
        onSuccess(res.data.camara || res.data);
      }

      setTimeout(() => {
        onClose();
        setSuccessMsg('');
      }, 1600);
    } catch (err) {
      console.error('Error al registrar cámara comunitaria:', err);
      setError(err.response?.data?.error || 'Error al conectar la cámara comunitaria. Verifique la IP o URL ingresada.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay animate-fade-in" style={{ zIndex: 12000, overflowY: 'auto', padding: '1.5rem 1rem' }}>
      <div
        className="glass-panel"
        style={{
          maxWidth: '720px',
          width: '100%',
          background: 'rgba(10, 16, 32, 0.98)',
          border: '1px solid rgba(2, 132, 199, 0.35)',
          borderRadius: '16px',
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.85), 0 0 25px rgba(2, 132, 199, 0.15)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.9rem' }}>
            <div style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#f8fafc', fontWeight: 800 }}>
                  Registrar Cámara de Mi Propiedad
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
                  Red Colaborativa
                </span>
              </div>
              <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.8rem', color: '#94a3b8' }}>
                Conecta tu cámara residencial o de negocio para apoyar en búsquedas en tiempo real.
              </p>
            </div>
          </div>
          <button
            type="button"
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

        {/* Info Banner */}
        <div style={{
          padding: '0.85rem 1.75rem',
          background: 'rgba(2, 132, 199, 0.08)',
          borderBottom: '1px solid rgba(2, 132, 199, 0.2)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          fontSize: '0.82rem',
          color: '#cbd5e1'
        }}>
          <Info size={18} color="#38bdf8" style={{ flexShrink: 0 }} />
          <span>
            Los operadores del centro de monitoreo podrán visualizar tu feed para <strong>contrastar avistamientos</strong> y activar el escáner biométrico facial cuando haya un reporte de desaparición cercano.
          </span>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ padding: '1.5rem 1.75rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {error && (
            <div style={{
              background: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid #ef4444',
              borderRadius: '8px',
              padding: '0.75rem 1rem',
              color: '#fca5a5',
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div style={{
              background: 'rgba(16, 185, 129, 0.12)',
              border: '1px solid #10b981',
              borderRadius: '8px',
              padding: '0.75rem 1rem',
              color: '#6ee7b7',
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <CheckCircle size={18} />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Fila 1: Nombre y Tipo */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontWeight: 600, fontSize: '0.85rem' }}>
                Nombre / Identificador de la Cámara <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="text"
                className="form-control"
                placeholder="Ej. Cámara Residencial Portón Principal"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontWeight: 600, fontSize: '0.85rem' }}>
                Tipo de Entorno / Instalación
              </label>
              <select
                className="form-control"
                value={tipo}
                onChange={(e) => setTipo(e.target.value)}
                disabled={loading}
              >
                <option value="Cámara Residencial / Hogar">🏠 Cámara Residencial / Hogar</option>
                <option value="Cámara Comercial / Negocio">🏪 Comercio / Tienda / Negocio</option>
                <option value="Cámara Vecinal Comunitaria">🏘️ Pasaje / Colonia Comunitaria</option>
                <option value="Cámara IP Celular / Móvil">📱 Teléfono IP Webcam (Móvil)</option>
              </select>
            </div>
          </div>

          {/* Fila 2: Ubicación y Departamento */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontWeight: 600, fontSize: '0.85rem' }}>
                Dirección / Ubicación Física <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  className="form-control"
                  style={{ paddingLeft: '2.4rem' }}
                  placeholder="Ej. Colonia Escalón, Pasaje 3 #42"
                  value={ubicacion}
                  onChange={(e) => setUbicacion(e.target.value)}
                  required
                  disabled={loading}
                />
                <MapPin size={17} style={{ position: 'absolute', left: '0.8rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontWeight: 600, fontSize: '0.85rem' }}>
                Departamento
              </label>
              <select
                className="form-control"
                value={departamento}
                onChange={(e) => setDepartamento(e.target.value)}
                disabled={loading}
              >
                {DEPARTAMENTOS_SV.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Fila 3: IP o Stream */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontWeight: 600, fontSize: '0.85rem' }}>
                Dirección IP Local o IP Webcam <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  className="form-control"
                  style={{ paddingLeft: '2.4rem', fontFamily: 'monospace' }}
                  placeholder="Ej. 192.168.1.120:8080"
                  value={ipAddress}
                  onChange={(e) => setIpAddress(e.target.value)}
                  required
                  disabled={loading}
                />
                <Video size={17} style={{ position: 'absolute', left: '0.8rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              </div>
              <small style={{ color: '#94a3b8', fontSize: '0.74rem', marginTop: '4px', display: 'block' }}>
                Puedes usar la app gratuita "IP Webcam" en Android/iOS o la IP local de tu cámara Wi-Fi.
              </small>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontWeight: 600, fontSize: '0.85rem' }}>
                Calidad de Transmisión Estimada
              </label>
              <select
                className="form-control"
                value={resolucion}
                onChange={(e) => setResolucion(e.target.value)}
                disabled={loading}
              >
                <option value="1080p FHD">1080p Full HD (Recomendado)</option>
                <option value="720p HD">720p HD (Conexión Estándar)</option>
                <option value="2K QHD">2K QHD (Alta Definición)</option>
                <option value="4K UHD">4K Ultra HD</option>
              </select>
            </div>
          </div>

          {/* Fila 4: Datos del Propietario */}
          <div style={{
            background: 'rgba(15, 23, 42, 0.6)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '10px',
            padding: '1rem'
          }}>
            <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#38bdf8', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Datos del Propietario / Responsable del Feed
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.85rem' }}>
              <div>
                <label style={{ fontSize: '0.78rem', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>
                  Nombre del Titular
                </label>
                <input
                  type="text"
                  className="form-control"
                  style={{ fontSize: '0.85rem', padding: '0.45rem 0.75rem' }}
                  value={propietarioNombre}
                  onChange={(e) => setPropietarioNombre(e.target.value)}
                  placeholder="Tu nombre"
                  disabled={loading}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.78rem', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>
                  Teléfono de Contacto
                </label>
                <input
                  type="text"
                  className="form-control"
                  style={{ fontSize: '0.85rem', padding: '0.45rem 0.75rem' }}
                  value={propietarioTelefono}
                  onChange={(e) => setPropietarioTelefono(e.target.value)}
                  placeholder="7000-0000"
                  disabled={loading}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.78rem', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>
                  DUI del Propietario
                </label>
                <input
                  type="text"
                  className="form-control"
                  style={{ fontSize: '0.85rem', padding: '0.45rem 0.75rem' }}
                  value={propietarioDui}
                  onChange={(e) => setPropietarioDui(e.target.value)}
                  placeholder="00000000-0"
                  disabled={loading}
                />
              </div>
            </div>
          </div>

          {/* Campo de Visión / Notas */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ fontWeight: 600, fontSize: '0.85rem' }}>
              Descripción del Ángulo o Campo de Visión
            </label>
            <textarea
              className="form-control"
              rows={2}
              placeholder="Ej. Enfoca la acera peatonal hacia el poniente, entrada a pasaje y área de estacionamiento exterior..."
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              disabled={loading}
            />
          </div>

          {/* Consentimiento Legal */}
          <div style={{
            background: 'rgba(16, 185, 129, 0.06)',
            border: '1px solid rgba(16, 185, 129, 0.25)',
            borderRadius: '10px',
            padding: '0.9rem',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '0.75rem'
          }}>
            <input
              type="checkbox"
              id="consentimiento_camara"
              checked={consentimiento}
              onChange={(e) => setConsentimiento(e.target.checked)}
              style={{ width: '18px', height: '18px', marginTop: '2px', accentColor: '#10b981', cursor: 'pointer' }}
              disabled={loading}
            />
            <label htmlFor="consentimiento_camara" style={{ fontSize: '0.8rem', color: '#e2e8f0', cursor: 'pointer', lineHeight: 1.45 }}>
              <strong>Declaración y Consentimiento de Colaboración Ciudadana:</strong> Autorizo de manera voluntaria a los moderadores del <strong>Sistema LocalizaSV</strong> y a las autoridades competentes a monitorear este feed exclusivamente para misiones humanitarias de búsqueda de personas y prevención de emergencias de seguridad.
            </label>
          </div>

          {/* Footer Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem', borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '1rem' }}>
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary"
              style={{ fontSize: '0.88rem', padding: '0.55rem 1.25rem' }}
              disabled={loading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              style={{
                fontSize: '0.88rem',
                padding: '0.55rem 1.5rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                background: 'linear-gradient(135deg, #0284c7, #0369a1)'
              }}
              disabled={loading || !consentimiento}
            >
              {loading ? (
                <>
                  <div style={{ border: '2px solid rgba(255,255,255,0.3)', borderTop: '2px solid #fff', borderRadius: '50%', width: '16px', height: '16px', animation: 'spin 0.8s linear infinite' }} />
                  <span>Conectando e Integrando...</span>
                </>
              ) : (
                <>
                  <Shield size={16} />
                  <span>Integrar Cámara a la Red</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RegisterCommunityCameraModal;
