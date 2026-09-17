import React, { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';

const Register = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [form, setForm] = useState({
    nombre: '',
    dui: '',
    email: '',
    telefono: '',
    password: ''
  });
  
  const [selfie, setSelfie] = useState(null);
  const [selfiePreview, setSelfiePreview] = useState('');
  const [rol, setRol] = useState('ciudadano');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Masks and validation inputs
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setError('');

    if (name === 'dui') {
      // Auto-format DUI: XXXXXXXX-X
      let clean = value.replace(/\D/g, '').slice(0, 9);
      if (clean.length > 8) {
        clean = clean.slice(0, 8) + '-' + clean.slice(8);
      }
      setForm({ ...form, [name]: clean });
    } else if (name === 'telefono') {
      // Auto-format Phone: XXXX-XXXX
      let clean = value.replace(/\D/g, '').slice(0, 8);
      if (clean.length > 4) {
        clean = clean.slice(0, 4) + '-' + clean.slice(4);
      }
      setForm({ ...form, [name]: clean });
    } else {
      setForm({ ...form, [name]: value });
    }
  };

  const handleFileChange = (e) => {
    setError('');
    const file = e.target.files[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setError('El archivo debe ser una imagen.');
        return;
      }
      setSelfie(file);
      setSelfiePreview(URL.createObjectURL(file));
    }
  };

  const handleUploaderClick = () => {
    fileInputRef.current.click();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const { nombre, dui, email, telefono, password } = form;

    if (!nombre || !dui || !email || !telefono || !password || !selfie) {
      setError('Por favor, complete todos los campos y suba su selfie.');
      return;
    }

    // DUI Regex: 8 digits, hyphen, 1 digit
    const DUI_REGEX = /^\d{8}-\d$/;
    if (!DUI_REGEX.test(dui)) {
      setError('El formato del DUI debe ser XXXXXXXX-X.');
      return;
    }

    // Phone Regex: 8 digits (optionally formatted with a hyphen)
    const PHONE_REGEX = /^[2678]\d{3}-?\d{4}$/;
    if (!PHONE_REGEX.test(telefono)) {
      setError('El teléfono debe ser un número salvadoreño válido de 8 dígitos.');
      return;
    }

    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('nombre', nombre);
      formData.append('dui', dui);
      formData.append('email', email);
      formData.append('telefono', telefono);
      formData.append('password', password);
      formData.append('rol', rol);
      formData.append('selfie', selfie);

      await api.post('/auth/register', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      // Navigate to login on success
      navigate('/login');
    } catch (err) {
      setError(err.response?.data?.error || 'Error al registrar el usuario. Por favor intente de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-wrapper glass-panel animate-fade-in" style={{ maxWidth: '550px' }}>
      <div className="auth-header">
        <h2>Crear Cuenta</h2>
        <p>Regístrese para reportar casos de personas desaparecidas</p>
      </div>

      {error && <div className="auth-error">{error}</div>}

      <form onSubmit={handleSubmit}>
        <div className="form-group" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <label className="form-label text-center">Selfie de Verificación</label>
          <div className="image-uploader-container w-100" onClick={handleUploaderClick}>
            {selfiePreview ? (
              <img src={selfiePreview} alt="Selfie preview" className="uploader-preview" />
            ) : (
              <>
                <div className="uploader-icon">📷</div>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  Haz clic para subir tu selfie
                </p>
              </>
            )}
            <input
              type="file"
              accept="image/*"
              ref={fileInputRef}
              onChange={handleFileChange}
              style={{ display: 'none' }}
              disabled={loading}
            />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="nombre">Nombre Completo</label>
          <input
            id="nombre"
            name="nombre"
            type="text"
            className="form-control"
            placeholder="Ej. Juan Pérez"
            value={form.nombre}
            onChange={handleInputChange}
            disabled={loading}
          />
        </div>

        <div className="meta-grid">
          <div className="form-group">
            <label className="form-label" htmlFor="dui">DUI</label>
            <input
              id="dui"
              name="dui"
              type="text"
              className="form-control"
              placeholder="00000000-0"
              value={form.dui}
              onChange={handleInputChange}
              disabled={loading}
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="telefono">Teléfono</label>
            <input
              id="telefono"
              name="telefono"
              type="text"
              className="form-control"
              placeholder="7000-0000"
              value={form.telefono}
              onChange={handleInputChange}
              disabled={loading}
            />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="email">Correo Electrónico</label>
          <input
            id="email"
            name="email"
            type="email"
            className="form-control"
            placeholder="correo@dominio.com"
            value={form.email}
            onChange={handleInputChange}
            disabled={loading}
          />
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="password">Contraseña</label>
          <input
            id="password"
            name="password"
            type="password"
            className="form-control"
            placeholder="Mínimo 8 caracteres"
            value={form.password}
            onChange={handleInputChange}
            disabled={loading}
          />
        </div>

        <div className="form-group" style={{ marginBottom: '1.5rem' }}>
          <label className="form-label" style={{ marginBottom: '0.5rem', display: 'block' }}>
            Selecciona tu Rol en la Plataforma
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.75rem' }}>
            {/* Opción 1: Ciudadano */}
            <div
              onClick={() => setRol('ciudadano')}
              style={{
                padding: '0.85rem 1rem',
                borderRadius: '10px',
                border: rol === 'ciudadano' ? '2px solid #10b981' : '1px solid rgba(255,255,255,0.1)',
                backgroundColor: rol === 'ciudadano' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(255,255,255,0.03)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.85rem',
                transition: 'all 0.2s ease'
              }}
            >
              <span style={{ fontSize: '1.6rem' }}>👤</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: '700', fontSize: '0.95rem', color: rol === 'ciudadano' ? '#10b981' : 'var(--text-primary)' }}>
                  Ciudadano / Familiar
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  Reportar personas desaparecidas y colaborar en búsquedas comunitarias.
                </div>
              </div>
              <div 
                style={{
                  width: '18px',
                  height: '18px',
                  borderRadius: '50%',
                  border: `2px solid ${rol === 'ciudadano' ? '#10b981' : 'rgba(255,255,255,0.3)'}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                {rol === 'ciudadano' && (
                  <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#10b981' }} />
                )}
              </div>
            </div>

            {/* Opción 2: Moderador */}
            <div
              onClick={() => setRol('moderador')}
              style={{
                padding: '0.85rem 1rem',
                borderRadius: '10px',
                border: rol === 'moderador' ? '2px solid #8b5cf6' : '1px solid rgba(255,255,255,0.1)',
                backgroundColor: rol === 'moderador' ? 'rgba(139, 92, 246, 0.12)' : 'rgba(255,255,255,0.03)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.85rem',
                transition: 'all 0.2s ease'
              }}
            >
              <span style={{ fontSize: '1.6rem' }}>👨‍✈️</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: '700', fontSize: '0.95rem', color: rol === 'moderador' ? '#8b5cf6' : 'var(--text-primary)' }}>
                  Moderador de Alertas
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  Validar detecciones de cámaras y descartar falsos positivos.
                </div>
              </div>
              <div 
                style={{
                  width: '18px',
                  height: '18px',
                  borderRadius: '50%',
                  border: `2px solid ${rol === 'moderador' ? '#8b5cf6' : 'rgba(255,255,255,0.3)'}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                {rol === 'moderador' && (
                  <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#8b5cf6' }} />
                )}
              </div>
            </div>

            {/* Opción 3: Autoridad */}
            <div
              onClick={() => setRol('autoridad')}
              style={{
                padding: '0.85rem 1rem',
                borderRadius: '10px',
                border: rol === 'autoridad' ? '2px solid #0ea5e9' : '1px solid rgba(255,255,255,0.1)',
                backgroundColor: rol === 'autoridad' ? 'rgba(14, 165, 233, 0.12)' : 'rgba(255,255,255,0.03)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.85rem',
                transition: 'all 0.2s ease'
              }}
            >
              <span style={{ fontSize: '1.6rem' }}>👮</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: '700', fontSize: '0.95rem', color: rol === 'autoridad' ? '#0ea5e9' : 'var(--text-primary)' }}>
                  Autoridad (PNC / Fiscalía)
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  Monitoreo táctico georreferenciado, mapas de calor, clusters y estadísticas.
                </div>
              </div>
              <div 
                style={{
                  width: '18px',
                  height: '18px',
                  borderRadius: '50%',
                  border: `2px solid ${rol === 'autoridad' ? '#0ea5e9' : 'rgba(255,255,255,0.3)'}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                {rol === 'autoridad' && (
                  <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#0ea5e9' }} />
                )}
              </div>
            </div>
          </div>
        </div>

        <button type="submit" className="btn btn-primary w-100 mt-4" disabled={loading}>
          {loading ? 'Procesando registro...' : 'Registrar Cuenta'}
        </button>
      </form>

      <div className="auth-footer">
        ¿Ya tiene una cuenta? <Link to="/login">Inicie sesión aquí</Link>
      </div>
    </div>
  );
};

export default Register;
