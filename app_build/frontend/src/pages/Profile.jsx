import React, { useState, useContext, useEffect } from 'react';
import { AuthContext } from '../App';
import api from '../services/api';
import './Profile.css';

const Profile = () => {
  const { user, setUser } = useContext(AuthContext);
  const [nombre, setNombre] = useState('');
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (user) {
      setNombre(user.nombre || '');
      setPreview(user.selfie_url ? `http://localhost:3001${user.selfie_url}` : null);
    }
  }, [user]);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      setPreview(URL.createObjectURL(selectedFile));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    setError('');

    try {
      const formData = new FormData();
      formData.append('nombre', nombre);
      if (file) {
        formData.append('selfie', file);
      }

      const response = await api.put('/auth/profile', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      setMessage(response.data.message);
      setUser(response.data.usuario);
      
      // Update local storage user data if needed or just rely on context
      // Depending on app logic, user context is enough
    } catch (err) {
      if (err.response && err.response.data && err.response.data.error) {
        setError(err.response.data.error);
      } else {
        setError('Error al actualizar el perfil.');
      }
    } finally {
      setLoading(false);
    }
  };

  const qrDigitalId = user 
    ? `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(`ID:${user.id}|DUI:${user.dui}|ROL:${user.rol}|NAME:${user.nombre}`)}`
    : '';

  return (
    <div className="profile-container animate-fade-in" style={{ maxWidth: '820px', margin: '0 auto' }}>
      
      {/* Holographic Tactical Digital ID Card */}
      {user && (
        <div 
          className="hud-panel corner-hud"
          style={{
            marginBottom: '2rem',
            padding: '1.75rem',
            background: 'linear-gradient(135deg, rgba(6, 13, 29, 0.95), rgba(15, 23, 42, 0.9))',
            border: '1px solid rgba(0, 240, 255, 0.4)',
            boxShadow: '0 0 35px rgba(0, 240, 255, 0.15)',
            borderRadius: '16px',
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          {/* Watermark badge */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: '1px solid rgba(0, 240, 255, 0.25)',
            paddingBottom: '0.75rem',
            marginBottom: '1.25rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <span className="cyber-beacon" />
              <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#00f0ff', letterSpacing: '1.5px' }}>
                CREDENCIAL TÁCTICA DIGITAL • REPÚBLICA DE EL SALVADOR
              </span>
            </div>
            <span className="cyber-badge-cyan">
              {user.rol === 'moderador' ? 'CLEARANCE LEVEL 2' : user.rol === 'autoridad' ? 'CLEARANCE LEVEL 3' : 'CLEARANCE LEVEL 1'}
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr 120px', gap: '1.5rem', alignItems: 'center' }}>
            {/* Holographic Photo */}
            <div style={{ position: 'relative' }}>
              <div style={{
                width: '130px',
                height: '145px',
                borderRadius: '12px',
                overflow: 'hidden',
                border: '2px solid #00f0ff',
                boxShadow: '0 0 20px rgba(0, 240, 255, 0.25)',
                background: '#0f172a'
              }}>
                <img
                  src={preview || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=300&q=80'}
                  alt="Profile"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              </div>
              <div style={{
                position: 'absolute',
                bottom: '4px',
                left: '4px',
                right: '4px',
                background: 'rgba(6, 13, 29, 0.85)',
                color: '#00f0ff',
                fontSize: '0.6rem',
                textAlign: 'center',
                padding: '0.15rem',
                borderRadius: '4px',
                fontWeight: 700
              }}>
                ROSTRO VERIFICADO
              </div>
            </div>

            {/* Credential Data */}
            <div>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                TITULAR ACREDITADO:
              </div>
              <h2 style={{ fontSize: '1.6rem', fontWeight: 900, color: '#fff', margin: '0.2rem 0' }}>
                {user.nombre}
              </h2>
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.35rem', flexWrap: 'wrap' }}>
                <span className={`role-chip role-chip-${user.rol || 'ciudadano'}`}>
                  {user.rol === 'moderador' ? '👨‍✈️ Operador de Monitoreo' : user.rol === 'autoridad' ? '👮 Autoridad Policial' : '👤 Rescatista Civil'}
                </span>
                <span style={{
                  background: 'rgba(16, 185, 129, 0.15)',
                  border: '1px solid #10b981',
                  color: '#10b981',
                  fontSize: '0.75rem',
                  padding: '0.2rem 0.5rem',
                  borderRadius: '4px',
                  fontWeight: 700
                }}>
                  DUI: {user.dui}
                </span>
              </div>
              <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '0.5rem' }}>
                📧 {user.email} • ID Interno: #{user.id}
              </div>
            </div>

            {/* QR Validation Code */}
            <div style={{ textAlign: 'center' }}>
              <div style={{
                background: '#fff',
                padding: '4px',
                borderRadius: '8px',
                display: 'inline-block',
                boxShadow: '0 4px 15px rgba(0, 240, 255, 0.2)'
              }}>
                <img
                  src={qrDigitalId}
                  alt="QR"
                  style={{ width: '100px', height: '100px', display: 'block' }}
                />
              </div>
              <div style={{ fontSize: '0.65rem', color: '#00f0ff', marginTop: '0.25rem', fontWeight: 700 }}>
                TOKEN SEGURO
              </div>
            </div>
          </div>

          {/* Quick Metrics */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr',
            gap: '1rem',
            marginTop: '1.25rem',
            paddingTop: '1rem',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            fontSize: '0.75rem',
            textAlign: 'center'
          }}>
            <div>
              <span style={{ color: '#94a3b8' }}>Protocolo Cifrado:</span>
              <div style={{ color: '#00f0ff', fontWeight: 700 }}>TLS 1.3 / AES-256</div>
            </div>
            <div>
              <span style={{ color: '#94a3b8' }}>Dispositivo:</span>
              <div style={{ color: '#10b981', fontWeight: 700 }}>AUTENTICADO ONLINE</div>
            </div>
            <div>
              <span style={{ color: '#94a3b8' }}>Red Nacional:</span>
              <div style={{ color: '#f59e0b', fontWeight: 700 }}>NODO LOCALIZASV SV</div>
            </div>
          </div>
        </div>
      )}

      {/* Profile Edit Card */}
      <div className="profile-card hud-panel corner-hud" style={{ background: 'rgba(6, 13, 29, 0.95)' }}>
        <h2 style={{ color: '#00f0ff', margin: '0 0 1rem 0' }}>Actualizar Datos de Cuenta</h2>
        
        {message && <div className="success-message">{message}</div>}
        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="nombre">Nombre Completo</label>
            <input 
              type="text" 
              id="nombre"
              value={nombre} 
              onChange={(e) => setNombre(e.target.value)} 
              required
              className="profile-input"
            />
          </div>

          <div className="form-group file-group">
            <label htmlFor="selfie">Actualizar Fotografía de Credencial</label>
            {preview && (
              <div className="image-preview" style={{ marginBottom: '0.75rem' }}>
                <img src={preview} alt="Profile Preview" style={{ width: '90px', height: '90px', borderRadius: '10px', objectFit: 'cover', border: '1px solid #00f0ff' }} />
              </div>
            )}
            <input 
              type="file" 
              id="selfie"
              accept="image/*"
              onChange={handleFileChange} 
              className="profile-file-input"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn"
            style={{
              background: 'linear-gradient(135deg, #00f0ff, #0284c7)',
              color: '#030712',
              fontWeight: 800,
              padding: '0.65rem 1.25rem',
              borderRadius: '8px',
              border: 'none',
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
          >
            {loading ? 'Guardando...' : '💾 Guardar Cambios en la Red'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Profile;
